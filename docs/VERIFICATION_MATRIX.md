# Inventory Kernel Verification Matrix

## 验证总进度

| Phase | 验证项 | 状态 | 备注 |
|-------|--------|------|------|
| **Phase 1** | Server Start | ⏳ Pending | 服务能否启动 + 新增路由存在 |
| **Phase 2** | DB Tables Creation | ⏳ Pending | inventory_records, inventory_movements, purchases 表是否真的创建 |
| **Phase 3** | Purchase → Movement → Record | ⏳ Pending | 完整业务流：采购单 → 库存流水 → 库存记录 |
| **Phase 4** | Idempotency Test | ⏳ Pending | 重复提交 PURCHASE:PO-1001 是否幂等（仅一条记录） |
| **Bonus** | Restart Persistence | ⏳ Pending | 重启服务后，Movement 和 Record 仍然存在 |

---

## Phase 1: Server Start & Route Verification

### 任务
1. 启动服务：`npm run dev` 或 `npm start`
2. 验证新增路由是否响应

### 验证点
- [ ] 服务成功启动（无 error）
- [ ] `POST /api/purchases` 存在并响应（200 或 400）
- [ ] `POST /api/inventory/movements` 存在并响应
- [ ] `GET /api/inventory/movements` 存在并响应
- [ ] `GET /api/inventory/records` 存在并响应

### 期望结果
```
Server started on port 5173/3000
Routes registered:
  POST /api/purchases
  POST /api/inventory/movements
  GET /api/inventory/movements
  GET /api/inventory/records
```

### 实际结果
```
Status: ⏳ Pending
Output: (to be filled)
```

---

## Phase 2: Database Tables Creation

### 任务
连接到 SQLite 数据库，验证表是否创建

### 验证点
- [ ] `inventory_records` 表存在
- [ ] `inventory_movements` 表存在
- [ ] `purchases` 表存在
- [ ] `idempotencyKey` 列在 `inventory_movements` 中存在

### SQL 验证命令
```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

### 表结构检查
```sql
PRAGMA table_info(inventory_records);
PRAGMA table_info(inventory_movements);
PRAGMA table_info(purchases);
```

### 期望结果
```
Tables found:
  - inventory_records (columns: id, merchantId, variantId, batchId, warehouseId, locationId, onHand, available, createdAt, updatedAt)
  - inventory_movements (columns: id, merchantId, type, variantId, batchId, fromWarehouseId, fromLocationId, toWarehouseId, toLocationId, quantity, referenceType, referenceId, idempotencyKey, notes, createdAt)
  - purchases (columns: id, merchantId, purchaseNumber, items, createdAt)
```

### 实际结果
```
Status: ⏳ Pending
Output: (to be filled)
```

---

## Phase 3: Purchase → Movement → Record Flow

### 任务
执行完整的业务流，验证数据流转

### 步骤 1: 创建采购单
```bash
curl -X POST http://localhost:5173/api/purchases \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "test-merchant-001",
    "id": "po_test_001",
    "items": [
      {
        "variantId": "var_test_001",
        "quantity": 10,
        "warehouseId": "wh_test_001"
      }
    ]
  }'
```

### 期望响应
```json
{
  "success": true,
  "id": "po_test_001",
  "idempotencyKey": "PURCHASE:po_test_001",
  "movementIds": ["mov_xxxxx"]
}
```

### 步骤 2: 验证 Movement 创建
```bash
curl http://localhost:5173/api/inventory/movements?merchantId=test-merchant-001
```

### 期望响应
```json
{
  "movements": [
    {
      "id": "mov_xxxxx",
      "merchantId": "test-merchant-001",
      "type": "PURCHASE",
      "variantId": "var_test_001",
      "quantity": 10,
      "toWarehouseId": "wh_test_001",
      "idempotencyKey": "PURCHASE:po_test_001",
      "referenceId": "po_test_001"
    }
  ]
}
```

### 步骤 3: 验证 Record 更新
```bash
curl http://localhost:5173/api/inventory/records?merchantId=test-merchant-001
```

### 期望响应
```json
{
  "records": [
    {
      "id": "rec_xxxxx",
      "merchantId": "test-merchant-001",
      "variantId": "var_test_001",
      "warehouseId": "wh_test_001",
      "onHand": 10,
      "available": 10
    }
  ]
}
```

### 验证矩阵
- [ ] Step 1: POST /api/purchases 返回 200 + movementIds
- [ ] Step 2: GET /api/inventory/movements 显示 1 条记录，数量=10
- [ ] Step 3: GET /api/inventory/records 显示 1 条记录，onHand=10
- [ ] 库存数值完全对应（10 个商品进库）

### 实际结果
```
Status: ⏳ Pending

Step 1 Response:
(to be filled)

Step 2 Response:
(to be filled)

Step 3 Response:
(to be filled)

Data Flow Verified: [ ] Yes [ ] No
Issues: (if any)
```

---

## Phase 4: Idempotency Test

### 任务
重复提交同一采购单，验证幂等性

### 步骤 1: 首次提交
```bash
curl -X POST http://localhost:5173/api/purchases \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "test-merchant-002",
    "id": "po_idempotent_001",
    "items": [{"variantId": "var_idem_001", "quantity": 5, "warehouseId": "wh_idem_001"}]
  }'
```

### 期望响应 (首次)
```json
{
  "success": true,
  "id": "po_idempotent_001",
  "idempotencyKey": "PURCHASE:po_idempotent_001",
  "movementIds": ["mov_idem_001"]
}
```

### 步骤 2: 重复提交（完全相同）
```bash
curl -X POST http://localhost:5173/api/purchases \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "test-merchant-002",
    "id": "po_idempotent_001",
    "items": [{"variantId": "var_idem_001", "quantity": 5, "warehouseId": "wh_idem_001"}]
  }'
```

### 期望响应 (重复)
```json
{
  "success": true,
  "id": "po_idempotent_001",
  "idempotent": true
}
```

### 步骤 3: 验证数据库中只有 1 条 Movement
```bash
curl http://localhost:5173/api/inventory/movements?merchantId=test-merchant-002
```

### 期望结果
```json
{
  "movements": [
    {
      "id": "mov_idem_001",
      "idempotencyKey": "PURCHASE:po_idempotent_001",
      "referenceId": "po_idempotent_001",
      "quantity": 5
    }
  ]
}
```

### 验证矩阵
- [ ] 首次响应：success=true, movementIds=[xxx]
- [ ] 重复响应：success=true, idempotent=true
- [ ] 数据库中仍只有 1 条 Movement（不是 2 条）
- [ ] onHand 仍是 5（不是 10）

### 实际结果
```
Status: ⏳ Pending

First Submit Response:
(to be filled)

Duplicate Submit Response:
(to be filled)

DB Query (all movements):
(to be filled)

Idempotency Verified: [ ] Yes [ ] No
Issues: (if any)
```

---

## Bonus: Restart Persistence

### 任务
完成 Phase 3 后，重启服务，验证数据是否仍然存在

### 步骤
1. Phase 3 完成后，查询数据库中 Movement 数量 → 记录
2. 重启服务 (`kill` + `npm run dev`)
3. 重新查询数据库 → 比对

### 验证命令
```bash
# Before restart
curl http://localhost:5173/api/inventory/movements?merchantId=test-merchant-001

# After restart
curl http://localhost:5173/api/inventory/movements?merchantId=test-merchant-001
```

### 期望结果
- 重启前：显示 N 条记录
- 重启后：显示相同 N 条记录（持久化正确）

### 实际结果
```
Status: ⏳ Pending

Before Restart Count: (to be filled)
After Restart Count: (to be filled)
Persistence Verified: [ ] Yes [ ] No
Issues: (if any)
```

---

## 总体验证状态

```
[⏳⏳⏳⏳⏳] 0/5 Phase Complete

Inventory Kernel Status: UNVERIFIED
```

---

## 后续行动

### 如果所有验证通过 ✅
```
Inventory Kernel Status: VERIFIED ✅
可以进行：
- P2: Purchase Adapter 实装（连接真实数据库）
- P4: Sale Adapter 实装（处理多源数据）
```

### 如果任何验证失败 ❌
```
停止新增功能
修复当前问题
重新验证

问题可能原因：
- 路由未注册
- 数据库表未创建
- Movement 生成失败
- Record 更新失败
- 幂等性逻辑错误
- SQLite 持久化问题
```

---

## 执行日志

### 开始时间
2026-06-06 (待记录)

### 每 Phase 完成时间
- Phase 1: (待记录)
- Phase 2: (待记录)
- Phase 3: (待记录)
- Phase 4: (待记录)
- Bonus: (待记录)

### 总耗时
(待计算)
