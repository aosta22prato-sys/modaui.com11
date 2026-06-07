# Sale/Order Domain Audit Report

## 审计日期
2026-06-06

## 核心发现

### 旧系统中发现的销售相关模型（共 13 个）

#### 1. 主销售模型
- **Sale.php** — 主销售订单表
  - 支持 POS 销售 (`is_pos` 字段)
  - 支持积分系统 (`used_points`, `earned_points`, `discount_from_points`)
  - 关键字段: `id`, `Ref`, `date`, `client_id`, `warehouse_id`, `GrandTotal`, `statut`, `payment_statut`
  - 幂等性: 已有 `sale_uuid` 字段（用于 POS）
  - 关联: SaleDetail (1:N), Client, Warehouse, User, SalesAgent, Subscription

- **SaleDetail.php** — 销售行项表
  - 每行产品的数量、价格、税价等
  - 关联: Sale, Product

- **SaleReturn.php** — 销售退货单
  - 与 SaleReturnDetails 关联
  - 与 SaleReturnDetailBatch 关联

#### 2. 在线订单模型
- **OnlineOrder.php** — 在线订单表
  - 支持 Stripe 支付集成 (`stripe_payment_intent_id`)
  - 支持预售商品 (`has_preorder_items`)
  - 关键字段: `date`, `ref`, `client_id`, `warehouse_id`, `total`, `payment_status`
  - 关联: OnlineOrderItem (1:N), Client, Warehouse

- **OnlineOrderItem.php** — 在线订单行项
  - 与 OnlineOrder 关联

#### 3. 店铺订单模型
- **StoreOrder.php** — 店铺订单表
  - 存储完整客户信息 (name, email, phone)
  - 支持配送地址和账单地址
  - 关键字段: `code`, `customer_id`, `total`, `status`
  - 关联: StoreOrderItem (1:N)

- **StoreOrderItem.php** — 店铺订单行项
  - 与 StoreOrder 关联

#### 4. 业务相关模型
- **SaleCommission.php** — 销售佣金
  - 与销售代理相关

- **SalesAgent.php** — 销售代理
  - 与 Sale 关联

- **SaleDetailBatch.php** & **SaleReturnDetailBatch.php** — 批次管理
  - 用于追踪批号/序列号

- **SaleDocument.php** — 销售文档
  - 支持附加文档

### 库存影响点

#### 库存减少触发点
1. **Sale (销售订单)** → SaleDetail (行项)
   - 当销售完成时，从仓库中减少库存
   - 可能有分阶段确认（待确认 → 已确认 → 已打包 → 已发货）

2. **OnlineOrder (在线订单)** → OnlineOrderItem
   - 支付成功后减少库存
   - 可能有预订逻辑（预售商品特殊处理）

3. **StoreOrder (店铺订单)**
   - 与 StoreOrderItem 关联
   - 库存减少逻辑需确认

4. **SaleReturn (销售退货)**
   - 产生库存增加
   - 退货原因追踪

### 幂等性支持现状

| 模型 | 现有幂等字段 | 备注 |
|------|-----------|------|
| Sale | `sale_uuid` | POS 销售已有幂等字段 |
| OnlineOrder | `stripe_payment_intent_id` | 可用于支付幂等 |
| StoreOrder | 无 | 需要添加 |
| SaleReturn | 无 | 需要添加 |

### 仓库/配置相关字段

- `warehouse_id` — 销售仓库位置
- `shipping_address` — 配送地址（StoreOrder）
- `shipping_status` — 配送状态（Sale）

---

## 迁移影响分析

### 库存流（事件序列）

```
Sale/OnlineOrder/StoreOrder
        ↓
   SaleDetail/Item
        ↓
   库存确认状态检查
        ↓
   InventoryMovement (SALE type)
        ↓
   InventoryRecord (库存扣减)
```

### 关键决策点

1. **何时触发 InventoryMovement**？
   - 销售单创建时？
   - 销售单确认时？
   - 销售单完成/发货时？

2. **支持退货吗**？
   - SaleReturn → InventoryMovement (RETURN type, 库存增加)

3. **多仓库支持**？
   - 需要在 InventoryMovement 中保留 `warehouse_id`
   - 当前已支持

4. **批次追踪**？
   - SaleDetailBatch 表示按批号销售
   - InventoryMovement 需保留 `batchId`
   - 当前已支持

---

## 推荐迁移策略

### 短期 (Adapter Phase)
1. 创建 Sale Adapter 脚本
   - 读取 `sales` 表的完成/已确认记录
   - 为每条 sale_detail 发射 `SALE:SO-{id}:line-{i}` InventoryMovement
   - 或采用 Order-Level 幂等: `SALE:SO-{id}`

2. 创建 OnlineOrder Adapter
   - 读取已支付的 online_orders 记录
   - 发射相应的 InventoryMovement

3. 创建 SaleReturn Adapter
   - 读取 sale_returns 记录
   - 发射 RETURN 类型的 InventoryMovement（库存增加）

### 中期 (Native Support)
- 建立 MODAUI 原生的 Sale, Order 模型
- 保留旧系统为兼容层或只读来源
- 所有新销售订单通过 MODAUI API 创建

### 长期 (Full Migration)
- 完全弃用旧 Stocky Sale 表
- MODAUI 为库存事实来源

---

## 与 Purchase 域的对比

| 方面 | Purchase | Sale |
|------|----------|------|
| 表数量 | 少（Purchase, PurchaseDetail） | 多（Sale, OnlineOrder, StoreOrder 等） |
| 幂等性 | 无 | 部分有 (`sale_uuid`) |
| 支付集成 | 无 | 有（Stripe, QuickBooks） |
| 库存影响 | 增加 (inbound) | 减少 (outbound) + 增加 (return) |
| 流程复杂度 | 低（单一采购流） | 高（多渠道销售） |

---

## 后续行动

### P4: Sale Adapter 实现
1. 设计 `/script/adapters/sale-adapter.php` 或类似脚本
2. 为 Sale → InventoryMovement 创建转换逻辑
3. 处理 OnlineOrder 和 StoreOrder 的特殊情况
4. 测试幂等性

### P1.5: 稳定 Inventory Engine
- 确保 Movement Engine 能正确处理 SALE 类型
- 验证库存减少逻辑（fromWarehouse 字段）

### 其他考虑
- 是否支持销售取消？(逆向 InventoryMovement)
- 是否支持预订商品的特殊逻辑？(OnlineOrder 中的 `has_preorder_items`)
- 积分系统如何与库存无关，暂不处理
- 配送状态与库存状态的关系定义
