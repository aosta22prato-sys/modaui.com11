import React, { useState, useEffect } from 'react';
import { 
  Wallet, Landmark, ArrowUpCircle, ArrowDownCircle, History, 
  CreditCard, Link as LinkIcon, Smartphone, Users, Gift, 
  TrendingUp, Star, ShieldCheck, ChevronRight, FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import PaymentGatewayView from '../payment/PaymentGatewayView';
import AIFinanceManagerView from './AIFinanceManagerView';
import CollectionLinkView from './CollectionLinkView';

type FinanceTab = 'overview' | 'collection_links' | 'business_transactions' | 'ai_manager' | 'gateways' | 'reports';

interface FinanceHubViewProps {
  tenantId?: string;
}

export default function FinanceHubView({ tenantId }: FinanceHubViewProps) {
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, [tenantId]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/company/finance', {
        params: { merchantId: tenantId }
      });
      if (res.data.success) {
        setOverview(res.data.account);
        setTransactions(res.data.recentTransactions);
      }
    } catch (err) {
      console.error('Failed to fetch finance overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'overview', name: '财务概览', icon: Wallet, desc: '公司账户资产与流水总览' },
    { id: 'business_transactions', name: '经营流水', icon: History, desc: '全量经营交易明细' },
    { id: 'ai_manager', name: 'AI 财务经理', icon: Star, desc: '💰 刘会计为您提供的智能经营分析' },
    { id: 'collection_links', name: '收款链接', icon: LinkIcon, desc: '快速创建业务收款链接' },
    { id: 'gateways', name: '支付配置', icon: ShieldCheck, desc: '第三方支付网关接入管理' },
    { id: 'reports', name: '财务报表', icon: TrendingUp, desc: '收入、支出与利润深度分析' },
  ];

  return (
    <div className="flex flex-col space-y-6 animate-fadeIn">
      {/* Horizontal Sub-nav */}
      <div className="flex items-center space-x-1 p-1 bg-[#09090B] border border-[#2F3336]/60 rounded-xl overflow-x-auto no-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as FinanceTab)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === item.id
                ? 'bg-[#1D9BF0]/15 border border-[#1D9BF0]/35 text-sky-400 font-bold'
                : 'text-[#8B949E] hover:text-white hover:bg-neutral-900 border border-transparent'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            <span>{item.name}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: '公司账户总余额', value: `¥${overview?.balance?.toLocaleString() || '0.00'}`, trend: '+12%', icon: Wallet, color: 'text-white' },
                { label: '今日经营收入', value: `¥${overview?.earnings?.toLocaleString() || '0.00'}`, trend: '+5%', icon: TrendingUp, color: 'text-emerald-400' },
                { label: '本月预计支出', value: '¥45,000.00', trend: '稳定', icon: ArrowDownCircle, color: 'text-rose-400' },
                { label: '经营净利润', value: '¥128,400', trend: '+18%', icon: Star, color: 'text-sky-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-[#09090B] border border-[#2F3336] p-4 rounded-xl flex flex-col justify-between h-28">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider">{stat.label}</p>
                    <stat.icon className={`w-4 h-4 ${stat.color} opacity-20`} />
                  </div>
                  <span className={`text-xl font-bold font-mono ${stat.color} mt-1`}>{stat.value}</span>
                  <span className="text-[9px] text-[#8B949E] font-mono mt-auto flex items-center space-x-1">
                    <span className={stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}>{stat.trend}</span>
                    <span>较上月同期</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Actions & Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-[#09090B] border border-[#2F3336] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#2F3336] flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">最近经营流水</h3>
                    <button onClick={() => setActiveTab('business_transactions')} className="text-[10px] text-sky-400 hover:underline">查看全部</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-[#0c0c0e] text-[#8B949E] uppercase text-[9px]">
                        <tr>
                          <th className="p-3">时间</th>
                          <th className="p-3">类型</th>
                          <th className="p-3">描述</th>
                          <th className="p-3 text-right">金额</th>
                          <th className="p-3 text-center">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2F3336]/40 text-zinc-300">
                        {transactions.length > 0 ? transactions.map((tx, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 text-[#8B949E]">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded bg-zinc-900 border border-[#2F3336] text-[9px] ${
                                tx.type === 'earning' ? 'text-emerald-400' : 'text-amber-400'
                              }`}>
                                {tx.type === 'income' ? '收入' : tx.type === 'expense' ? '支出' : tx.type === 'earning' ? '收入' : '业务流水'}
                              </span>
                            </td>
                            <td className="p-3 max-w-[200px] truncate">{tx.description}</td>
                            <td className={`p-3 text-right font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`text-emerald-400 text-[9px] font-bold`}>{tx.status}</span>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-[#8B949E] italic">暂无最近经营记录</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="bg-[#09090B] border border-[#2F3336] p-5 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    AI 财务经理提示
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-zinc-900/50 border border-[#2F3336] rounded-lg">
                      <p className="text-[10px] text-[#8B949E] uppercase">刘会计实时洞察</p>
                      <div className="mt-2">
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          "老板，本周利润增长了 <span className="text-emerald-400">18%</span>，主要得益于广告ROI的提升。但库存周转率略有下降，建议适当减少库存积压。"
                        </p>
                        <button 
                          onClick={() => setActiveTab('ai_manager')}
                          className="mt-2 text-[10px] text-sky-400 flex items-center gap-1 hover:underline"
                        >
                          查看详细分析报告 <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button className="w-full py-3 bg-[#1D9BF0] hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  生成今日经营报表
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai_manager' && <AIFinanceManagerView tenantId={tenantId} />}
        {activeTab === 'collection_links' && <CollectionLinkView merchantId={tenantId} />}
        {activeTab === 'gateways' && <PaymentGatewayView tenantId={tenantId} />}
        {activeTab === 'reports' && (
          <div className="flex flex-col items-center justify-center h-[400px] border border-dashed border-[#2F3336] rounded-2xl bg-[#09090B]/50 animate-fadeIn text-center p-8">
            <div className="w-16 h-16 bg-[#1D9BF0]/10 rounded-full flex items-center justify-center mb-4 text-2xl text-sky-400">📊</div>
            <h3 className="text-white font-bold mb-2">深度财务报表重构中</h3>
            <p className="text-xs text-[#8B949E] max-w-md">
              刘会计正在接入多维度的成本核算与ROI分析模型。届时您将能查看到包括库存损耗、广告获客成本及各业务线利润贡献度的详细可视化图表。
            </p>
          </div>
        )}
        {activeTab === 'business_transactions' && (
          <div className="bg-[#09090B] border border-[#2F3336] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2F3336] flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">经营流水明细</h3>
              <div className="flex gap-2">
                <button className="text-[10px] bg-zinc-900 border border-[#2F3336] px-2 py-1 rounded text-[#8B949E]">筛选</button>
                <button className="text-[10px] bg-zinc-900 border border-[#2F3336] px-2 py-1 rounded text-[#8B949E]">导出</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-[#0c0c0e] text-[#8B949E] uppercase text-[9px]">
                  <tr>
                    <th className="p-3">时间</th>
                    <th className="p-3">流水号</th>
                    <th className="p-3">类型</th>
                    <th className="p-3">描述</th>
                    <th className="p-3 text-right">金额</th>
                    <th className="p-3 text-center">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2F3336]/40 text-zinc-300">
                  {transactions.length > 0 ? transactions.map((tx, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 text-[#8B949E]">{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">{tx.id}</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded bg-zinc-900 border border-[#2F3336] text-[9px] ${
                          tx.type === 'earning' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {tx.type === 'income' ? '收入' : tx.type === 'expense' ? '支出' : tx.type === 'earning' ? '收入' : '业务流水'}
                        </span>
                      </td>
                      <td className="p-3 max-w-[200px] truncate">{tx.description}</td>
                      <td className={`p-3 text-right font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-emerald-400 text-[9px] font-bold`}>{tx.status}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#8B949E] italic">暂无流水记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
