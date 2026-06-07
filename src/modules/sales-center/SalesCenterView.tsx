import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Search, ArrowRight, Calendar, User, Tag, RotateCcw, TrendingUp, DollarSign, Package, AlertCircle } from 'lucide-react';
import { Card, Input, Badge, Button, PageHeader, StatsCard, Table, TableRow, TableCell, Modal, SearchInput } from '../../components/ui';
import { motion, AnimatePresence } from 'motion/react';

export const SalesCenterView: React.FC<{ merchantId: string }> = ({ merchantId }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refundingSale, setRefundingSale] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchSales();
  }, [merchantId]);

  const fetchSales = async () => {
    try {
      const res = await fetch(`/api/sales?merchantId=${merchantId}`);
      const data = await res.json();
      if (data.success) setSales(data.sales);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefund = async () => {
    if (!refundingSale) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/sales/${refundingSale.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason })
      });
      const data = await res.json();
      if (data.success) {
        setRefundingSale(null);
        setRefundReason('');
        fetchSales();
      } else {
        alert(data.error || 'Refund failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const metrics = useMemo(() => {
    const total = sales.reduce((sum, s) => sum + (s.status === 'completed' ? s.totalPrice : 0), 0);
    const count = sales.filter(s => s.status === 'completed').length;
    const refunds = sales.filter(s => s.status === 'refunded').length;
    return { total, count, refunds };
  }, [sales]);

  const filteredSales = sales.filter(s => 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader 
        title="销售中心" 
        subtitle="实时交易流水、全渠道订单管理与自动化对账系统"
        icon={ShoppingCart}
        actions={
          <SearchInput 
            placeholder="搜索订单号、状态..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-72"
          />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard 
          label="累计总额" 
          value={`¥${metrics.total.toLocaleString()}`} 
          icon={DollarSign} 
          color="emerald"
          trend={{ value: '12%', isUp: true }}
        />
        <StatsCard 
          label="完成单量" 
          value={metrics.count} 
          icon={TrendingUp} 
          color="sky"
          trend={{ value: '5%', isUp: true }}
        />
        <StatsCard 
          label="退款单量" 
          value={metrics.refunds} 
          icon={RotateCcw} 
          color="rose"
          trend={{ value: '2%', isUp: false }}
        />
      </div>

      <Table headers={['订单编号', '下单时间', '客户', '商品摘要', '实付金额', '状态', '操作']}>
        {filteredSales.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell className="font-mono font-bold text-sky-400">{sale.id}</TableCell>
            <TableCell className="text-slate-500 text-xs">
              {new Date(sale.createdAt).toLocaleString()}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                  <User className="w-3 h-3" />
                </div>
                <span className="text-xs">散客</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-400">
                  {JSON.parse(sale.items || '[]').length} 项商品
                </span>
              </div>
            </TableCell>
            <TableCell className="font-black text-white">¥{sale.totalPrice.toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant={sale.status === 'completed' ? 'success' : sale.status === 'refunded' ? 'danger' : 'warning'}>
                {sale.status === 'completed' ? '已完成' : sale.status === 'refunded' ? '已退款' : '处理中'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {sale.status === 'completed' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-rose-400 hover:bg-rose-400/10 h-8 text-[10px] px-2"
                    onClick={() => setRefundingSale(sale)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    发起退款
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-sky-400 hover:bg-sky-400/10 h-8 w-8 p-0">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </Table>

      <Modal
        isOpen={!!refundingSale}
        onClose={() => setRefundingSale(null)}
        title="发起销售退款"
      >
        <div className="space-y-6">
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-rose-500">此操作不可逆</p>
              <p className="text-[10px] text-rose-500/70">
                退款将自动回滚库存流水，并从企业钱包中扣除相应金额。
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-slate-500">退款单号</span>
              <span className="text-xs font-mono text-white font-bold">{refundingSale?.id}</span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-slate-500">应退金额</span>
              <span className="text-lg font-black text-white font-mono">¥{refundingSale?.totalPrice.toFixed(2)}</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase px-2">退款原因</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-rose-500/50 outline-none transition-all resize-none h-24"
                placeholder="请输入退款详细原因..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              className="flex-1 h-12 rounded-xl border border-slate-800 text-slate-400"
              onClick={() => setRefundingSale(null)}
            >
              取消
            </Button>
            <Button 
              className="flex-1 h-12 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold shadow-lg shadow-rose-500/20 disabled:opacity-50"
              disabled={isProcessing}
              onClick={handleRefund}
            >
              {isProcessing ? '处理中...' : '确认退款'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
