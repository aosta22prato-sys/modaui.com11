# Phase 3 — Sales Center Migration

## 目标
将 `script` 中的销售能力完全迁移到 `MODAUI` 的 Sales Center。

## 范围
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

## 执行步骤
1. 创建 `src/modules/sales-center` 或 `src/components/sales-center` 目录。
2. 提取销售订单、销售明细、成交价格、折扣、税费等核心字段。
3. 吸收 `DraftSale` 的草稿单逻辑，用于先行订单、临时交易和审批。
4. 吸收 `SalesReturnController` 和退货明细流程。
5. 吸收 `OnlineOrder` 的电商订单与 `OnlineOrderItem` 的商品明细。
6. 设计 `Sales Center` 订单生命周期、支付状态和履约状态。
7. 废弃 Stocky 前端，仅保留业务层。

## 风险点
- 退货与换货逻辑与库存中心的库存扣减、财务中心的应收/应付联动复杂。
- `DraftSale` 与正式销售单的状态转换需要在迁移中严格保留。

## 下一步
- 审查 `SalesController` 的关键方法，定义 `Sales Center` 可迁移 API。
- 设定 `Sales Center` 与 `Sales Terminal` 的边界。
