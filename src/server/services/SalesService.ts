import { ModaDB } from '../db';
import crypto from 'crypto';

export interface SaleItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
  price: number;
  unitId: string;
  taxPercent?: number;
  taxAmount?: number;
  discountPercent?: number;
  discountAmount?: number;
}

export interface CreateSaleRequest {
  merchantId: string;
  userId: string;
  clientId: string;
  warehouseId: string;
  items: SaleItem[];
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  shipping?: number;
  grandTotal: number;
  paidAmount?: number;
  paymentMethod?: string;
  status: 'completed' | 'pending' | 'ordered' | 'refunded';
  saleUuid?: string; // For idempotency
  notes?: string;
}

export class SalesService {
  /**
   * 建立销售订单/POS结账并触发库存与财务流
   */
  static async createSale(req: CreateSaleRequest) {
    const db = ModaDB.getSqlite();
    const now = new Date().toISOString();

    // 1. 幂等性检查
    if (req.saleUuid) {
      const existing = db.prepare('SELECT id FROM orders WHERE merchantId = ? AND id = ? LIMIT 1').get(req.merchantId, req.saleUuid);
      if (existing) return { success: true, saleId: existing.id, idempotent: true };
    }

    const saleId = req.saleUuid || `sale_${crypto.randomUUID().slice(0, 8)}`;

    // 2. 计算与持久化销售单 (State)
    // 增加财务细节记录
    db.prepare(`
      INSERT INTO orders (id, merchantId, userId, storeId, items, totalPrice, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      saleId,
      req.merchantId,
      req.userId,
      'default_store',
      JSON.stringify(req.items),
      req.grandTotal,
      req.status,
      now
    );

    // 3. 触发库存变动 (Event -> InventoryMovement)
    if (req.status === 'completed') {
      for (const item of req.items) {
        ModaDB.saveInventoryMovement({
          merchantId: req.merchantId,
          type: 'SALE',
          variantId: item.variantId || item.productId,
          fromWarehouseId: req.warehouseId,
          quantity: item.quantity,
          referenceType: 'SALE',
          referenceId: saleId,
          idempotencyKey: `SALE_ITEM:${saleId}:${item.productId}:${item.variantId || ''}`,
          notes: `Sale to customer ${req.clientId}`,
          createdAt: now
        });
      }
    }

    // 4. 触发财务交易 (Event -> BusinessTransaction)
    if (req.grandTotal > 0) {
      const transactionId = `txn_${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(`
        INSERT INTO business_transactions (id, merchantId, userId, type, amount, currency, status, description, referenceId, createdAt, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        transactionId,
        req.merchantId,
        req.userId,
        'INCOME',
        req.grandTotal,
        'USD',
        'completed',
        `POS Sale: ${saleId}`,
        saleId,
        now,
        JSON.stringify({
          taxAmount: req.taxAmount || 0,
          discountAmount: req.discountAmount || 0,
          shipping: req.shipping || 0,
          paymentMethod: req.paymentMethod || 'cash'
        })
      );

      // 5. 投影更新账户余额
      const account = db.prepare('SELECT id, balance FROM company_accounts WHERE merchantId = ? LIMIT 1').get(req.merchantId);
      if (account) {
        const newBalance = (account.balance || 0) + req.grandTotal;
        db.prepare('UPDATE company_accounts SET balance = ? WHERE id = ?').run(newBalance, account.id);
      }
      
      // 6. 会员积分联动 (If Customer)
      if (req.clientId && req.clientId !== 'walk-in-customer') {
        const user = db.prepare('SELECT id, customerData FROM users WHERE id = ? LIMIT 1').get(req.clientId);
        if (user) {
          const customerData = JSON.parse(user.customerData || '{"points":0}');
          customerData.points = (customerData.points || 0) + Math.floor(req.grandTotal);
          db.prepare('UPDATE users SET customerData = ? WHERE id = ?').run(JSON.stringify(customerData), user.id);
        }
      }
    }

    return { success: true, saleId };
  }

  /**
   * 销售退款处理
   * 触发库存回滚与财务退款
   */
  static async refundSale(merchantId: string, userId: string, saleId: string, reason: string) {
    const db = ModaDB.getSqlite();
    const now = new Date().toISOString();
    
    const sale = db.prepare('SELECT * FROM orders WHERE id = ? AND merchantId = ? LIMIT 1').get(saleId, merchantId);
    if (!sale) throw new Error('Sale not found');
    if (sale.status === 'refunded') throw new Error('Already refunded');

    const items = JSON.parse(sale.items || '[]');
    
    // 1. 库存回滚 (RETURN)
    for (const item of items) {
      ModaDB.saveInventoryMovement({
        merchantId,
        type: 'RETURN',
        variantId: item.variantId || item.productId,
        toWarehouseId: 'default_warehouse', // 假设退回默认仓
        quantity: item.quantity,
        referenceType: 'REFUND',
        referenceId: saleId,
        notes: `Refund: ${reason}`,
        createdAt: now
      });
    }

    // 2. 财务退款 (REFUND Transaction)
    const transactionId = `txn_ref_${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO business_transactions (id, merchantId, userId, type, amount, currency, status, description, referenceId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transactionId,
      merchantId,
      userId,
      'REFUND',
      sale.totalPrice,
      'USD',
      'completed',
      `Refund for sale ${saleId}: ${reason}`,
      saleId,
      now
    );

    // 3. 投影更新账户余额
    const account = db.prepare('SELECT id, balance FROM company_accounts WHERE merchantId = ? LIMIT 1').get(merchantId);
    if (account) {
      const newBalance = (account.balance || 0) - sale.totalPrice;
      db.prepare('UPDATE company_accounts SET balance = ? WHERE id = ?').run(newBalance, account.id);
    }

    // 4. 更新订单状态
    db.prepare('UPDATE orders SET status = "refunded" WHERE id = ?').run(saleId);

    return { success: true, refundId: transactionId };
  }
}
