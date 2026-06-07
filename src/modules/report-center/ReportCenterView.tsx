import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Calendar, PieChart, Activity, AlertTriangle, History } from 'lucide-react';
import { Card, PageHeader, StatsCard, Table, TableRow, TableCell, Badge, Button } from '../../components/ui';
import { motion } from 'motion/react';

export const ReportCenterView: React.FC<{ merchantId: string }> = ({ merchantId }) => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPurchases: 0,
    netProfit: 0,
    orderCount: 0,
    avgOrderValue: 0
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, [merchantId]);

  const fetchStats = async () => {
    try {
      const [salesRes, purchaseRes, productsRes] = await Promise.all([
        fetch(`/api/sales?merchantId=${merchantId}`).then(r => r.json()),
        fetch(`/api/purchases?merchantId=${merchantId}`).then(r => r.json()),
        fetch(`/api/products?merchantId=${merchantId}`).then(r => r.json())
      ]);

      const sales = salesRes.sales || [];
      const purchases = purchaseRes.purchases || [];
      const products = productsRes.products || [];

      const totalSales = sales.reduce((sum: number, s: any) => sum + (s.status === 'completed' ? s.totalPrice : 0), 0);
      const totalCost = sales.reduce((sum: number, s: any) => {
        if (s.status !== 'completed') return sum;
        const items = JSON.parse(s.items || '[]');
        return sum + items.reduce((isum: number, i: any) => isum + (i.cost || 0) * i.quantity, 0);
      }, 0);

      const totalPurchases = purchases.reduce((sum: number, p: any) => {
        const items = JSON.parse(p.items || '[]');
        return sum + items.reduce((isum: number, i: any) => isum + (i.cost || 0) * i.quantity, 0);
      }, 0);

      setStats({
        totalSales,
        totalPurchases,
        netProfit: totalSales - totalCost,
        orderCount: sales.filter((s: any) => s.status === 'completed').length,
        avgOrderValue: totalSales / (sales.length || 1)
      });

      setRecentSales(sales.slice(0, 5));
      setLowStockProducts(products.filter((p: any) => p.inventory < 10).slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader 
        title="经营报表" 
        subtitle="实时多维经营分析、毛利测算与库存周转预警中心"
        icon={BarChart3}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" className="h-10 border border-slate-800 text-slate-400">
              <Calendar className="w-4 h-4 mr-2" />
              最近30天
            </Button>
            <Button className="h-10 bg-sky-500 hover:bg-sky-400 text-white font-bold">导出数据</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="总销售额" 
          value={`¥${stats.totalSales.toLocaleString()}`} 
          icon={TrendingUp} 
          color="emerald"
          trend={{ value: '12.5%', isUp: true }}
        />
        <StatsCard 
          label="销售净利" 
          value={`¥${stats.netProfit.toLocaleString()}`} 
          icon={DollarSign} 
          color="sky"
          trend={{ value: '8.2%', isUp: true }}
        />
        <StatsCard 
          label="累计采购" 
          value={`¥${stats.totalPurchases.toLocaleString()}`} 
          icon={ShoppingCart} 
          color="amber"
          trend={{ value: '5.2%', isUp: false }}
        />
        <StatsCard 
          label="平均客单价" 
          value={`¥${stats.avgOrderValue.toFixed(2)}`} 
          icon={Activity} 
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-6 bg-slate-950/50 border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-sky-400" />
              销售增长趋势
            </h3>
          </div>
          <div className="h-64 flex items-end justify-between gap-2 px-4">
            {[45, 60, 55, 75, 90, 85, 100].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full bg-sky-500/10 border border-sky-500/20 rounded-t-xl transition-all group-hover:bg-sky-500 group-hover:shadow-lg group-hover:shadow-sky-500/20" style={{ height: `${val}%` }} />
                <span className="text-[10px] text-slate-500 font-mono">06-{i+1}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 bg-rose-500/5 border-rose-500/10">
            <h3 className="text-sm font-black text-rose-500 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              库存预警
            </h3>
            <div className="space-y-4">
              {lowStockProducts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">暂无缺货预警</p>
              ) : (
                lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between border-b border-rose-500/10 pb-3 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{p.sku}</p>
                    </div>
                    <Badge variant="danger" className="text-[10px] px-1.5 py-0">剩 {p.inventory}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6 bg-slate-950/50 border-slate-800">
            <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              最近订单
            </h3>
            <div className="space-y-4">
              {recentSales.map(s => (
                <div key={s.id} className="flex items-center justify-between border-b border-slate-900 pb-3 last:border-0">
                  <div>
                    <p className="text-xs font-mono font-bold text-sky-400">{s.id}</p>
                    <p className="text-[10px] text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-xs font-black text-white">¥{s.totalPrice.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
