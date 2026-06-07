import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface Tenant {
  id: string;
  quotaLimit: number;
  quotaUsed: number;
  billingStatus?: string;
}

interface AuditLog {
  id: string;
  tenantId: string;
  action: string;
  actor?: string;
  timestamp: string;
  details?: any;
}

export default function LVAView() {
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<Tenant | null>(null);
  const [allocAmount, setAllocAmount] = React.useState(0);
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [page, setPage] = React.useState(1);
  const pageSize = 8;

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lva/tenants');
      const j = await res.json();
      if (j.success) setTenants(j.tenants || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTenants();
  }, []);

  const viewTenant = async (id: string) => {
    try {
      const res = await fetch(`/api/lva/tenants/${id}`);
      const j = await res.json();
      if (j.success) setSelected(j.tenant || null);
      fetchLogs(id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async (tenantId?: string) => {
    try {
      const url = tenantId ? `/api/lva/audit/logs?tenantId=${encodeURIComponent(tenantId)}&limit=50` : `/api/lva/audit/logs?limit=50`;
      const res = await fetch(url);
      const j = await res.json();
      if (j.success) setLogs(j.logs || []);
    } catch (e) {
      console.error('fetchLogs', e);
    }
  };

  const allocate = async () => {
    if (!selected) return;
    try {
      const res = await fetch('/api/lva/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selected.id, add: Number(allocAmount), reason: 'platform_admin_manual' })
      });
      const j = await res.json();
      if (j.success) {
        await fetchTenants();
        await viewTenant(selected.id);
        setAllocAmount(0);
      } else {
        alert('Allocate failed: ' + (j.error || JSON.stringify(j)));
      }
    } catch (e: any) {
      alert('Allocate error: ' + e.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(tenants.length / pageSize));
  const visibleTenants = tenants.slice((page - 1) * pageSize, page * pageSize);

  const chartData = tenants.map(t => ({ id: t.id, used: t.quotaUsed || 0, limit: t.quotaLimit || 0 }));

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <div className="col-span-1 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">租户列表</h3>
          <div className="flex items-center gap-2">
            <button onClick={fetchTenants} className="text-xs px-2 py-1 bg-slate-800 rounded">刷新</button>
            <div className="text-xs text-neutral-400">{tenants.length} 租户</div>
          </div>
        </div>
        <div className="mt-3 space-y-2 max-h-72 overflow-auto">
          {loading && <div className="text-sm text-neutral-400">加载中...</div>}
          {!loading && tenants.length === 0 && <div className="text-sm text-neutral-500">暂无租户</div>}
          {visibleTenants.map(t => (
            <button key={t.id} onClick={() => viewTenant(t.id)} className="w-full text-left rounded-md p-2 hover:bg-neutral-900 flex justify-between items-center">
              <div>
                <div className="font-medium">{t.id}</div>
                <div className="text-xs text-neutral-400">{t.billingStatus || '—'}</div>
              </div>
              <div className="text-sm text-neutral-300">{t.quotaUsed}/{t.quotaLimit}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-neutral-400">页 {page}/{totalPages}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-2 py-1 bg-slate-800 rounded text-xs">上一页</button>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-2 py-1 bg-slate-800 rounded text-xs">下一页</button>
          </div>
        </div>
      </div>

      <div className="col-span-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">租户详情</h3>
            <div className="mt-1 text-sm text-neutral-400">点击租户查看详情。</div>
          </div>
          <div className="text-sm text-neutral-400">数据实时更新</div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded p-3 bg-[#020509]">
            <div className="text-xs text-neutral-400">使用对比</div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <XAxis dataKey="id" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="used" fill="#34d399" name="已用" />
                  <Bar dataKey="limit" fill="#60a5fa" name="配额上限" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded p-3 bg-[#020509]">
            <div className="text-xs text-neutral-400">关键指标</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded p-3 bg-neutral-900">
                <div className="text-xs text-neutral-400">已注册</div>
                <div className="font-medium">{tenants.length}</div>
              </div>
              <div className="rounded p-3 bg-neutral-900">
                <div className="text-xs text-neutral-400">配额上限</div>
                <div className="font-medium">{tenants.reduce((s,t)=>s+(t.quotaLimit||0),0)}</div>
              </div>
              <div className="rounded p-3 bg-neutral-900">
                <div className="text-xs text-neutral-400">已用配额</div>
                <div className="font-medium">{tenants.reduce((s,t)=>s+(t.quotaUsed||0),0)}</div>
              </div>
              <div className="rounded p-3 bg-neutral-900">
                <div className="text-xs text-neutral-400">活跃租户</div>
                <div className="font-medium">{tenants.filter(t=>t.quotaUsed>0).length}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {!selected && <div className="mt-4 text-sm text-neutral-400">选择租户查看详情。</div>}
          {selected && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded p-3 bg-[#020509]">
                  <div className="text-xs text-neutral-400">租户 ID</div>
                  <div className="font-medium">{selected.id}</div>
                </div>
                <div className="rounded p-3 bg-[#020509]">
                  <div className="text-xs text-neutral-400">限额</div>
                  <div className="font-medium">{selected.quotaUsed} / {selected.quotaLimit}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <input type="number" value={allocAmount} onChange={(e)=>setAllocAmount(Number(e.target.value))} className="w-40 rounded p-2 bg-neutral-900 text-sm" />
                <button onClick={allocate} className="rounded px-4 py-2 bg-emerald-500 text-black font-semibold">分配</button>
                <button onClick={()=>{ if(selected) viewTenant(selected.id);}} className="rounded px-3 py-2 bg-slate-800 text-sm">刷新</button>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold">审计日志（{logs.length}）</h4>
                <div className="mt-2 max-h-48 overflow-auto bg-neutral-900 rounded p-3 text-sm">
                  {logs.length === 0 && <div className="text-neutral-500">无日志</div>}
                  {logs.map(l => (
                    <div key={l.id} className="mb-2 border-b border-neutral-800 pb-2">
                       <div className="text-xs text-neutral-400">{new Date(l.timestamp).toLocaleString()}</div>
                      <div className="font-medium">{l.action} — {l.actor || '系统'}</div>
                      <div className="text-xs text-neutral-400">{JSON.stringify(l.details || {})}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
