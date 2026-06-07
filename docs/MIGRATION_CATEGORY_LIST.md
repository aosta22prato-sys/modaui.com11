# MODAUI Absorption Category List (Stocky -> Native)

This document categorizes Stocky's legacy assets into three buckets for the transition to a unified MODAUI ERP/POS system.

## 1. Direct Migration (MODAUI Native Data)
*These assets can be migrated with minimal logic changes, mainly table structure alignment.*

| Asset | Source (Stocky) | Target (MODAUI) | Notes |
| :--- | :--- | :--- | :--- |
| **Brands** | `brands` table | `brands` table | Simple metadata. |
| **Categories** | `categories` table | `categories` table | Simple hierarchy. |
| **Units** | `units` table | `units` table | Conversion factors are stable. |
| **Customer Profiles** | `clients` table | `users` (Role: Customer) | Migrate contact/tax info. |
| **Supplier Profiles** | `providers` table | `merchants` (Linked as Suppliers) | Migrate contact/tax info. |
| **Warehouse Metadata** | `warehouses` table | `warehouses` table | Physical locations. |

## 2. Refactor (MODAUI Kernel Alignment)
*These assets require significant logic transformation to fit the Event Sourcing / AI-First architecture.*

| Asset | Source (Stocky) | MODAUI Transformation | AI Integration Point |
| :--- | :--- | :--- | :--- |
| **POS Checkout** | `PosController@CreatePOS` | `POST /api/sales` -> Emits `InventoryMovement` & `BusinessTransaction` | `AI Sales Agent` (Real-time cross-sell) |
| **Purchase Flow** | `PurchasesController@store` | `POST /api/purchases` -> Emits `InventoryMovement` & `BusinessTransaction` | `AI Purchase Manager` (Auto-reorder) |
| **Inventory Adjust** | `AdjustmentController` | `POST /api/inventory/adjust` -> Emits `InventoryMovement` | `AI Inventory Auditor` (Shrinkage detection) |
| **Payment Rec** | `PaymentSalesController` | `POST /api/finance/transactions` -> Updates `CompanyAccount` | `AI Comptroller` (Cashflow forecasting) |
| **Batch Tracking** | `BatchService` (PHP) | Native `InventoryRecord` Batch attributes + FEFO Logic | `AI Quality Control` (Expiry alerts) |

## 3. Discard (Obsolete Assets)
*These assets will NOT be migrated and should be deleted in the final phase.*

- **UI Layer**: All `.blade.php` files, `resources/js` (Vue 2), and CSS files in `script/`.
- **Legacy Auth**: Session-based login, CSRF tokens, and `Auth` controllers in Laravel.
- **Legacy Middleware**: `Is_Active`, `TrimStrings`, `XSS`, etc. (Handled by MODAUI Core).
- **Redundant Logic**: `facture` table (replaced by `BusinessTransaction`), `product_warehouse` (replaced by `InventoryRecord`).

## 4. AI Specialist Assignments
| Specialist | Responsibility in Unified MODAUI |
| :--- | :--- |
| **Designer** | Master of `ProductAggregate` & SPU/SKU generation. |
| **Purchase Manager** | Master of `Purchase` events and Supplier relations. |
| **Inventory Manager** | Master of `InventoryMovement` and Warehouse efficiency. |
| **Marketing Manager** | Master of `Customer` engagement and Sales campaigns. |
| **Comptroller** | Master of `BusinessTransaction` and Financial health. |
| **Customer Success** | Master of `POS` support and Client satisfaction. |
