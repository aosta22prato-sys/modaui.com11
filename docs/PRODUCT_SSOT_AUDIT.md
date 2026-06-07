# MODAUI Product Single Source of Truth (SSOT) Audit

## 1. Core Authority Matrix

| 问题 | 必须明确 | 详细策略 |
| :--- | :--- | :--- |
| **Product Master 在哪里** | **MODAUI** | MODAUI 是所有 SPU/产品的创建者和权威定义者。Stocky 仅作为展示终端。 |
| **Variant Master 在哪里** | **MODAUI** | 所有的 SKU 属性、规格组合必须在 MODAUI 生成。禁止在 Stocky 手动创建变体。 |
| **Price Master 在哪里** | **MODAUI** | 售价（Sales Price）的主权在 MODAUI。Stocky 的价格字段由 MODAUI 同步更新。 |
| **Inventory Master 在哪里** | **MODAUI** | 绝对唯一真相源。Stocky 不再计算库存，仅订阅 MODAUI 的 `InventoryRecord`。 |

## 2. 详细审计准则

### A. 商品主数据 (Product Master)
- **唯一标识**: 使用 `productId` 作为全局唯一标识。
- **创建流程**: AI Agent 或 管理员在 MODAUI 创建 -> 触发事件 -> Adapter 同步至 Stocky。
- **修改限制**: Stocky 后台的商品编辑功能应被禁用或标记为“只读”。

### B. 变体与 SKU (Variant Master)
- **同步方向**: MODAUI (Master) -> Stocky (Replica)。
- **条码管理**: 条码生成与管理逻辑驻留在 MODAUI。

### C. 价格策略 (Price Master)
- **多币种/等级**: 所有的价格计算公式、折扣逻辑在 MODAUI 运行。
- **同步触发**: 价格变动时，通过 API 实时推送到 Stocky 数据库。

### D. 库存状态 (Inventory Master)
- **不再同步数量**: Stocky 直接查询 MODAUI 的库存接口，或者 Stocky 数据库中的库存表仅作为缓存（Cache），由 MODAUI 的 `InventoryMovement` 事件驱动更新。

## 3. 风险控制：防止双主数据源 (Dual-SSOT Prevention)
- **接口审计**: 所有尝试直接修改 Stocky `products` 或 `variants` 表的 API 必须被重定向或记录异常。
- **UI 提示**: 在 Stocky 相关的管理界面显著位置提示：“此数据由 MODAUI 内核管理，修改请前往 MODAUI 控制台”。
- **双向同步检查**: 定期运行 `Verify_Product_Integrity` 脚本，若发现 Stocky 数据领先于 MODAUI，则以 MODAUI 为准强制覆盖。
