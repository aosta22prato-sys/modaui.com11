# Phase 3 — Purchase Center Migration

## 目标
将 `script` 中的采购能力完全迁移到 `MODAUI` 的 Purchase Center。

## 范围
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

## 执行步骤
1. 创建 `src/modules/purchase-center` 或 `src/components/purchase-center` 目录。
2. 提取 `Purchase`、`PurchaseDetail` 的采购订单、采购明细、成本、供应商关系字段。
3. 吸收 `Provider` 的供应商管理、资质、信用和结算信息。
4. 吸收 `Quotation` 的采购报价与审批流程。
5. 将 `PurchaseReturn` 的退货流程与退货明细纳入 MODAUI 采购流程。
6. 保留采购计划、自动补货、供应商评分等业务规则。
7. 废弃 Stocky 前端显示层，仅保留操作层和接口。

## 风险点
- 采购退货流程与库存、财务之间的联动需要同步验证。
- 供应商管理与客户管理的身份边界需在 Customer Center 和 Purchase Center 间明确。

## 下一步
- 列出 `PurchasesController` 的主要 API 方法。
- 指定 `Purchase Center` 需要支持的核心业务场景：下单、收货、付款、退货、报价。
