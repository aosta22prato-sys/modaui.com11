
import { ModaDB } from '../src/server/db';

async function runTest() {
  console.log('--- Starting Inventory Kernel Verification ---');
  
  await ModaDB.init();
  
  const merchantId = 'test_merchant_123';
  const storeId = 'test_store_123';
  const productId = 'test_prod_123';
  const variantId = 'test_var_123';
  const warehouseId = 'wh_001';

  // 1. Setup Mock Data
  console.log('\n[1] Setting up mock data...');
  ModaDB.saveUser({
    id: 'test_user',
    username: 'testadmin',
    email: 'test@admin.com',
    passwordHash: 'hash',
    role: 'Platform Admin',
    verified: true,
    createdAt: new Date().toISOString()
  });

  ModaDB.saveProduct({
    id: productId,
    storeId: storeId,
    name: 'Test Product',
    category: 'Test',
    price: 100,
    inventory: 0,
    variant: {},
    images: [],
    createdAt: new Date().toISOString()
  });

  ModaDB.saveProductVariant({
    id: variantId,
    productId: productId,
    sku: 'TEST-SKU-001',
    attributes: '{}',
    price: 100,
    inventory: 0,
    isActive: 1,
    createdAt: new Date().toISOString()
  });

  // 2. Test Movement -> InventoryRecord
  console.log('\n[2] Testing Movement -> InventoryRecord...');
  const initialRecords = ModaDB.getInventoryRecords(merchantId);
  const initialQty = initialRecords.find(r => r.variantId === variantId)?.onHand || 0;
  console.log(`Initial Qty: ${initialQty}`);

  const movementResult = ModaDB.saveInventoryMovement({
    merchantId,
    type: 'ADJUSTMENT',
    variantId: variantId,
    toWarehouseId: warehouseId,
    quantity: 50,
    notes: 'Initial stock'
  });
  console.log(`Movement created: ${movementResult.id}`);

  const afterRecords = ModaDB.getInventoryRecords(merchantId);
  const afterQty = afterRecords.find(r => r.variantId === variantId)?.onHand || 0;
  console.log(`After Qty: ${afterQty}`);

  if (afterQty === initialQty + 50) {
    console.log('✅ PASS: InventoryRecord updated correctly.');
  } else {
    console.log('❌ FAIL: InventoryRecord not updated correctly.');
  }

  // 3. Test Purchase -> Movement
  console.log('\n[3] Testing Purchase -> Movement...');
  const purchaseId = 'po_test_001';
  ModaDB.savePurchase({
    id: purchaseId,
    merchantId,
    purchaseNumber: 'PO-TEST-001',
    items: [{
      variantId: variantId,
      quantity: 30,
      warehouseId: warehouseId
    }],
    createdAt: new Date().toISOString()
  });
  
  // We need to simulate the logic in server.ts for purchase -> movement
  // Since savePurchase doesn't do it automatically in db.ts (it's in server.ts)
  // Let's verify if server.ts logic works by checking if we can replicate it
  
  const movForPurchase = {
    merchantId,
    type: 'PURCHASE',
    variantId: variantId,
    toWarehouseId: warehouseId,
    quantity: 30,
    referenceType: 'PURCHASE',
    referenceId: purchaseId,
    idempotencyKey: `PURCHASE:${purchaseId}`,
    notes: 'Auto-created from purchase'
  };
  ModaDB.saveInventoryMovement(movForPurchase as any);

  const afterPurchaseRecords = ModaDB.getInventoryRecords(merchantId);
  const finalQty = afterPurchaseRecords.find(r => r.variantId === variantId)?.onHand || 0;
  console.log(`Final Qty after purchase: ${finalQty}`);

  if (finalQty === afterQty + 30) {
    console.log('✅ PASS: Purchase movement applied.');
  } else {
    console.log('❌ FAIL: Purchase movement failed.');
  }

  // 4. Test Idempotency
  console.log('\n[4] Testing Idempotency...');
  const doubleMovement = ModaDB.saveInventoryMovement({
    merchantId,
    type: 'PURCHASE',
    variantId: variantId,
    toWarehouseId: warehouseId,
    quantity: 30,
    referenceType: 'PURCHASE',
    referenceId: purchaseId,
    idempotencyKey: `PURCHASE:${purchaseId}`,
    notes: 'Duplicate attempt'
  });

  if (doubleMovement.idempotent) {
    console.log('✅ PASS: Idempotency detected.');
  } else {
    console.log('❌ FAIL: Idempotency failed.');
  }

  const finalCheckQty = ModaDB.getInventoryRecords(merchantId).find(r => r.variantId === variantId)?.onHand || 0;
  if (finalCheckQty === finalQty) {
    console.log('✅ PASS: Qty remained same after duplicate submission.');
  } else {
    console.log('❌ FAIL: Qty changed after duplicate submission!');
  }

  console.log('\n--- Verification Finished ---');
}

runTest().catch(console.error);
