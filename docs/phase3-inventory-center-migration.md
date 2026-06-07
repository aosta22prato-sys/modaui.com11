# Phase 3 — Inventory Center Migration

## 目标
将 `script` 中的库存能力完全迁移到 `MODAUI` 的 Inventory Center。

## 范围
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

## 执行步骤
1. 创建 `src/modules/inventory-center` 或 `src/components/inventory-center` 目录。
2. 从 `script/app/Models` 中提取仓库、仓位、库存盘点、调拨、损耗的核心字段。
3. 提炼 `WarehouseController` 的仓库管理、位置管理、仓库配置业务。
4. 吸收 `AdjustmentController` 的库存盘点与调整规则。
5. 吸收 `DamageController` 的损耗记录与原因分析流程。
6. 吸收 `TransferController` 的库存调拨、跨仓库转移逻辑。
7. 确保 `ProductWarehouseLocation` 与 Product Center 的商品模型可关联。
8. 废弃 Stocky 相关 UI，仅保留能力和接口。

## 风险点
- 库存调整与销售、采购之间的数据一致性需要同时手工校对。
- 仓库位置和库存盘点的业务规则可能与 MODAUI 现有数据模型冲突。

## 下一步
- 审查 `script/database/migrations` 中所有 inventory 相关迁移文件，确认字段和约束。
- 设定 `Inventory Center` 的数据接口规范和权限边界。
