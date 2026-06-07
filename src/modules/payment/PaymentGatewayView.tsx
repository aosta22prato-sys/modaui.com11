import React, { useState, useEffect } from 'react';
import { 
  CreditCard, ShieldCheck, Zap, RefreshCw, Key, Globe, 
  CheckCircle2, AlertCircle, Trash2, Settings2,
  Lock, ArrowRightLeft, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

interface PaymentGateway {
  id: string;
  name: string;
  code: string;
  logo: string;
  status: boolean;
  withdrawAvailable: boolean;
  currencies: string[];
  credentials: Record<string, string>;
  ipn: boolean;
}

interface PaymentGatewayViewProps {
  tenantId?: string;
}

export default function PaymentGatewayView({ tenantId }: PaymentGatewayViewProps) {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'failed'>>({});
  const [testMessage, setTestMessage] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchGateways();
  }, [tenantId]);

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/company/payment-gateways', {
        params: { merchantId: tenantId }
      });
      if (res.data.success) {
        setGateways(res.data.gateways);
      }
    } catch (err) {
      console.error('Failed to fetch gateways:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (gateway: PaymentGateway) => {
    setTestStatus(prev => ({ ...prev, [gateway.id]: 'testing' }));
    
    try {
      const res = await axios.post(`/api/company/payment-gateways/${gateway.id}/test`);
      setTestStatus(prev => ({ ...prev, [gateway.id]: res.data.success ? 'success' : 'failed' }));
      setTestMessage(prev => ({ 
        ...prev, 
        [gateway.id]: res.data.message || (res.data.success ? '认证成功' : '认证失败')
      }));
    } catch (err) {
      setTestStatus(prev => ({ ...prev, [gateway.id]: 'failed' }));
      setTestMessage(prev => ({ ...prev, [gateway.id]: 'API 连接超时或服务器错误' }));
    }
  };

  const handleToggleStatus = (id: string) => {
    setGateways(prev => prev.map(g => 
      g.id === id ? { ...g, status: !g.status } : g
    ));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#09090B] border border-[#2F3336] p-4 rounded-xl flex flex-col justify-between h-28">
          <p className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">已激活网关</p>
          <span className="text-2xl font-bold text-white mt-1">
            {gateways.filter(g => g.status).length} / {gateways.length}
          </span>
          <div className="flex items-center gap-1.5 mt-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] text-emerald-500 font-mono">运行中 (Live)</span>
          </div>
        </div>

        <div className="bg-[#09090B] border border-[#2F3336] p-4 rounded-xl flex flex-col justify-between h-28">
          <p className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">结算币种</p>
          <span className="text-2xl font-bold text-white mt-1">12</span>
          <span className="text-[9px] text-[#8B949E] font-mono mt-auto">包含 USD, CNY, EUR, NGN...</span>
        </div>

        <div className="bg-[#09090B] border border-[#2F3336] p-4 rounded-xl flex flex-col justify-between h-28">
          <p className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">提现能力</p>
          <span className="text-2xl font-bold text-sky-400 mt-1">已就绪</span>
          <div className="flex items-center gap-1 mt-auto">
            <ArrowRightLeft className="w-2.5 h-2.5 text-[#8B949E]" />
            <span className="text-[9px] text-[#8B949E] font-mono">支持原路退回与定期结算</span>
          </div>
        </div>
      </div>

      {/* Gateway Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {gateways.map((gateway) => (
          <div 
            key={gateway.id} 
            className={`bg-[#09090B] border duration-200 rounded-2xl overflow-hidden group ${
              gateway.status ? 'border-[#2F3336] hover:border-sky-500/50' : 'border-zinc-900 opacity-80'
            }`}
          >
            <div className="p-5 space-y-4">
              {/* Card Head */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl p-2 flex items-center justify-center overflow-hidden">
                    <img src={gateway.logo} alt={gateway.name} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{gateway.name}</h3>
                    <p className="text-[10px] font-mono text-[#8B949E] uppercase tracking-widest">{gateway.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => handleToggleStatus(gateway.id)}
                    className={`w-8 h-4.5 rounded-full relative cursor-pointer transition-colors duration-200 ${
                      gateway.status ? 'bg-sky-500' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-200 ${
                      gateway.status ? 'left-4' : 'left-0.5'
                    }`} />
                  </div>
                  <button 
                    onClick={() => setEditingGateway(gateway)}
                    className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-[#8B949E] hover:text-white transition-colors cursor-pointer"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Capabilities */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  gateway.withdrawAvailable ? 'bg-sky-500/5 border-sky-500/20 text-sky-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'
                }`}>
                  {gateway.withdrawAvailable ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-mono opacity-60">提现支持</span>
                    <span className="text-[10px] font-bold">{gateway.withdrawAvailable ? '可用' : '不支持'}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border bg-zinc-900/50 border-zinc-800 text-zinc-400 flex items-center gap-2">
                  <DollarSign className="w-3 h-3" />
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-mono opacity-60">支持币种</span>
                    <span className="text-[10px] font-bold">{gateway.currencies.length} 种</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <button 
                onClick={() => handleTestConnection(gateway)}
                disabled={testStatus[gateway.id] === 'testing'}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed border border-[#2F3336] hover:border-sky-500/30 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {testStatus[gateway.id] === 'testing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span>验证接口连通性</span>
              </button>

              {/* Test Result Message */}
              <AnimatePresence>
                {testStatus[gateway.id] && testStatus[gateway.id] !== 'idle' && testStatus[gateway.id] !== 'testing' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`p-2.5 rounded-lg border text-[10px] ${
                      testStatus[gateway.id] === 'success' 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/5 border-red-500/20 text-red-400'
                    }`}
                  >
                    {testMessage[gateway.id]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}

        {/* Add New Placeholder */}
        <div className="bg-[#09090B] border border-dashed border-[#2F3336] hover:border-sky-500/50 duration-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-[#8B949E] hover:text-white cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center group-hover:bg-sky-500/10 transition-colors">
            <Globe className="w-6 h-6 group-hover:text-sky-400" />
          </div>
          <div className="text-center">
            <h3 className="text-xs font-bold">接入更多全球网关</h3>
            <p className="text-[10px] mt-1">支持 50+ 种本地化支付方式</p>
          </div>
        </div>
      </div>

      {/* Edit Modal Overlay */}
      <AnimatePresence>
        {editingGateway && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingGateway(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#09090B] border border-[#2F3336] rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-[#2F3336] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg p-1.5">
                    <img src={editingGateway.logo} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">{editingGateway.name} 配置中枢</h2>
                    <p className="text-[10px] text-[#8B949E] font-mono uppercase tracking-wider">Credential Vault</p>
                  </div>
                </div>
                <button onClick={() => setEditingGateway(null)} className="text-[#8B949E] hover:text-white transition-colors cursor-pointer">
                  <Trash2 className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar text-left">
                <div className="space-y-4">
                  {Object.entries(editingGateway.credentials).map(([key, value]) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider ml-1">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                          <Key className="w-3.5 h-3.5" />
                        </div>
                        <input 
                          type={key.includes('secret') || key.includes('key') ? 'password' : 'text'}
                          defaultValue={value}
                          className="w-full bg-black border border-[#2F3336] focus:border-sky-500/50 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white font-mono transition-all outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {editingGateway.ipn && (
                  <div className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-sky-400">
                      <Zap className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">Webhook 回调配置</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      请将以下地址复制到 {editingGateway.name} 开发者后台的 Webhook 设置中。
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-black/50 px-3 py-2 rounded-lg text-[10px] text-sky-400 font-mono border border-sky-500/10 truncate">
                        https://api.modaui.com/api/payments/{editingGateway.id}/callback
                      </code>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-[#2F3336] bg-neutral-950 flex gap-3">
                <button 
                  onClick={() => setEditingGateway(null)}
                  className="flex-1 py-2.5 bg-transparent hover:bg-zinc-900 border border-[#2F3336] rounded-xl text-[11px] font-bold text-white transition-all cursor-pointer"
                >
                  取消
                </button>
                <button 
                  onClick={() => setEditingGateway(null)}
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 rounded-xl text-[11px] font-bold text-white shadow-lg shadow-sky-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  保存安全凭据
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
