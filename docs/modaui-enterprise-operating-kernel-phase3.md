# MODAUI 企业运营内核重组清单（Phase 3）

## 目标

将 `script` 中所有业务能力吸收到 `MODAUI` 体系。

保留：

- 数据模型
- 数据表
- Service
- Controller 业务逻辑
- 工作流
- 业务规则

废弃：

- Stocky UI
- Stocky Dashboard
- Stocky Layout
- Stocky Menu
- Stocky Login
- Stocky Branding

---

## P0-01 Product Center

### 目标
建立 MODAUI Product Center。

### 迁移模型
- `Product`
- `ProductVariant`
- `Brand`
- `Category`
- `Collection`
- `ProductImage`
- `ProductBatch`

### 迁移表
- `products`
- `product_variants`
- `brands`
- `categories`
- `collections`
- `product_images`
- `product_batches`

### 迁移控制器
- `ProductsController`
- `BrandsController`

### 未来 AI
- `AI Designer`
- `AI Product Manager`

### 优先级
★★★★★

---

## P0-02 Inventory Center

### 迁移模型
- `Warehouse`
- `WarehouseLocation`
- `ProductWarehouseLocation`
- `CountStock`
- `Adjustment`
- `AdjustmentDetail`
- `Damage`
- `DamageDetail`
- `Transfer`
- `TransferDetail`

### 迁移表
- `warehouses`
- `warehouse_locations`
- `count_stock`
- `adjustments`
- `adjustment_details`
- `damage_details`
- `transfers`
- `transfer_details`

### 迁移控制器
- `WarehouseController`
- `AdjustmentController`
- `DamageController`
- `TransferController`

### 未来 AI
- `AI Inventory Manager`

### 优先级
★★★★★

---

## P0-03 Purchase Center

### 迁移模型
- `Purchase`
- `PurchaseDetail`
- `Provider`
- `Quotation`
- `QuotationDetail`
- `PurchaseReturn`
- `PurchaseReturnDetails`

### 迁移表
- `purchases`
- `purchase_details`
- `providers`
- `quotations`
- `quotation_details`
- `purchase_returns`
- `purchase_return_details`

### 迁移控制器
- `PurchasesController`
- `ProvidersController`
- `QuotationsController`

### 未来 AI
- `AI Procurement Manager`

### 优先级
★★★★★

---

## P0-04 Sales Center

### 迁移模型
- `Sale`
- `SaleDetail`
- `DraftSale`
- `DraftSaleDetail`
- `SaleReturn`
- `SaleReturnDetails`
- `OnlineOrder`
- `OnlineOrderItem`

### 迁移表
- `sales`
- `sale_details`
- `draft_sales`
- `draft_sale_details`
- `sale_returns`
- `sale_return_details`
- `online_orders`
- `online_order_items`

### 迁移控制器
- `SalesController`
- `SalesReturnController`

### 未来 AI
- `AI Sales Director`

### 优先级
★★★★★

---

## P0-05 Sales Terminal

### 迁移模型
- `CashRegister`
- `PosSetting`

### 迁移表
- `cash_registers`
- `pos_settings`

### 迁移控制器
- `CashRegisterController`
- `PosController`

### 重命名
Stocky POS → MODAUI Sales Terminal

### 优先级
★★★★★

---

## P0-06 Customer Center

### 迁移模型
- `Client`
- `PortalClient`
- `EcommerceClient`
- `Subscriber`
- `StoreContact`

### 迁移表
- `clients`
- `portal_clients`
- `ecommerce_clients`
- `subscribers`

### 迁移控制器
- `ClientController`
- `ClientsEcommerceController`

### 未来 AI
- `AI Customer Success Manager`
- `AI Support Manager`

### 优先级
★★★★★

---

## P0-07 Finance Center

### 迁移模型
- `Account`
- `Expense`
- `Deposit`
- `TransferMoney`
- `PaymentSale`
- `PaymentPurchase`

### 迁移表
- `accounts`
- `expenses`
- `deposits`
- `transfer_money`

### 迁移控制器
- `AccountController`
- `ExpensesController`
- `DepositsController`
- `TransferMoneyController`

### 未来 AI
- `AI CFO`
- `AI Accountant`

### 优先级
★★★★★

---

## P0-08 Knowledge Center

### 迁移模型
- `KnowledgeBaseArticle`
- `KnowledgeBaseArticleGroup`
- `KnowledgeBaseArticleFeedback`

### 迁移控制器
- `KnowledgeBaseArticleController`
- `KnowledgeBaseArticleGroupController`

### 未来 AI
- `AI Knowledge Manager`

### 优先级
★★★★☆

---

## P0.5 Operations Center

### 迁移模型
- `Contract`
- `ContractTask`
- `ContractTemplate`
- `Project`

### 迁移控制器
- `ContractController`
- `ProjectController`

### 未来 AI
- `AI COO`
- `AI Operations Director`

### 优先级
★★★★☆

---

## P1 HR Center

### 迁移模型
- `Employee`
- `Attendance`
- `Leave`
- `Department`
- `Designation`
- `Holiday`

### 未来 AI
- `AI HR Director`

### 优先级
★★★☆☆

---

## 迁移顺序

### 第一批（立即）
- Product
- Inventory
- Purchase
- Sales
- Customer
- Finance

### 第二批
- Knowledge
- Operations

### 第三批
- HR
- Contracts
- Projects

### 最后
- QuickBooks
- WooCommerce
- Stripe
- Google Calendar
- 各种同步器

---

## 目标结果

- `src` = MODAUI Brain
- `script` = MODAUI Enterprise Operating Kernel
- 最终系统名称：MODAUI
- Stocky 不再作为产品存在
- 只保留业务能力、数据模型、数据表、Service、Controller、工作流和业务规则
- 废弃所有 Stocky UI / Stocky Branding / Stocky 独立入口
