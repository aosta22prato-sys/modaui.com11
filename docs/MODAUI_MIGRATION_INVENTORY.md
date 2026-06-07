# MODAUI 迁移清单 (Migration Inventory)

本项目致力于将 MODAUI 建设成为统一的 **企业运营平台 (Enterprise Operating Platform)**。以下是 Stocky 业务能力向 MODAUI 原生逻辑迁移的实时清单。

## 核心业务模块状态

| 模块 | Stocky 状态 | MODAUI 状态 | 动作 | 负责人 (AI Agent) |
| :--- | :--- | :--- | :--- | :--- |
| **Product (商品)** | 有 (SPU/SKU) | 有 (Master) | **对齐**: 确保所有 Stocky 字段在 `DBProduct` 中有承载。 | AI Designer |
| **POS (收银)** | 有 (Vue2) | **DECOMMISSIONED** | **已替代**: MODAUI 原生 POS 视图已上线。 | AI Success Lead |
| **Purchase (采购)** | 有 (PHP) | **DECOMMISSIONED** | **已替代**: `PurchaseService` 闭环采购入库与财务流。 | AI Purchase Manager |
| **Sale (销售)** | 有 (PHP) | **DECOMMISSIONED** | **已替代**: `SalesService` 闭环订单状态机与库存扣减。 | AI Marketing Manager |
| **Customer (客户)** | 有 (PHP) | **DECOMMISSIONED** | **已替代**: 档案已对齐，支持积分与信用额度。 | AI Marketing Manager |
| **Supplier (供应商)** | 有 (PHP) | **DECOMMISSIONED** | **已替代**: 原生供应商管理中心已建立。 | AI Purchase Manager |
| **Inventory (库存)** | 有 (PHP) | **DECOMMISSIONED** | **已替代**: 全量吸收至 `InventoryRecord` 内核。 | AI Inventory Manager |
| **Finance (财务)** | 有 (PHP) | **DECOMMISSIONED** | **已替代**: 全量吸收至 `BusinessTransaction` 内核。 | AI Comptroller |
| **Report (报表)** | 有 (PHP) | **DECOMMISSIONED** | **已替代**: 原生报表中心聚合全量业务数据。 | AI Comptroller |

## 迁移技术准则
1. **服务化 (Service-Oriented)**: 不直接复制控制器，而是提炼 `PurchaseService`, `SalesService`, `POSService`。
2. **事件驱动 (Event-Driven)**: 所有业务操作必须通过发射 `Movement` 或 `Transaction` 事件来驱动状态更新。
3. **API 优先 (API-First)**: 所有能力通过 REST API 暴露，为未来 AI Agent 调用做准备。
4. **去债务 (Debt-Free)**: 废弃旧系统的 Blade, Vue2, 旧 Session 逻辑，统一使用 React + TypeScript 架构。

## 进度追踪
- [x] 定义企业运营平台 (EOP) 战略
- [x] 建立商品主权 (SSOT)
- [x] 扩展 `DBUser` 对齐 Stocky 客户档案
- [x] 建立原生采购服务 (PurchaseService) 核心逻辑
- [x] 建立原生销售服务 (SalesService) 核心逻辑
- [x] 实现 POS 逻辑全量迁移
- [x] 建立原生供应商管理服务 (SupplierService)
- [x] 建立原生报表中心 (ReportCenter)
- [x] 执行最终业务验证 (Final Parity Check)
- [x] 物理删除 `/script` 目录 (Decommissioned Stocky)
