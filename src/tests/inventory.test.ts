/**
 * Inventory Domain Core Tests
 * 
 * P1.2: Movement Idempotency Test
 * P1.3: Purchase → Movement Flow Test
 * P1.4: Movement → Record State Test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModaDB, DBInventoryMovement, DBInventoryRecord, DBPurchase } from '../server/db';

describe('Inventory Domain Tests', () => {
  const merchantId = 'test-merchant-001';

  beforeEach(() => {
    // Reset database state before each test
    // In production, use transaction rollback or in-memory DB
    // For now, we rely on unique IDs to avoid collisions
  });

  // ===== P1.2: Movement Idempotency Test =====
  describe('P1.2: Movement Idempotency', () => {
    it('should return idempotent: true when saving movement with duplicate idempotencyKey', () => {
      const movementPayload = {
        merchantId,
        type: 'PURCHASE',
        variantId: 'var_123',
        quantity: 10,
        toWarehouseId: 'wh_001',
        toLocationId: 'loc_001',
        idempotencyKey: 'PURCHASE:PO-1001',
      };

      // First save
      const result1 = ModaDB.saveInventoryMovement(movementPayload as any);
      expect(result1.success).toBe(true);
      expect(result1.idempotent).toBeUndefined(); // First time is not idempotent

      // Second save with same idempotencyKey
      const result2 = ModaDB.saveInventoryMovement(movementPayload as any);
      expect(result2.success).toBe(true);
      expect(result2.idempotent).toBe(true); // Second time is idempotent
      expect(result2.id).toBe(result1.id); // Same movement ID returned
    });

    it('should create different movements when idempotencyKey differs', () => {
      const payload1 = {
        merchantId,
        type: 'PURCHASE',
        variantId: 'var_123',
        quantity: 10,
        toWarehouseId: 'wh_001',
        idempotencyKey: 'PURCHASE:PO-1001',
      };

      const payload2 = {
        merchantId,
        type: 'PURCHASE',
        variantId: 'var_123',
        quantity: 5,
        toWarehouseId: 'wh_001',
        idempotencyKey: 'PURCHASE:PO-1002',
      };

      const result1 = ModaDB.saveInventoryMovement(payload1 as any);
      const result2 = ModaDB.saveInventoryMovement(payload2 as any);

      expect(result1.id).not.toBe(result2.id); // Different movement IDs
    });

    it('should allow duplicate idempotencyKey for different merchants', () => {
      const merchant1 = 'merchant-001';
      const merchant2 = 'merchant-002';

      const payload1 = {
        merchantId: merchant1,
        type: 'PURCHASE',
        variantId: 'var_123',
        quantity: 10,
        toWarehouseId: 'wh_001',
        idempotencyKey: 'PURCHASE:PO-1001',
      };

      const payload2 = {
        merchantId: merchant2,
        type: 'PURCHASE',
        variantId: 'var_123',
        quantity: 10,
        toWarehouseId: 'wh_001',
        idempotencyKey: 'PURCHASE:PO-1001',
      };

      const result1 = ModaDB.saveInventoryMovement(payload1 as any);
      const result2 = ModaDB.saveInventoryMovement(payload2 as any);

      expect(result1.id).not.toBe(result2.id); // Different movement IDs for different merchants
    });
  });

  // ===== P1.3: Purchase → Movement Flow Test =====
  describe('P1.3: Purchase to Movement Flow', () => {
    it('should create inventory movements when purchase is saved', () => {
      const purchaseId = `po_${Math.random().toString(36).slice(2, 10)}`;
      const purchase = {
        id: purchaseId,
        merchantId,
        purchaseNumber: `PO-${purchaseId}`,
        items: [
          { variantId: 'var_001', quantity: 10, warehouseId: 'wh_001', locationId: 'loc_001' },
          { variantId: 'var_002', quantity: 5, warehouseId: 'wh_001', locationId: 'loc_002' },
        ],
        createdAt: new Date().toISOString(),
      };

      // Save purchase
      ModaDB.savePurchase(purchase as any);

      // Create movements for each line (simulating POST /api/purchases behavior)
      const movementIds: string[] = [];
      const idempotencyKey = `PURCHASE:${purchaseId}`;

      for (let i = 0; i < purchase.items.length; i++) {
        const item = purchase.items[i];
        const mov = {
          merchantId,
          type: 'PURCHASE',
          variantId: item.variantId,
          quantity: item.quantity,
          toWarehouseId: item.warehouseId,
          toLocationId: item.locationId,
          referenceType: 'PURCHASE',
          referenceId: purchaseId,
          // Only first line gets the idempotency key (Order-Level strategy)
          idempotencyKey: i === 0 ? idempotencyKey : null,
          notes: `Auto-created from purchase ${purchaseId} (line ${i + 1})`,
          createdAt: new Date().toISOString(),
        };
        const result = ModaDB.saveInventoryMovement(mov as any);
        movementIds.push(result.id);
      }

      // Verify movements were created
      expect(movementIds.length).toBe(2);
      expect(movementIds[0]).toBeDefined();
      expect(movementIds[1]).toBeDefined();

      // Verify we can retrieve the movements
      const movements = ModaDB.getInventoryMovements(merchantId);
      const purchaseMovements = movements.filter(m => m.referenceId === purchaseId);
      expect(purchaseMovements.length).toBe(2);
      expect(purchaseMovements[0].idempotencyKey).toBe(idempotencyKey);
      expect(purchaseMovements[1].idempotencyKey).toBeNull();
    });

    it('should enforce Order-Level idempotency: duplicate purchase should not create new movements', () => {
      const purchaseId = `po_${Math.random().toString(36).slice(2, 10)}`;
      const idempotencyKey = `PURCHASE:${purchaseId}`;

      const purchase = {
        id: purchaseId,
        merchantId,
        purchaseNumber: `PO-${purchaseId}`,
        items: [{ variantId: 'var_001', quantity: 10, warehouseId: 'wh_001' }],
        createdAt: new Date().toISOString(),
      };

      // First purchase
      ModaDB.savePurchase(purchase as any);
      const mov1 = {
        merchantId,
        type: 'PURCHASE',
        variantId: 'var_001',
        quantity: 10,
        toWarehouseId: 'wh_001',
        referenceType: 'PURCHASE',
        referenceId: purchaseId,
        idempotencyKey,
        createdAt: new Date().toISOString(),
      };
      const result1 = ModaDB.saveInventoryMovement(mov1 as any);

      // Attempt duplicate purchase
      const mov2 = { ...mov1 };
      const result2 = ModaDB.saveInventoryMovement(mov2 as any);

      expect(result2.idempotent).toBe(true);
      expect(result2.id).toBe(result1.id); // Should return same movement ID
    });
  });

  // ===== P1.4: Movement → Record State Test =====
  describe('P1.4: Movement to Record State', () => {
    it('should update inventory record when movement is saved (toWarehouse)', () => {
      const variantId = 'var_test_001';

      // Initial state: no record
      let records = ModaDB.getInventoryRecords(merchantId);
      let record = records.find(r => r.variantId === variantId && r.warehouseId === 'wh_001');
      expect(record?.onHand || 0).toBe(0);

      // Create movement: +10 to warehouse
      const mov1 = {
        merchantId,
        type: 'PURCHASE',
        variantId,
        quantity: 10,
        toWarehouseId: 'wh_001',
        toLocationId: 'loc_001',
        idempotencyKey: `TEST:mov-001`,
      };
      ModaDB.saveInventoryMovement(mov1 as any);

      // Verify record updated
      records = ModaDB.getInventoryRecords(merchantId);
      record = records.find(r => r.variantId === variantId && r.warehouseId === 'wh_001');
      expect(record).toBeDefined();
      expect(record!.onHand).toBe(10);
      expect(record!.available).toBe(10);
    });

    it('should handle outbound movements (fromWarehouse)', () => {
      const variantId = 'var_test_outbound';

      // First, add inventory via inbound
      ModaDB.saveInventoryMovement({
        merchantId,
        type: 'PURCHASE',
        variantId,
        quantity: 20,
        toWarehouseId: 'wh_002',
        idempotencyKey: `TEST:inbound-${Math.random()}`,
      } as any);

      // Then remove via outbound
      const outbound = {
        merchantId,
        type: 'SALE',
        variantId,
        quantity: 5,
        fromWarehouseId: 'wh_002',
        idempotencyKey: `TEST:outbound-${Math.random()}`,
      };
      ModaDB.saveInventoryMovement(outbound as any);

      // Verify record reflects both movements
      const records = ModaDB.getInventoryRecords(merchantId);
      const record = records.find(r => r.variantId === variantId && r.warehouseId === 'wh_002');
      expect(record).toBeDefined();
      expect(record!.onHand).toBe(15); // 20 - 5
      expect(record!.available).toBe(15);
    });

    it('should accumulate movements across multiple transactions', () => {
      const variantId = 'var_test_accumulate';

      // Movement 1: +10
      ModaDB.saveInventoryMovement({
        merchantId,
        type: 'PURCHASE',
        variantId,
        quantity: 10,
        toWarehouseId: 'wh_003',
        idempotencyKey: `TEST:acc-1-${Math.random()}`,
      } as any);

      // Movement 2: +5
      ModaDB.saveInventoryMovement({
        merchantId,
        type: 'PURCHASE',
        variantId,
        quantity: 5,
        toWarehouseId: 'wh_003',
        idempotencyKey: `TEST:acc-2-${Math.random()}`,
      } as any);

      // Movement 3: -7 (sale)
      ModaDB.saveInventoryMovement({
        merchantId,
        type: 'SALE',
        variantId,
        quantity: 7,
        fromWarehouseId: 'wh_003',
        idempotencyKey: `TEST:acc-3-${Math.random()}`,
      } as any);

      // Final state: 10 + 5 - 7 = 8
      const records = ModaDB.getInventoryRecords(merchantId);
      const record = records.find(r => r.variantId === variantId && r.warehouseId === 'wh_003');
      expect(record).toBeDefined();
      expect(record!.onHand).toBe(8);
    });

    it('should maintain separate inventory records per warehouse', () => {
      const variantId = 'var_test_multiwarehouse';

      // Add to warehouse A
      ModaDB.saveInventoryMovement({
        merchantId,
        type: 'PURCHASE',
        variantId,
        quantity: 100,
        toWarehouseId: 'wh_A',
        idempotencyKey: `TEST:wh-a-${Math.random()}`,
      } as any);

      // Add to warehouse B
      ModaDB.saveInventoryMovement({
        merchantId,
        type: 'PURCHASE',
        variantId,
        quantity: 50,
        toWarehouseId: 'wh_B',
        idempotencyKey: `TEST:wh-b-${Math.random()}`,
      } as any);

      // Verify separate records
      const records = ModaDB.getInventoryRecords(merchantId);
      const recordA = records.find(r => r.variantId === variantId && r.warehouseId === 'wh_A');
      const recordB = records.find(r => r.variantId === variantId && r.warehouseId === 'wh_B');

      expect(recordA).toBeDefined();
      expect(recordA!.onHand).toBe(100);
      expect(recordB).toBeDefined();
      expect(recordB!.onHand).toBe(50);
    });
  });
});
