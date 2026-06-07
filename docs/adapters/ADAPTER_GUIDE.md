# MODAUI Adapter Framework 指南

## 概述

Adapter 是连接旧系统 (Stocky) 和新系统 (MODAUI) 的桥梁。通过 adapter，旧系统的采购和销售记录可以转换为 `InventoryMovement` 事件，发送到 MODAUI 的库存引擎。

## 架构

```
Stocky (Legacy System)
    ↓ (读取)
Adapter Scripts
    ↓ (转换)
InventoryMovement 事件
    ↓ (POST /api/inventory/movements)
MODAUI (新系统)
    ↓ (处理)
InventoryRecord (库存事实来源)
```

## Purchase Adapter

### 位置
- `script/adapters/purchase-adapter.js`

### 功能
从旧系统的 `purchases` 表读取采购单，转换为 `PURCHASE` 类型的 InventoryMovement。

### 转换规则
| 字段 | 映射 |
|------|------|
| `Purchase.Ref` | Movement.idempotencyKey = `PURCHASE:{Ref}` |
| `PurchaseDetail.quantity` | Movement.quantity |
| `PurchaseDetail.product_id` | Movement.variantId = `legacy:product:{product_id}` |
| `Purchase.warehouse_id` | Movement.toWarehouseId |
| `Purchase.created_at` | Movement.createdAt |

### 使用方式

```bash
# 干运行（不发送实际请求）
node script/adapters/purchase-adapter.js \
  --merchantId=merchant-001 \
  --dry-run

# 实际运行（发送到 API）
MODAUI_API_URL=http://localhost:5173/api \
MODAUI_API_TOKEN=your-token \
node script/adapters/purchase-adapter.js \
  --merchantId=merchant-001
```

### 环境变量
- `MODAUI_API_URL` — MODAUI API 基础 URL (默认: http://localhost:5173/api)
- `MODAUI_API_TOKEN` — API 认证令牌 (如无 token，需实现认证)
- `LEGACY_DB_HOST` — 旧数据库主机 (默认: localhost)
- `LEGACY_DB_USER` — 旧数据库用户 (默认: root)
- `LEGACY_DB_PASS` — 旧数据库密码 (默认: '')
- `LEGACY_DB_NAME` — 旧数据库名称 (默认: stocky_db)

### 输出示例
```
==================================================
Purchase Adapter - Legacy to MODAUI InventoryMovement
==================================================
Configuration:
  API Base: http://localhost:5173/api
  Merchant ID: merchant-001
  Dry Run: true

[STEP 1] Fetching legacy purchase records...
  Found 2 purchases

[SEND] Movement: PURCHASE:PO-001
  [DRY-RUN] Would send: {...}
[SEND] Movement: PURCHASE:PO-001
  [DRY-RUN] Would send: {...}

==================================================
Adapter Results:
  Sent: 2
  Errors: 0
  Skipped: 0
  Mode: DRY-RUN
==================================================
```

---

## Sale Adapter

### 位置
- `script/adapters/sale-adapter.js`

### 功能
从旧系统的多个销售表读取销售记录，转换为 `SALE` 或 `SALE_RETURN` 类型的 InventoryMovement。

### 支持的销售类型

#### 1. SALE (店铺销售)
从 `sales` 表读取，转换为 `SALE` 类型的 outbound movement。

| 字段 | 映射 |
|------|------|
| `Sale.Ref` | Movement.idempotencyKey = `SALE:{Ref}` |
| `SaleDetail.quantity` | Movement.quantity |
| `SaleDetail.product_id` | Movement.variantId |
| `Sale.warehouse_id` | Movement.fromWarehouseId (出库) |

#### 2. ONLINE_ORDER (在线订单)
从 `online_orders` 表读取，转换为 `SALE` 类型的 outbound movement。

| 字段 | 映射 |
|------|------|
| `OnlineOrder.ref` | Movement.idempotencyKey = `ONLINE_ORDER:{ref}` |
| `OnlineOrderItem.quantity` | Movement.quantity |
| `OnlineOrderItem.product_id` | Movement.variantId |
| `OnlineOrder.warehouse_id` | Movement.fromWarehouseId |

#### 3. STORE_ORDER (店铺订单)
从 `store_orders` 表读取，转换为 `SALE` 类型的 outbound movement。

| 字段 | 映射 |
|------|------|
| `StoreOrder.code` | Movement.idempotencyKey = `STORE_ORDER:{code}` |
| `StoreOrderItem.quantity` | Movement.quantity |
| `StoreOrderItem.product_id` | Movement.variantId |
| | Movement.fromWarehouseId = 'default-warehouse' |

#### 4. SALE_RETURN (销售退货)
从 `sale_returns` 表读取，转换为 `SALE_RETURN` 类型的 inbound movement (库存增加)。

| 字段 | 映射 |
|------|------|
| `SaleReturn.Ref` | Movement.idempotencyKey = `SALE_RETURN:{Ref}` |
| `SaleReturnDetails.quantity` | Movement.quantity |
| `SaleReturnDetails.product_id` | Movement.variantId |
| `SaleReturn.warehouse_id` | Movement.toWarehouseId (入库) |

### 使用方式

```bash
# 干运行：迁移 Sale 记录
node script/adapters/sale-adapter.js \
  --merchantId=merchant-001 \
  --saleType=SALE \
  --dry-run

# 迁移在线订单
node script/adapters/sale-adapter.js \
  --merchantId=merchant-001 \
  --saleType=ONLINE_ORDER \
  --dry-run

# 迁移店铺订单
node script/adapters/sale-adapter.js \
  --merchantId=merchant-001 \
  --saleType=STORE_ORDER \
  --dry-run

# 迁移退货
node script/adapters/sale-adapter.js \
  --merchantId=merchant-001 \
  --saleType=SALE_RETURN \
  --dry-run
```

---

## 幂等性策略

两个 adapter 都遵循 **Order-Level 幂等性**：

- **Purchase Adapter**: `PURCHASE:{Ref}`
- **Sale Adapter (SALE)**: `SALE:{Ref}`
- **Sale Adapter (ONLINE_ORDER)**: `ONLINE_ORDER:{ref}`
- **Sale Adapter (STORE_ORDER)**: `STORE_ORDER:{code}`
- **Sale Adapter (SALE_RETURN)**: `SALE_RETURN:{Ref}`

### 规则
- **idempotencyKey** 只赋给每条单据的**第一行**
- 后续行项有 `idempotencyKey = null`
- 如果相同的单据被重新运行，API 返回 `idempotent: true`

### 例子
```
采购单 PO-001 有 3 行:
- Line 1: idempotencyKey = "PURCHASE:PO-001"
- Line 2: idempotencyKey = null
- Line 3: idempotencyKey = null

如果重新提交同一采购单，API 会：
1. 检查 idempotencyKey "PURCHASE:PO-001" 是否存在
2. 发现已存在，返回 { idempotent: true, id: existing_id }
3. 不创建新的 Movement
```

---

## 执行流程

### 1. 干运行阶段 (DRY-RUN)
```bash
# 先用 --dry-run 查看将发生什么
node script/adapters/purchase-adapter.js --merchantId=m1 --dry-run
node script/adapters/sale-adapter.js --merchantId=m1 --saleType=SALE --dry-run
```

输出会显示：
- 发现多少条记录
- 跳过多少条（不符合状态的）
- 将发送的 Movement 内容（但不真正发送）

### 2. 数据验证
确认以下内容正确：
- productId 映射到正确的 variantId
- warehouseId 映射到正确的仓库
- 数量和类型正确

### 3. 生产运行
```bash
# 设置认证 token
export MODAUI_API_TOKEN=your-token

# 运行真实迁移
node script/adapters/purchase-adapter.js --merchantId=m1
node script/adapters/sale-adapter.js --merchantId=m1 --saleType=SALE
```

### 4. 验证结果
- 检查 `/api/inventory/movements` 返回的 Movement 记录
- 检查 `/api/inventory/records` 验证库存是否正确更新
- 对比旧系统和新系统的库存数据

---

## 注意事项

### 数据映射
- 当前 adapter 使用 `legacy:product:{id}` 和 `legacy:warehouse:{id}` 前缀
- 实际部署时需要：
  1. 建立 productId 映射表 (旧 → 新)
  2. 建立 warehouseId 映射表 (旧 → 新)
  3. 更新 adapter 中的转换逻辑

### 数据库连接
- 当前 adapter 使用 mock 数据
- 实际部署时需要：
  1. 实现旧数据库连接逻辑 (e.g., mysql/mysqli 或 PDO)
  2. 查询真实的 purchases、sales 等表
  3. 处理数据库错误和重试

### 认证
- 当前 adapter 使用 Bearer token 认证
- 如果 MODAUI API 没有实现认证，可删除 Authorization header
- 实际部署时建议：
  1. 使用 API Key 或 OAuth token
  2. 实现 rate limiting
  3. 添加重试机制

### 错误处理
- 单条 Movement 失败不会停止整个迁移
- 最后显示错误统计，exit code 为 1（表示有错误）
- 生产部署建议：
  1. 添加日志记录 (到文件或云服务)
  2. 实现重试机制 (指数退避)
  3. 添加 webhook 通知

---

## 维护和监控

### 定期运行
```bash
# 周期性检查新增的 Purchase/Sale 记录
# 建议每 6 小时或 24 小时运行一次

0 */6 * * * node script/adapters/purchase-adapter.js --merchantId=m1 >> /var/log/adapter.log
0 */6 * * * node script/adapters/sale-adapter.js --merchantId=m1 --saleType=SALE >> /var/log/adapter.log
```

### 对账 (Reconciliation)
```javascript
// 核对迁移数据
const legacyTotal = 1000; // 旧系统总数量
const newSystemTotal = await getInventoryTotal(); // 新系统查询
assert(legacyTotal === newSystemTotal, '库存不匹配!');
```

---

## 下一步

### P2 - Purchase Adapter 完善
- [ ] 实现真实的数据库连接
- [ ] 添加 productId 映射表
- [ ] 添加错误重试机制
- [ ] 编写单元测试

### P4 - Sale Adapter 完善
- [ ] 实现真实的数据库连接
- [ ] 支持所有销售类型的并发迁移
- [ ] 处理 SALE_RETURN 的幂等性
- [ ] 添加预售商品逻辑 (OnlineOrder 中的 `has_preorder_items`)

### P1.5 - Movement Engine 完善
- [ ] 支持 SALE_RETURN 类型的反向库存
- [ ] 支持销售取消 (生成逆向 Movement)
- [ ] 添加库存不足预警
