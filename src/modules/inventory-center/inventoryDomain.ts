import { InventoryMovement, InventoryRecord } from '../../types/modaui';

export const computeAvailableQuantity = (record: InventoryRecord): number => {
  const reserved = record.reservedQuantity ?? 0;
  const available = record.quantity - reserved;
  return available < 0 ? 0 : available;
};

export const applyInventoryDelta = (record: InventoryRecord, delta: number): InventoryRecord => {
  const updatedQuantity = record.quantity + delta;
  return {
    ...record,
    quantity: Math.max(0, updatedQuantity),
    availableQuantity: Math.max(0, updatedQuantity - (record.reservedQuantity ?? 0)),
    lastUpdatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const buildInventoryMovement = (params: Omit<InventoryMovement, 'id' | 'createdAt'>): InventoryMovement => ({
  ...params,
  id: `mov-${Math.random().toString(36).slice(2, 10)}`,
  createdAt: new Date().toISOString(),
});

export const isMovementType = (type: string): type is InventoryMovement['type'] => {
  return ['COUNT', 'ADJUSTMENT', 'TRANSFER', 'DAMAGE', 'PURCHASE', 'SALE'].includes(type);
};
