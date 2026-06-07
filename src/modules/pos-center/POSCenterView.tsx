import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Trash2, Plus, Minus, CreditCard, User, Package, X, History, Save } from 'lucide-react';
import { Button, Input, Card, Badge, PageHeader, SearchInput, Modal } from '../../components/ui';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  sku: string;
}

interface CartItem extends Product {
  quantity: number;
}

export const POSCenterView: React.FC<{ merchantId: string; userId: string }> = ({ merchantId, userId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(0.05); // Default 5%
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string, name: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [heldOrders, setHeldOrders] = useState<any[]>([]);
  const [showHeldOrders, setShowHeldOrders] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchHeldOrders();
  }, [merchantId]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?merchantId=${merchantId}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchHeldOrders = async () => {
    try {
      const res = await fetch(`/api/pos/held-orders?merchantId=${merchantId}`);
      const data = await res.json();
      if (data.success) {
        setHeldOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch held orders:', err);
    }
  };

  const handleHoldOrder = async () => {
    if (cart.length === 0) return;
    try {
      const order = {
        merchantId,
        userId,
        customerId: selectedCustomer?.id || 'walk-in-customer',
        items: cart,
        subtotal,
        tax: taxAmount,
        total,
      };
      const res = await fetch('/api/pos/held-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      const data = await res.json();
      if (data.success) {
        setCart([]);
        setSelectedCustomer(null);
        fetchHeldOrders();
      }
    } catch (err) {
      console.error('Failed to hold order:', err);
    }
  };

  const handleResumeOrder = async (heldOrder: any) => {
    // If current cart is not empty, ask or just overwrite? Let's just restore for now.
    setCart(heldOrder.items);
    setSelectedCustomer(heldOrder.customerId === 'walk-in-customer' ? null : { id: heldOrder.customerId, name: 'Customer' }); // simplified
    setShowHeldOrders(false);
    
    // Delete from held orders
    try {
      await fetch(`/api/pos/held-orders/${heldOrder.id}`, { method: 'DELETE' });
      fetchHeldOrders();
    } catch (err) {
      console.error('Failed to delete resumed order:', err);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount - discountAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          userId,
          clientId: selectedCustomer?.id || 'walk-in-customer',
          warehouseId: 'default_warehouse',
          items: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
            unitId: 'unit_pcs'
          })),
          taxAmount,
          discountAmount,
          grandTotal: total,
          paymentMethod: 'cash',
          status: 'completed'
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Checkout Successful! Total: ¥${total.toFixed(2)}`);
        setCart([]);
        setDiscountAmount(0);
        fetchProducts(); // Refresh stock
      } else {
        alert('Checkout Failed: ' + data.error);
      }
    } catch (err) {
      alert('Checkout Error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fadeIn">
      <PageHeader 
        title="POS 收银中心" 
        subtitle="高效门店结账、扫码识别与多端同步"
        icon={CreditCard}
        actions={
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              className="relative h-10 px-4 rounded-xl gap-2 border border-slate-800"
              onClick={() => setShowHeldOrders(true)}
            >
              <History className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">挂单列表</span>
              {heldOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-[10px] text-black font-black rounded-full flex items-center justify-center border-2 border-slate-950">
                  {heldOrders.length}
                </span>
              )}
            </Button>
            <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-300">
                {selectedCustomer ? selectedCustomer.name : '散客 (Walk-in)'}
              </span>
              {selectedCustomer && (
                <button onClick={() => setSelectedCustomer(null)} className="text-slate-500 hover:text-rose-400">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Side: Product Selection */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex gap-3">
            <SearchInput 
              placeholder="搜索产品名称、SKU 或条码..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
              {['全部', '热销', '新品', '折扣'].map(cat => (
                <button key={cat} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${cat === '全部' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())).map((product) => (
                <Card 
                  key={product.id} 
                  className="p-3 bg-slate-950/50 border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all group relative overflow-hidden"
                  onClick={() => addToCart(product)}
                >
                  <div className="aspect-square rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 relative overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-slate-700 group-hover:scale-110 transition-transform" />
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant={product.stock > 10 ? 'success' : 'warning'} className="text-[8px] px-1.5 py-0">
                        {product.stock}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white truncate">{product.name}</h4>
                    <p className="text-[10px] font-mono text-slate-500">{product.sku}</p>
                    <p className="text-sm font-black text-sky-400 mt-2">¥{product.price.toFixed(2)}</p>
                  </div>
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Cart & Checkout */}
        <Card className="w-96 flex flex-col bg-slate-950 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-black text-white">当前购物车</h3>
            </div>
            <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/20">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} 件商品
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 opacity-50">
                <ShoppingCart className="w-12 h-12" />
                <p className="text-xs font-medium">购物车是空的</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-3 bg-slate-900/50 border border-slate-800 rounded-2xl group"
                  >
                    <div className="flex gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                          <button onClick={() => removeFromCart(item.id)} className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs font-black text-sky-400">¥{item.price.toFixed(2)}</p>
                          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-mono font-bold text-white w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="p-5 bg-slate-900/50 border-t border-slate-800 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">小计</span>
                <span className="text-slate-300 font-mono">¥{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">税率 ({(taxRate * 100).toFixed(0)}%)</span>
                <span className="text-slate-300 font-mono">¥{taxAmount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-rose-400">
                  <span>优惠金额</span>
                  <span className="font-mono">-¥{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-sm font-bold text-white">应付总额</span>
                <span className="text-2xl font-black text-sky-400 font-mono tracking-tight">¥{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1 h-14 rounded-2xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 font-bold"
                disabled={cart.length === 0 || isProcessing}
                onClick={handleHoldOrder}
              >
                <Save className="w-4 h-4 mr-2" />
                挂单
              </Button>
              <Button 
                className="flex-[2] h-14 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-lg shadow-xl shadow-sky-500/20 disabled:opacity-50 disabled:shadow-none transition-all group"
                disabled={cart.length === 0 || isProcessing}
                onClick={handleCheckout}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>处理中...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>立即结账</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showHeldOrders}
        onClose={() => setShowHeldOrders(false)}
        title="已挂单列表"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {heldOrders.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 opacity-50">
              <History className="w-12 h-12 mb-2" />
              <p>暂无挂单数据</p>
            </div>
          ) : (
            heldOrders.map((order) => (
              <div key={order.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between group hover:border-sky-500/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">#{order.id.slice(-6).toUpperCase()}</span>
                    <Badge variant="outline" className="text-[10px] py-0">{order.items.length} 件商品</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
                  <p className="text-sm font-black text-white">¥{order.total.toFixed(2)}</p>
                </div>
                <Button 
                  onClick={() => handleResumeOrder(order)}
                  className="bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl"
                >
                  恢复订单
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};
