# MODAUI Kernel Single Source of Truth (SSOT) Audit

## 1. The Core Kernel (The Big Four)
The following entities are the ONLY sources of truth for assets in MODAUI:

### Inventory Domain
- **InventoryMovement**: Immutable log of every stock change.
- **InventoryRecord**: Real-time snapshot of stock levels.

### Finance Domain
- **BusinessTransaction**: Immutable log of every monetary flow.
- **CompanyAccount**: Real-time snapshot of financial balances.

## 2. Table Classification & Retirement Plan

| Table Name | Category | Status | Action / Owner |
| :--- | :--- | :--- | :--- |
| `inventory_movements` | CORE | Active | Master |
| `inventory_records` | CORE | Active | Master |
| `business_transactions` | CORE | Active | Master |
| `company_accounts` | CORE | Active | Master |
| `products` | CORE | Active | Master |
| `purchases` | LEGACY | Deprecated | To be deleted after Adapter verified |
| `orders` | LEGACY | Deprecated | To be deleted after Adapter verified |
| `payments` | REDUNDANT | To Delete | Immediate removal (Merged into BusinessTransaction) |
| `customers` | EXTERNAL | Adapter | Read-only via Adapter to Stocky |

## 3. Implementation Rules
1. **No Business Logic Duplication**: Do not implement tax, shipping, or supplier contract logic in MODAUI. These belong to the "Event Producers" (Stocky).
2. **Event-Driven Updates**: `InventoryRecord` and `CompanyAccount` MUST only be updated via their respective Movement/Transaction events.
3. **Idempotency**: All events must carry an `idempotencyKey` derived from the source document (e.g., `PURCHASE:PO-123`).
