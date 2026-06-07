# LVA API (Platform-Level Admin)

此文档描述了后端新增的 LVA（平台级管理 - 管理/审计/配额）接口，便于前端/客户端对接。

基础路径：`/api/lva/`

## 1. Health
GET /api/lva/health
- 描述：服务健康检查
- 返回：{ success: true, service: "LVA", status: "ok", time }

示例：
```bash
curl -s http://localhost:3000/api/lva/health
```

## 2. 列表租户与配额
GET /api/lva/tenants
- 描述：返回所有租户的配额总览
- 返回：{ success: true, tenants: [ { id, quotaLimit, quotaUsed, billingStatus } ] }

## 3. 查询租户详情
GET /api/lva/tenants/:tenantId
- 描述：返回单个租户的配额与对应 merchant 信息

## 4. 更新租户配额
POST /api/lva/tenants/:tenantId/quota
- 描述：管理员更新租户配额上限
- Body: { quotaLimit: number }
- 返回：{ success: true, tenant }

示例：
```bash
curl -X POST http://localhost:3000/api/lva/tenants/mer_abc/quota -H 'Content-Type: application/json' -d '{"quotaLimit":5000}'
```

## 5. 获取审计日志
GET /api/lva/audit/logs?tenantId=...&level=...&limit=100
- 描述：基于简单过滤返回审计日志

## 6. 追加审计条目
POST /api/lva/ai/audit_ledger
- 描述：用于后台任务或 AI agent 将审计条目写入总账
- Body: { actor?: string, action: string, details?: object, tenantId?: string }

示例：
```bash
curl -X POST http://localhost:3000/api/lva/ai/audit_ledger -H 'Content-Type: application/json' -d '{"actor":"agent", "action":"MODEL_RUN", "details":{"model":"gpt"}, "tenantId":"mer_abc"}'
```

## 7. 查询租户使用情况
GET /api/lva/usage/:tenantId
- 描述：获取 quotaLimit、quotaUsed 和近期活动日志（用于管理面板展示）

## 8. 人工配额分配
POST /api/lva/allocations
- 描述：为指定租户临时追加配额
- Body: { tenantId: string, add: number, reason?: string }
- 返回：{ success: true, tenant, allocation }

示例：
```bash
curl -X POST http://localhost:3000/api/lva/allocations -H 'Content-Type: application/json' -d '{"tenantId":"mer_abc","add":1000,"reason":"promo"}'
```

---

注意：以上接口使用系统内置的 `ModaDB` 作为演示存储，生产环境请替换为真实的持久化存储与鉴权机制（例如基于 RBAC 的 admin token 授权）。
