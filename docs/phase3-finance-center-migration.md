# Phase 3 — Finance Center Migration

## 目标
将 `script` 中的财务能力完全迁移到 `MODAUI` 的 Finance Center。

## 范围
### 迁移模型
- `Account`
- `Expense`
- `Deposit`
- `TransferMoney`
- `PaymentSale`
- `PaymentPurchase`
- `PaymentSaleReturns`
- `PaymentPurchaseReturns`
- `PaymentMethod`
- `Payroll`
- `AccountingV2/*`
- `QuickBooksToken`
- `QuickBooksAudit`

### 迁移表
- `accounts`
- `expenses`
- `deposits`
- `transfer_money`
- `payment_sales`
- `payment_purchases`

### 迁移控制器
- `AccountController`
- `ExpensesController`
- `DepositsController`
- `TransferMoneyController`

### 未来 AI
- `AI CFO`
- `AI Accountant`

## 执行步骤
1. 创建 `src/modules/finance-center` 或 `src/components/finance-center` 目录。
2. 提取 `Account`、`Expense`、`Deposit`、`TransferMoney` 的账务结构和核心字段。
3. 吸收 `PaymentSale`、`PaymentPurchase` 的收款与付款流程。
4. 吸收 `PaymentMethod` 的支付方式管理。
5. 吸收 `Payroll` 的薪酬计算与发放流程。
6. 吸收 `AccountingV2/*` 的更高级会计处理逻辑。
7. 若有 QuickBooks 集成，保留能力资产，后续作为 P2 外部连接处理。
8. 废弃 Stocky 财务前端，仅保留业务能力和接口。

## 风险点
- 财务数据与销售、采购、库存之间的账务一致性需要验真。
- 会计处理规则可能与 MODAUI 现有财务模型存在差异。

## 下一步
- 审查 `AccountController`、`ExpensesController`、`DepositsController`、`TransferMoneyController` 的 API。
- 规划 Finance Center 的核心报表和财务指标接口。
