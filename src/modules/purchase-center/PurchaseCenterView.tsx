import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Plus, Search, Trash2, Package, Truck, Calendar, ArrowRight, RotateCcw, DollarSign, TrendingUp, AlertCircle, Warehouse, Minus } from 'lucide-react';
import { Button, Input, Card, Badge, PageHeader, StatsCard, Table, TableRow, TableCell, Modal, SearchInput, Select } from '../../components/ui';
import { motion, AnimatePresence } from 'motion/react';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  cost: number;
  sku: string;
}

interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  cost: number;
}

export const PurchaseCenterView: React.FC<{ merchantId: string; userId: string }> = ({ merchantId, userId }) => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('default_warehouse');
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [returningPurchase, setReturningPurchase] = useState<any>(null);
  const [returnReason, setReturnReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchProducts();
  }, [merchantId]);

  const fetchPurchases = async () => {
    try {
      const res = await fetch(`/api/purchases?merchantId=${merchantId}`);
      const data = await res.json();
      if (data.success) setPurchases(data.purchases);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSuppliers = async () => {
    const res = await fetch(`/api/suppliers?merchantId=${merchantId}`);
    const data = await res.json();
    if (data.success) setSuppliers(data.suppliers);
  };

  const fetchProducts = async () => {
    const res = await fetch(`/api/products?merchantId=${merchantId}`);
    const data = await res.json();
    if (data.success) setProducts(data.products);
  };

  const handleReturn = async () => {
    if (!returningPurchase) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/purchases/${returningPurchase.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: returnReason })
      });
      const data = await res.json();
      if (data.success) {
        setReturningPurchase(null);
        setReturnReason('');
        fetchPurchases();
      } else {
        alert(data.error || 'Return failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const metrics = useMemo(() => {
    const total = purchases.reduce((sum, p) => sum + (p.status !== 'returned' ? (p.grandTotal || 0) : 0), 0);
    const count = purchases.length;
    const pending = purchases.filter(p => p.status === 'pending').length;
    return { total, count, pending };
  }, [purchases]);

  const filteredPurchases = purchases.filter(p => 
    (p.purchaseNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (suppliers.find(s => s.id === p.supplierId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, cost: product.cost || 0 }];
    });
  };

  const handleCreatePurchase = async () => {
    if (!selectedSupplier || cart.length === 0) return alert('请选择供应商并添加商品');
    
    const grandTotal = cart.reduce((sum, item) => sum + item.cost * item.quantity, 0);
    
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          userId,
          supplierId: selectedSupplier,
          warehouseId: selectedWarehouse,
          items: cart,
          grandTotal,
          status: 'received'
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setIsAdding(false);
        setCart([]);
        fetchPurchases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader 
        title="采购中心" 
        subtitle="管理供应链补货、供应商对账与智能入库管线"
        icon={ShoppingBag}
        actions={
          <>
            <SearchInput 
              placeholder="搜索单号、供应商..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button className="gap-2" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4" />
              创建采购单
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard 
          label="累计采购额" 
          value={`¥${metrics.total.toLocaleString()}`} 
          icon={DollarSign} 
          color="amber"
          trend={{ value: '15%', isUp: true }}
        />
        <StatsCard 
          label="采购总单量" 
          value={metrics.count} 
          icon={TrendingUp} 
          color="sky"
        />
        <StatsCard 
          label="待入库订单" 
          value={metrics.pending} 
          icon={Truck} 
          color="indigo"
        />
      </div>

      <Table headers={['单据编号', '采购日期', '供应商', '摘要', '实付总额', '状态', '操作']}>
        {filteredPurchases.map((purchase) => (
          <TableRow key={purchase.id}>
            <TableCell className="font-mono font-bold text-sky-400">{purchase.purchaseNumber || purchase.id}</TableCell>
            <TableCell className="text-slate-500 text-xs">
              {new Date(purchase.createdAt).toLocaleString()}
            </TableCell>
            <TableCell className="font-bold">
              {suppliers.find(s => s.id === purchase.supplierId)?.name || '未知供应商'}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-400">
                  {JSON.parse(purchase.items || '[]').length} 项商品
                </span>
              </div>
            </TableCell>
            <TableCell className="font-black text-white">¥{(purchase.grandTotal || 0).toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant={purchase.status === 'received' ? 'success' : purchase.status === 'returned' ? 'danger' : 'warning'}>
                {purchase.status === 'received' ? '已收货' : purchase.status === 'returned' ? '已退货' : '待处理'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {purchase.status === 'received' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-amber-400 hover:bg-amber-400/10 h-8 text-[10px] px-2"
                    onClick={() => setReturningPurchase(purchase)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    发起退货
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

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="创建新采购单" size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase px-1">供应商</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                >
                  <option value="">请选择供应商</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase px-1">入库仓库</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white"
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                >
                  <option value="default_warehouse">默认总仓</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase px-1">快速选择商品</label>
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {products.map(p => (
                  <button 
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-slate-950 border border-slate-900 rounded-xl hover:border-sky-500/50 transition-colors"
                    onClick={() => addToCart(p)}
                  >
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">{p.name}</p>
                      <p className="text-[10px] font-mono text-slate-500">{p.sku}</p>
                    </div>
                    <p className="text-xs font-bold text-sky-400">¥{p.cost}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden h-[500px]">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h4 className="text-xs font-black text-white">已选清单 ({cart.length})</h4>
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-slate-500 hover:text-rose-400 h-7 text-[10px]">清空</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center justify-between p-3 bg-slate-900/30 border border-slate-800 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500">¥{item.cost} / 件</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-1 border border-slate-800">
                      <button onClick={() => setCart(prev => prev.map(i => i.productId === item.productId ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-white">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => setCart(prev => prev.map(i => i.productId === item.productId ? {...i, quantity: i.quantity + 1} : i))} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-white">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-900/80 border-t border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold">采购总估额</span>
                <span className="text-xl font-black text-sky-400 font-mono">¥{cart.reduce((sum, item) => sum + item.cost * item.quantity, 0).toFixed(2)}</span>
              </div>
              <Button className="w-full h-12 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-xl shadow-lg shadow-sky-500/20" onClick={handleCreatePurchase}>
                确认提交采购单
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!returningPurchase} onClose={() => setReturningPurchase(null)} title="发起采购退货">
        <div className="space-y-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-500">库存与资金联动</p>
              <p className="text-[10px] text-amber-500/70">退货将从库存中扣除相应 SKU 数量，并将资金退回至企业钱包。</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-slate-500">原采购单号</span>
              <span className="text-xs font-mono text-white font-bold">{returningPurchase?.purchaseNumber || returningPurchase?.id}</span>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase px-2">退货原因</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-amber-500/50 outline-none transition-all resize-none h-24"
                placeholder="请输入退货/退款详细原因 (如：残损、质量不符)..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1 h-12 rounded-xl border border-slate-800 text-slate-400" onClick={() => setReturningPurchase(null)}>取消</Button>
            <Button className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50" disabled={isProcessing} onClick={handleReturn}>
              {isProcessing ? '处理中...' : '确认退货'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
