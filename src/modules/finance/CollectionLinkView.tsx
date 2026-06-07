import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Plus, Copy, ExternalLink, Trash2, Clock, Check, X, ShieldAlert, CheckCircle2, ChevronDown, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';

interface CollectionLinkViewProps {
  merchantId?: string;
}

export default function CollectionLinkView({ merchantId = 'default_tenant' }: CollectionLinkViewProps) {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Creation state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CNY');

  useEffect(() => {
    fetchLinks();
  }, [merchantId]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await axios.get('/api/company/collection-links', {
        params: { merchantId }
      });

      if (res.data.success) {
        setLinks(res.data.links);
      }
    } catch (err: any) {
      console.error('Failed to load collection links:', err);
      setErrorMsg('获取收款链接记录失败，请检查服务可用性。');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      setErrorMsg('请填写业务收款场景描述与具体金额。');
      return;
    }
    try {
      setErrorMsg('');
      const res = await axios.post('/api/company/collection-links', {
        merchantId,
        amount: Number(amount),
        currency,
        description: title
      });
      if (res.data.success) {
        setTitle('');
        setAmount('');
        setShowForm(false);
        fetchLinks();
      }
    } catch (err: any) {
      setErrorMsg('创建收款链接失败，请重试。');
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      setErrorMsg('');
      // Using the same endpoint but would need a delete method if we strictly follow REST
      // For now, let's assume we use a post to a delete endpoint as per existing pattern
      const res = await axios.post('/api/company/collection-links/delete', { id });
      if (res.data.success) {
        setLinks(prev => prev.filter(l => l.id !== id));
      }
    } catch (err: any) {
      setErrorMsg('删除业务收款链接失败。');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">业务收款结算链接 (Collection Links)</h2>
          <p className="text-[10px] text-[#8B949E] mt-1">免商城依赖，直发社群、IM或签署文件即可远程收结业务款项</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-3 py-1.5 bg-[#1D9BF0] hover:bg-sky-500 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-lg shadow-[#1D9BF0]/15"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{showForm ? '关闭创建' : '创建新收款'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 text-xs text-left">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Slide down form */}
      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateLink}
            className="bg-[#09090B] border border-[#2F3336] p-6 rounded-2xl space-y-4 text-left overflow-hidden"
          >
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">创建业务收款链接</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#8B949E]">收款名义 / 场景描述</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="例如: 2026年Q2咨询服务预付款" 
                  className="w-full bg-black border border-[#2F3336] rounded-xl py-2 px-3 text-[11px] text-white outline-none focus:border-[#1D9BF0]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#8B949E]">指定收款金额</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="1000.00" 
                  className="w-full bg-black border border-[#2F3336] rounded-xl py-2 px-3 text-[11px] text-white outline-none focus:border-[#1D9BF0]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#8B949E]">结算币种</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)} 
                  className="w-full bg-black border border-[#2F3336] rounded-xl py-2 px-3 text-[11px] text-white outline-none focus:border-[#1D9BF0]"
                >
                  <option value="CNY">CNY (人民币)</option>
                  <option value="USD">USD (美元)</option>
                  <option value="EUR">EUR (欧元)</option>
                  <option value="HKD">HKD (港币)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="px-3 py-1.5 bg-zinc-900 border border-[#2F3336] text-zinc-400 rounded-lg text-[10px] font-bold"
              >
                取消
              </button>
              <button 
                type="submit" 
                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-[10px] font-bold shadow-md"
              >
                确认创建收款账单
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
          <p className="text-[11px] text-[#8B949E] font-mono">同步业务收款链接数据...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {links.length === 0 ? (
            <div 
              onClick={() => setShowForm(true)}
              className="bg-[#09090B] border border-dashed border-[#2F3336] p-12 rounded-xl flex flex-col items-center justify-center text-center space-y-2 opacity-60 hover:opacity-100 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center group-hover:bg-sky-500/10 transition-colors">
                <Plus className="w-6 h-6 text-zinc-500 group-hover:text-sky-400" />
              </div>
              <p className="text-[11px] font-bold text-[#8B949E] group-hover:text-white transition-colors">当前暂无收款链接，点此创建首个业务收款账单</p>
            </div>
          ) : (
            links.map((link) => (
              <div key={link.id} className="bg-[#09090B] border border-[#2F3336] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-sky-500/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-sky-400 border border-[#2F3336]">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{link.description || '业务收款链接'}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-emerald-400 font-bold font-mono">{Number(link.amount).toFixed(2)} {link.currency}</span>
                      <span className="text-[9px] text-[#8B949E] flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5" /> {link.createdAt?.substring(0, 10) || new Date().toISOString().substring(0, 10)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 justify-between md:justify-end">
                  <div className="text-left md:text-center">
                    <p className="text-[9px] text-[#8B949E] uppercase font-mono">状态</p>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase font-mono">{link.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleCopy(link.id, link.url)}
                      className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-[#2F3336] rounded-lg text-sky-400 transition-all cursor-pointer flex items-center justify-center min-w-[36px]" 
                      title="复制收款链接"
                    >
                      {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a 
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-[#2F3336] rounded-lg text-[#8B949E] hover:text-white transition-all cursor-pointer flex items-center justify-center" 
                      title="打开收款页面"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button 
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-2 bg-zinc-900 hover:bg-[#800000]/10 hover:border-red-500/40 rounded-lg text-red-400/60 hover:text-red-400 transition-all cursor-pointer flex items-center justify-center" 
                      title="删除链接"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {links.length > 0 && (
            <div 
              onClick={() => setShowForm(true)}
              className="bg-[#09090B] border border-dashed border-[#2F3336] p-4 rounded-xl flex items-center justify-center text-center space-y-2 opacity-60 hover:opacity-100 transition-all cursor-pointer group"
            >
              <p className="text-[10px] font-bold text-zinc-500 group-hover:text-sky-400 transition-colors flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> 创建新业务收款链接
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
