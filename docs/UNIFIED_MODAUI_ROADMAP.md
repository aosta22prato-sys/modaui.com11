# MODAUI Unified System Evolution Roadmap

This roadmap defines the transition from a dual-system (MODAUI + Stocky) to a single, unified MODAUI ERP/POS platform.

## Phase 1: Foundation (Current - Completed)
- **Goal**: Establish MODAUI Core and the "Big Four" Kernel models.
- **Key Deliverables**: 
  - `InventoryMovement` (Event) & `InventoryRecord` (State).
  - `BusinessTransaction` (Event) & `CompanyAccount` (State).
  - `ProductAggregate` as the Master SSOT.
- **Status**: ✅

## Phase 2: Absorption & Parity (Next 4-6 Weeks)
- **Goal**: Replicate Stocky's business capabilities inside MODAUI using native Kernel logic.
- **Key Steps**:
  1. **Native POS Implementation**: Build a React-based POS that uses MODAUI's `/api/sales` and emits native events.
  2. **Native Purchase Workflow**: Build a MODAUI-native Purchase interface that replaces `script/app/Http/Controllers/PurchasesController.php`.
  3. **Data Ingestion (The Final Sync)**: Run a final pass of the Adapters to move all historical Stocky data into MODAUI native tables.
  4. **Parallel Running**: Use MODAUI for all new operations while keeping Stocky as a read-only archive.

## Phase 3: The "Cut-Off" (Final Phase)
- **Goal**: Decommission Stocky and its infrastructure.
- **Key Steps**:
  1. **Disable Stocky Write Access**: Mark all legacy APIs as 410 Gone or redirect to MODAUI.
  2. **Delete `script/` Directory**: Remove the entire Laravel-based Stocky codebase.
  3. **Frontend Unification**: Remove all "Legacy" or "Adapter" labels from the UI. MODAUI is now the *only* system.
  4. **AI Taskforce Activation**: Deploy the 6 AI specialists to manage the unified operations autonomously.

## Migration Priority Matrix
1. **Product Center** (Critical Foundation)
2. **Inventory Center** (Asset Control)
3. **Finance Center** (Cashflow Sovereignty)
4. **Sales & POS** (Revenue Generation)
5. **Customer & CRM** (Relationship Capital)
6. **Purchase & Supplier** (Supply Chain)

## Success Metrics
- **Zero Dual-SSOT Conflicts**: All data points have exactly one owner in MODAUI.
- **End-to-End AI Automation**: AI agents can perform a full Purchase -> Inventory -> Sale cycle without human intervention.
- **Reduced Latency**: Removing the legacy PHP/MySQL overhead and moving to a unified Node.js/React stack.
