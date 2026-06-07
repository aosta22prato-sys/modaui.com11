# Phase 3 — Customer Center Migration

## 目标
将 `script` 中的客户能力完全迁移到 `MODAUI` 的 Customer Center。

## 范围
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

## 执行步骤
1. 创建 `src/modules/customer-center` 或 `src/components/customer-center` 目录。
2. 提取 `Client`、`PortalClient`、`EcommerceClient` 的客户属性、标签、渠道和生命周期字段。
3. 吸收 `Subscriber` 的订阅用户、营销订阅和圈层关系。
4. 吸收 `StoreContact` 的客户联系记录与客户关系维护数据。
5. 设计客户画像、行为事件和生命周期阶段的数据结构。
6. 废弃 Stocky 客户前端显示层，仅保留能力层。

## 风险点
- 客户类型边界（普通客户、门户客户、电商客户）需要与现有 MODAUI 用户模型协调。
- 客户标签、状态和生命周期规则需统一定义。

## 下一步
- 审查 `ClientController` 的主要方法，定义 Customer Center 的服务接口。
- 确定客户中心与销售中心、采购中心、知识中心的交互点。
