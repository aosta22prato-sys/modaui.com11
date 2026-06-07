import { ModaDB } from '../db';
import crypto from 'crypto';

export interface PurchaseItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
  receivedQuantity?: number;
  cost: number;
  unitId: string;
  taxPercent?: number;
  taxAmount?: number;
  discountPercent?: number;
  discountAmount?: number;
}

export interface CreatePurchaseRequest {
  merchantId: string;
  userId: string;
  supplierId: string;
  warehouseId: string;
  items: PurchaseItem[];
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  shipping?: number;
  grandTotal: number;
  paidAmount?: number;
  status: 'received' | 'partial' | 'pending' | 'ordered' | 'returned';
  notes?: string;
}

export class PurchaseService {
  /**
   * 建立采购订单并触发库存与财务流
   */
  static async createPurchase(req: CreatePurchaseRequest) {
    const db = ModaDB.getSqlite();
    const purchaseId = `pur_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // 1. 持久化采购单主表 (State)
    db.prepare(`
      INSERT INTO purchases (id, merchantId, purchaseNumber, items, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      purchaseId,
      req.merchantId,
      `PO-${Date.now()}`,
      JSON.stringify(req.items),
      now
    );

    // 2. 触发库存变动 (Event -> InventoryMovement)
    // 支持部分收货逻辑
    if (req.status === 'received' || req.status === 'partial') {
      for (const item of req.items) {
        const qtyToRecord = req.status === 'received' ? item.quantity : (item.receivedQuantity || 0);
        if (qtyToRecord > 0) {
          ModaDB.saveInventoryMovement({
            merchantId: req.merchantId,
            type: 'PURCHASE',
            variantId: item.variantId || item.productId,
            toWarehouseId: req.warehouseId,
            quantity: qtyToRecord,
            referenceType: 'PURCHASE',
            referenceId: purchaseId,
            idempotencyKey: `PURCHASE_ITEM:${purchaseId}:${item.productId}:${item.variantId || ''}`,
            notes: `Purchase from supplier ${req.supplierId} (${req.status})`,
            createdAt: now
          });
        }
      }
    }

    // 3. 触发财务交易 (Event -> BusinessTransaction)
    // 采购支出，记录税务和运费细节
    if (req.grandTotal > 0) {
      const transactionId = `txn_${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(`
        INSERT INTO business_transactions (id, merchantId, userId, type, amount, currency, status, description, referenceId, createdAt, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        transactionId,
        req.merchantId,
        req.userId,
        'EXPENSE',
        req.grandTotal,
        'USD',
        'completed',
        `Purchase Payment: ${purchaseId}`,
        purchaseId,
        now,
        JSON.stringify({
          taxAmount: req.taxAmount || 0,
          discountAmount: req.discountAmount || 0,
          shipping: req.shipping || 0,
          supplierId: req.supplierId
        })
      );

      // 4. 投影更新账户余额
      const account = db.prepare('SELECT id, balance FROM company_accounts WHERE merchantId = ? LIMIT 1').get(req.merchantId);
      if (account) {
        const newBalance = (account.balance || 0) - req.grandTotal;
        db.prepare('UPDATE company_accounts SET balance = ? WHERE id = ?').run(newBalance, account.id);
      }
    }

    return { success: true, purchaseId };
  }

  /**
   * 采购退货处理
   */
  static async returnPurchase(merchantId: string, userId: string, purchaseId: string, reason: string) {
    const db = ModaDB.getSqlite();
    const now = new Date().toISOString();

    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ? AND merchantId = ? LIMIT 1').get(purchaseId, merchantId);
    if (!purchase) throw new Error('Purchase not found');

    const items = JSON.parse(purchase.items || '[]');

    // 1. 库存回扣 (PURCHASE_RETURN)
    for (const item of items) {
      ModaDB.saveInventoryMovement({
        merchantId,
        type: 'PURCHASE_RETURN',
        variantId: item.variantId || item.productId,
        fromWarehouseId: 'default_warehouse',
        quantity: item.quantity,
        referenceType: 'PURCHASE_RETURN',
        referenceId: purchaseId,
        notes: `Return to supplier: ${reason}`,
        createdAt: now
      });
    }

    // 2. 财务退款 (INCOME from Supplier)
    const transactionId = `txn_ret_${crypto.randomUUID().slice(0, 8)}`;
    // 假设全额退款
    const totalCost = items.reduce((sum: number, i: any) => sum + (i.cost * i.quantity), 0);
    
    db.prepare(`
      INSERT INTO business_transactions (id, merchantId, userId, type, amount, currency, status, description, referenceId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transactionId,
      merchantId,
      userId,
      'INCOME', // 退货退款对公司是收入
      totalCost,
      'USD',
      'completed',
      `Supplier Refund for ${purchaseId}`,
      purchaseId,
      now
    );

    // 3. 投影更新余额
    const account = db.prepare('SELECT id, balance FROM company_accounts WHERE merchantId = ? LIMIT 1').get(merchantId);
    if (account) {
      const newBalance = (account.balance || 0) + totalCost;
      db.prepare('UPDATE company_accounts SET balance = ? WHERE id = ?').run(newBalance, account.id);
    }

    return { success: true, returnId: transactionId };
  }

  static async getPurchases(merchantId: string) {
    const db = ModaDB.getSqlite();
    return db.prepare('SELECT * FROM purchases WHERE merchantId = ? ORDER BY createdAt DESC').all(merchantId);
  }
}
