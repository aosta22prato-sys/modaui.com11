import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Cpu, 
  Workflow, 
  LayoutTemplate, 
  Coins, 
  Users, 
  Settings, 
  BarChart3 as BarChartIcon, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  Lock, 
  Unlock, 
  Radio, 
  Globe, 
  ShieldAlert, 
  Clock, 
  LogOut, 
  Plus, 
  Trash2, 
  Sliders, 
  DollarSign, 
  Key, 
  Layers, 
  Activity, 
  HelpCircle,
  Menu,
  ChevronRight,
  TrendingUp,
  ShoppingCart,
  Send,
  Mic,
  Image as ImageIcon,
  Sparkles,
  MessageSquare,
  Terminal,
  Bell
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, BarChart, Bar } from 'recharts';
import AuthPanel from './platform-admin/AuthPanel';
import StoreCountCard from './platform-admin/StoreCountCard';
import { apiService, Tenant, AuditLog, UserProfile } from '../services/apiService';
import { Button, Input, Select, Card, Badge } from './ui';

interface PlatformAdminViewProps {
  onBackToLanding: () => void;
  userRole?: 'founder' | 'admin' | 'manager' | 'staff' | 'customer';
  onUpdateRole?: (newRole: 'founder' | 'admin' | 'manager' | 'staff' | 'customer') => void;
  defaultView?: 'platform' | 'system';
  onNavigate?: (action: any) => void;
}

// 24H驻地专家映射表
const activeSpecialistMap: Record<string, {
  name: string;
  role: string;
  emoji: string;
  avatar: string;
  desc: string;
  suggestions: string[];
}> = {
  overview: {
    name: '对账专家 Fiona',
    role: 'AI 全局托管总监',
    emoji: '🧙',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    desc: '监控全局算力与SaaS收益。',
    suggestions: ['查看算力预警', '监控板块排班', '本日入账分析'],
  },
  companies: {
    name: '准入专家 Susan',
    role: 'AI 租户合规经理',
    emoji: '👩‍💼',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
    desc: '负责租户准入与顺丰授权。',
    suggestions: ['一键准入开户', '审查到期租户', '查看已存实例'],
  },
  ai: {
    name: '架构专家 Barton',
    role: 'AI 智体调配总顾问',
    emoji: '🤖',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    desc: '调配智体权重与模型配置。',
    suggestions: ['调整智体权重', '切换智体小队', '重刷班级缓存'],
  },
  finance: {
    name: '财务主管 Fiona',
    role: '金流对账与存储管理',
    emoji: '🧮',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    desc: '审计支付日志与模拟存储。',
    suggestions: ['同步金流对账', '查看存储文件', '审计入账回执'],
  },
  security: {
    name: '安全官 Vance',
    role: '数据资产与权限官',
    emoji: '🕵️',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
    desc: '负责安全审计与权限分配。',
    suggestions: ['切换安全阈值', '激活注册哨所', '更改角色矩阵'],
  },
  system: {
    name: '跟单专家 Cyrus',
    role: '工作流与调度大师',
    emoji: '👨‍🎤',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
    desc: '监控流程调度与并发队列。',
    suggestions: ['模拟 DAG 运行', '重放 CRON 任务', '查看作业监控'],
  }
};

interface CompanyManagementProps {
  companies: any[];
  onUpdateCompany: (corpId: string, updatedFields: any) => Promise<void>;
}

function CompanyManagement({ companies, onUpdateCompany }: CompanyManagementProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
  const [activeEditTab, setActiveEditTab] = useState('basic');

  // Temp editing form values
  const [formName, setFormName] = useState('');
  const [formPlan, setFormPlan] = useState('');
  const [formStatus, setFormStatus] = useState('');
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [formPlugins, setFormPlugins] = useState<string[]>([]);
  const [formAgentLimit, setFormAgentLimit] = useState(6);

  const startEdit = (company: any) => {
    setEditingCompany(company);
    setFormName(company.name);
    setFormPlan(company.plan);
    setFormStatus(company.status);
    setFormFeatures(company.features || []);
    setFormPlugins(company.plugins || []);
    setFormAgentLimit(company.agentLimit || 6);
    setActiveEditTab('basic');
  };

  const handleSave = async () => {
    if (!editingCompany) return;
    setSavingId(editingCompany.id);
    try {
      await onUpdateCompany(editingCompany.id, {
        name: formName,
        plan: formPlan,
        status: formStatus,
        features: formFeatures,
        plugins: formPlugins,
        agentLimit: formAgentLimit
      });
      setSavingId(null);
      setEditingCompany(null);
      
      // Trigger premium success notice
      setShowToast({ show: true, message: `🎉 租户 [${formName}] 的 SaaS 安全授权契约已成功持久化更新！` });
      setTimeout(() => {
        setShowToast({ show: false, message: '' });
      }, 4000);
    } catch (e) {
      console.error(e);
      setSavingId(null);
    }
  };

  const toggleFeature = (key: string) => {
    setFormFeatures(prev => 
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const togglePlugin = (key: string) => {
    setFormPlugins(prev => 
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const filtered = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats Counters
  const activeCount = companies.filter(c => c.status === '运行中').length;
  const totalAgents = companies.reduce((acc, curr) => acc + (curr.agentLimit || 6), 0);

  // Industry color maps matching MODAUI AGENTS.md specs
  const getIndustryColor = (industry: string) => {
    if (industry.includes('服装')) return { bg: 'bg-slate-950 border-slate-900', text: 'text-slate-400', theme: '时尚服装快反' };
    if (industry.includes('餐饮')) return { bg: 'bg-emerald-950/20 border-emerald-900/30', text: 'text-emerald-400', theme: '智慧餐饮外卖' };
    if (industry.includes('百货')) return { bg: 'bg-blue-950/20 border-blue-900/30', text: 'text-blue-400', theme: '跨境出海百货' };
    if (industry.includes('美业')) return { bg: 'bg-rose-950/20 border-rose-900/30', text: 'text-rose-400', theme: '丽人美业沙龙' };
    if (industry.includes('健身')) return { bg: 'bg-cyan-950/20 border-cyan-900/30', text: 'text-cyan-400', theme: '健身运动轻食' };
    if (industry.includes('珠宝')) return { bg: 'bg-purple-950/20 border-purple-900/30', text: 'text-purple-400', theme: '高定珠宝极奢' };
    return { bg: 'bg-zinc-950 border-zinc-900', text: 'text-zinc-400', theme: '通用企业服务' };
  };

  // @ts-ignore
  return (
    <div className="space-y-6 text-xs font-mono">
      {/* Toast Notice Overlay */}
      <AnimatePresence>
        {showToast.show && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#09090D] border border-emerald-500/50 text-emerald-400 px-5 py-3.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{showToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 平台统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#09090C] border border-zinc-900 w-full p-4 flex items-center justify-between shadow-none">
            <div>
            <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">总租户数</span>
            <span className="text-xl font-bold font-sans text-neutral-100 block mt-1">{companies.length}家</span>
          </div>
          <Building2 className="w-8 h-8 text-neutral-600 opacity-60" />
        </Card>

        <Card className="bg-[#09090C] border border-zinc-900 w-full p-4 flex items-center justify-between shadow-none">
            <div>
            <span className="text-[10px] text-emerald-500 font-bold block uppercase tracking-wider">运行实例</span>
            <span className="text-xl font-bold font-sans text-emerald-400 block mt-1">{activeCount} / {companies.length}</span>
          </div>
          <Activity className="w-8 h-8 text-emerald-600/60 opacity-80" />
        </Card>

        <Card className="bg-[#09090C] border border-zinc-900 w-full p-4 flex items-center justify-between shadow-none">
            <div>
            <span className="text-[10px] text-purple-500 font-bold block uppercase tracking-wider">总智体数</span>
            <span className="text-xl font-bold font-sans text-purple-400 block mt-1">{totalAgents}个</span>
          </div>
          <Cpu className="w-8 h-8 text-purple-600/60 opacity-80" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ACTIVE SPU COMPANIES TABLE */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#09090C] border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-900">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-sky-400" /> 租户治理中心 / 资源矩阵 ({filtered.length}家)
              </span>
              
              {/* Filter */}
                <div className="relative max-w-xs w-full shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <Input
                  type="text"
                  placeholder={t('platformAdmin.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* List panel */}
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-900 rounded-xl bg-zinc-950/40 text-zinc-500 italic">
                  {t('platformAdmin.noMatchingTenants')}
                </div>
              ) : (
                filtered.map((c) => {
                  const indColors = getIndustryColor(c.industry);
                  const isEditingThis = editingCompany?.id === c.id;

                  return (
                    <Card
                      key={c.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isEditingThis 
                          ? 'bg-blue-950/10 border-blue-500/40 shadow-lg' 
                          : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800 shadow-none'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 text-sm">{c.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold uppercase select-all">
                              ID: {c.id}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            <span className={`px-2 py-0.5 rounded border ${indColors.bg} ${indColors.text} font-bold text-[9.5px]`}>
                              {indColors.theme}
                            </span>
                            <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-bold font-mono">
                              {c.plan}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${c.status === '运行中' ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30' : 'text-zinc-400 bg-zinc-950/20 border-zinc-900/30'}`}>
                              ● {c.status}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-zinc-900/60 flex flex-wrap gap-x-4 gap-y-1 text-[#8B949E] text-[10px]">
                            <span>🎯 授权特征: <strong className="text-white">{(c.features || []).length} / 8 个</strong></span>
                            <span>📦 嵌入插件: <strong className="text-slate-300">{(c.plugins || []).length} / 8 个</strong></span>
                            <span>🤖 席位限制: <strong className="text-purple-400 font-bold">{c.agentLimit || 6} 席</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <Button
                            onClick={() => startEdit(c)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-[#8B949E] hover:text-white border border-zinc-800 hover:border-zinc-700 py-2 px-3.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5 text-blue-400 font-bold" />
                            <span>{t('platformAdmin.editButton')}</span>
                          </Button>
                        </div>
                      </div>
                      </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE PERMISSION DRAWER / EDIT PANEL */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {!editingCompany ? (
              <motion.div 
                key="empty-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#09090C]/60 border border-zinc-900 border-dashed rounded-xl p-8 text-center text-zinc-500 space-y-3"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto text-zinc-400 border border-zinc-800">
                  <Sliders className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-400">{t('platformAdmin.privilegePanelTitle')}</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 pb-1 leading-relaxed">
                    {t('platformAdmin.privilegePanelDesc')}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="edit-panel"
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 15 }}
                className="bg-[#09090C] border border-[#2F3336]/60 rounded-xl p-5 space-y-5 shadow-2xl"
              >
                {/* Panel Header */}
                <div className="pb-3 border-b border-zinc-900 flex justify-between items-start gap-3">
                  <div>
                    <span className="text-[9px] text-[#8B949E] font-bold tracking-widest block uppercase font-mono">租户授权控制</span>
                    <h4 className="text-sm font-black text-white mt-1 select-all">{formName}</h4>
                  </div>
                  <Badge variant="info" className="text-[9.5px] font-bold px-2 py-0.5">
                    {editingCompany.id}
                  </Badge>
                </div>

                {/* Sub-tabs for editing */}
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-900 overflow-x-auto scrollbar-none gap-1">
                  {[
                    { id: 'basic', label: '基础资料' },
                    { id: 'plan', label: '套餐' },
                    { id: 'plugins', label: '插件' },
                    { id: 'agents', label: 'AI员工' },
                    { id: 'payment', label: '支付' },
                    { id: 'logs', label: '日志' },
                    { id: 'api_limit', label: 'API额度' },
                    { id: 'storage_limit', label: '存储额度' }
                  ].map(tab => (
                    <Button
                      key={tab.id}
                      onClick={() => setActiveEditTab(tab.id)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition shrink-0 cursor-pointer ${
                        activeEditTab === tab.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>

                {/* Content based on activeEditTab */}
                <div className="space-y-4 min-h-[300px]">
                  {activeEditTab === 'basic' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wider">机构名称</label>
                        <Input
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="bg-zinc-950 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wider">运行状态</label>
                        <Select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                        >
                          <option value="运行中">在线运行中</option>
                          <option value="已停单">已停单阻断</option>
                        </Select>
                      </div>
                    </div>
                  )}

                  {activeEditTab === 'plan' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-zinc-500 text-[10px] font-bold block uppercase tracking-wider">订阅档位</label>
                        <Select
                          value={formPlan}
                          onChange={(e) => setFormPlan(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-zinc-700"
                        >
                          <option value="免费试用版">免费试用版</option>
                          <option value="企业尊享版">企业尊享版</option>
                          <option value="定制无限版">定制无限版</option>
                        </Select>
                      </div>
                    </div>
                  )}

                  {activeEditTab === 'plugins' && (
                    <div className="space-y-4 animate-fadeIn">
                      <span className="text-[10px] text-[#8B949E] font-bold tracking-wider block uppercase border-b border-zinc-900 pb-1">插件授权</span>
                      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                        {[
                          { key: 'coupons', label: '营销卡券', desc: '营销裂变' },
                          { key: 'groups', label: '社群拼团', desc: '社交拓客' },
                          { key: 'seckill', label: '整点秒杀', desc: '高并发' },
                          { key: 'distribution', label: '分佣系统', desc: '账单流' },
                          { key: 'voucher', label: '电子礼卡', desc: '预付卡' },
                          { key: 'loyalty', label: '会员CRM', desc: '积分池' },
                          { key: 'presales', label: '预定系统', desc: '意向金' },
                          { key: 'multistore', label: '连锁互联', desc: '多店管理' }
                        ].map(plug => {
                          const isActive = formPlugins.includes(plug.key);
                          return (
                            <div
                              key={plug.key}
                              onClick={() => togglePlugin(plug.key)}
                              className={`p-2 rounded-lg border transition cursor-pointer select-none ${
                                isActive
                                  ? 'bg-emerald-950/10 border-emerald-500/30 text-emerald-400 font-bold'
                                  : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                              }`}
                            >
                              <div className="flex justify-between items-center text-[10px]">
                                <span>{plug.label}</span>
                                <span className={`w-3 h-3 rounded shrink-0 block ${isActive ? 'bg-emerald-500' : 'bg-zinc-900'}`} />
                              </div>
                              <span className="text-[8px] text-[#8B949E] font-normal block mt-0.5 leading-none">{plug.desc}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeEditTab === 'agents' && (
                    <div className="space-y-4 animate-fadeIn">
                      <span className="text-[10px] text-[#8B949E] font-bold tracking-wider block uppercase border-b border-zinc-900 pb-1">岗位授权</span>
                      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                        {[
                          { key: 'designer', label: 'SPU创意', desc: 'Aria主导' },
                          { key: 'selection', label: '爆款选品', desc: 'Nova主导' },
                          { key: 'marketing', label: '营销投放', desc: 'Chloe主导' },
                          { key: 'operation', label: '流转跟单', desc: 'Cyrus主导' },
                          { key: 'financial', label: '财务对账', desc: 'Fiona主导' },
                          { key: 'customer', label: '数字客服', desc: 'Susan主导' },
                          { key: 'livestream', label: '自动直播', desc: '系统自带' },
                          { key: 'legal', label: '合规监控', desc: '系统专享' }
                        ].map(feat => {
                          const isActive = formFeatures.includes(feat.key);
                          return (
                            <div
                              key={feat.key}
                              onClick={() => toggleFeature(feat.key)}
                              className={`p-2 rounded-lg border transition cursor-pointer select-none ${
                                isActive
                                  ? 'bg-blue-950/20 border-blue-500/30 text-blue-400 font-bold'
                                  : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                              }`}
                            >
                              <div className="flex justify-between items-center text-[10px]">
                                <span>{feat.label}</span>
                                <span className={`w-3 h-3 rounded shrink-0 block ${isActive ? 'bg-blue-500' : 'bg-zinc-900'}`} />
                              </div>
                              <span className="text-[8px] text-[#8B949E] font-normal block mt-0.5 leading-none">{feat.desc}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeEditTab === 'payment' && (
                    <div className="space-y-4 animate-fadeIn">
                      <span className="text-[10px] text-[#8B949E] font-bold tracking-wider block uppercase border-b border-zinc-900 pb-1">支付网关</span>
                      <div className="space-y-2">
                        {['Stripe', '支付宝', '微信支付'].map(gate => (
                          <div key={gate} className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
                            <span className="text-xs text-slate-200">{gate}</span>
                            <Badge variant="info" className="text-[9px]">已同步</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeEditTab === 'logs' && (
                    <div className="space-y-4 animate-fadeIn">
                      <span className="text-[10px] text-[#8B949E] font-bold tracking-wider block uppercase border-b border-zinc-900 pb-1">审计日志</span>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {[
                          { time: '06-04 14:20', action: '修改密钥', user: '管理员' },
                          { time: '06-03 10:15', action: '续费套餐', user: '系统' },
                          { time: '06-02 09:30', action: '新增员工', user: '管理员' }
                        ].map((log, i) => (
                          <div key={i} className="p-2 bg-zinc-950 border border-zinc-900 rounded text-[9px]">
                            <div className="flex justify-between text-zinc-500 mb-1">
                              <span>{log.time}</span>
                              <span>{log.user}</span>
                            </div>
                            <div className="text-slate-300 font-bold">{log.action}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeEditTab === 'api_limit' && (
                    <div className="space-y-4 animate-fadeIn">
                      <span className="text-[10px] text-[#8B949E] font-bold tracking-wider block uppercase border-b border-zinc-900 pb-1">算力配额</span>
                      <div className="space-y-4">
                        <div className="space-y-2 bg-zinc-950/40 p-3 rounded-lg border border-zinc-900">
                          <div className="flex justify-between items-center text-[10px] mb-1 font-semibold text-slate-200">
                            <span className="flex items-center gap-1.5 font-bold">智体席位上限:</span>
                            <span className="text-blue-400 font-extrabold">{formAgentLimit} / 20</span>
                          </div>
                          <Input
                            type="range"
                            min="1"
                            max="20"
                            value={formAgentLimit}
                            onChange={(e) => setFormAgentLimit(parseInt(e.target.value))}
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
                            <span className="text-[9px] text-zinc-500 block uppercase">Gemini 额度</span>
                            <span className="text-xs font-bold text-white">150万</span>
                          </div>
                          <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
                            <span className="text-[9px] text-zinc-500 block uppercase">Token 余额</span>
                            <span className="text-xs font-bold text-emerald-400">8.2万</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeEditTab === 'storage_limit' && (
                    <div className="space-y-4 animate-fadeIn">
                      <span className="text-[10px] text-[#8B949E] font-bold tracking-wider block uppercase border-b border-zinc-900 pb-1">存储配额</span>
                      <div className="grid grid-cols-2 gap-2">
                        {['2GB', '10GB', '50GB', '100GB'].map(size => (
                          <div key={size} className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg flex items-center justify-between cursor-pointer hover:border-blue-500 transition">
                            <span className="text-xs text-slate-200">{size}</span>
                            <div className="w-3 h-3 rounded-full border border-zinc-800" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit buttons */}
                <div className="flex space-x-2 pt-2 border-t border-zinc-900 bg-zinc-950/20 p-2.5 rounded-lg">
                  <Button
                    onClick={handleSave}
                    disabled={savingId !== null}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-md shadow-blue-550/10 transition cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {savingId !== null ? '同步中...' : '提交修改'}
                  </Button>
                  <Button
                    onClick={() => setEditingCompany(null)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                  >
                    取消
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function PlatformAdminView({
  onBackToLanding,
  userRole = 'founder',
  onUpdateRole,
  defaultView = 'platform',
  onNavigate
}: PlatformAdminViewProps) {
  const { t } = useTranslation();
  
  // --- NAVIGATION STATE ---
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('platform_active_tab') || 'overview';
  });
  
  const [adminMode, setAdminMode] = useState<'operation' | 'development'>('operation');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [kbSearch, setKbSearch] = useState<string>('');

  const [operationSearchQuery, setOperationSearchQuery] = useState<string>('');

  // --- SUB-SECTIONS STATE ---
  const [selectedSubTab, setSelectedSubTab] = useState<string>('all');
  const [controlCenterMode, setControlCenterMode] = useState<'operation' | 'control' | 'management'>('management');
  
  // Interactive platform alarms state
  const [activeAlarms, setActiveAlarms] = useState<Array<{id: string, name: string, rank: 'CRITICAL' | 'WARNING' | 'INFO', module: string, time: string}>>([
    { id: 'AL-901', name: 'ZARA 服饰存储占用率警告 (>92%)', rank: 'WARNING', module: 'Bucket Storage', time: '刚才' },
    { id: 'AL-902', name: '熊猫出海 API 调用发生退款划拨延迟', rank: 'CRITICAL', module: 'Billing Bridge', time: '12分钟前' },
    { id: 'AL-903', name: '本地 WAF 检测到 12 个境外可疑探针', rank: 'INFO', module: 'WAF Guard', time: '20分钟前' }
  ]);

  // --- PREMIUM CLUSTER PORTAL ENTRANCE STATES ---
const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<{ id: string; username: string; email: string; role: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  const verifySession = async (sid: string) => {
    setIsCheckingAuth(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      });
      const json = await res.json();
      if (json.success && json.user && json.user.role === 'Platform Admin') {
        setAuthUser(json.user);
        setIsAdminAuthenticated(true);
        setAuthError(null);
      } else {
        setSessionId(null);
        setAuthUser(null);
        setIsAdminAuthenticated(false);
        setAuthError(json.error || '未找到有效的管理员会话。');
      }
    } catch (e: any) {
      setSessionId(null);
      setAuthUser(null);
      setIsAdminAuthenticated(false);
      setAuthError(e?.message || '验证会话时发生错误。');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedSessionId = localStorage.getItem('session_token');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      verifySession(storedSessionId);
    } else {
      setIsCheckingAuth(false);
    }
  }, []);

  const handleAuthSuccess = (sid: string) => {
    localStorage.setItem('session_token', sid);
    setSessionId(sid);
    verifySession(sid);
  };

  const handleLogout = async () => {
    if (!sessionId) return;
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (e) {
      console.warn('Logout failed:', e);
    }
    localStorage.removeItem('session_token');
    setSessionId(null);
    setAuthUser(null);
    setIsAdminAuthenticated(false);
  };

  const [authProviders, setAuthProviders] = useState<Array<{id:string; provider:string; label:string; description:string; enabled:boolean; configured:boolean; requiredEnv?: string[]; missingEnv?: string[]}>>([]);
  const [isAuthProviderLoading, setIsAuthProviderLoading] = useState<boolean>(false);
  const [authProviderError, setAuthProviderError] = useState<string | null>(null);

  const loadAuthProviders = async () => {
    setIsAuthProviderLoading(true);
    try {
      const res = await fetch('/api/auth/providers');
      const json = await res.json();
      if (json.success) {
        setAuthProviders(json.providers || []);
        setAuthProviderError(null);
      } else {
        setAuthProviderError(json.error || 'Unable to load auth providers.');
      }
    } catch (e: any) {
      setAuthProviderError(e?.message || 'Unable to load auth providers.');
    } finally {
      setIsAuthProviderLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadAuthProviders();
    }
  }, [isAdminAuthenticated]);

  const toggleAuthProvider = async (providerId: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/auth/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': sessionId || '' },
        body: JSON.stringify({ provider: providerId, enabled }),
      });
      const json = await res.json();
      if (json.success) {
        setAuthProviders(json.providers || []);
      } else {
        console.warn('Failed to update provider', json.error);
      }
    } catch (e) {
      console.warn('Failed to update auth provider', e);
    }
  };

  // --- SUB-TABS & SELECTORS ---
  const [subOverviewTab, setSubOverviewTab] = useState<'finance' | 'bandwidth' | 'waf' | 'buckets'>('finance');
  
  // --- DDOS ATTACK SIMULATOR ---
  const [isUnderDdosAttack, setIsUnderDdosAttack] = useState<boolean>(false);
  const [liveQps, setLiveQps] = useState<number>(380);
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [wafLogs, setWafLogs] = useState<string[]>([]);

  // --- INTERACTIVE BUCKET SYSTEM ---
  const [selectedBucket, setSelectedBucket] = useState<string>('modaui-clothing-assets');
  const [bucketFiles, setBucketFiles] = useState<Record<string, Array<{name: string, size: string, date: string, ext: string, content: string}>>>({
    'modaui-clothing-assets': [
      { name: 'aria_designer_prompt_v4.txt', size: '2.5 KB', date: '2026-06-01', ext: 'TXT', content: 'You are Aria, Custom Design Specialist...\nStandard weight: 0.95. Memory Cache: active.\nTheme: Gold Luxury & Charcoal Elegant.' },
      { name: 'summer_fabric_fast_react.json', size: '1.2 KB', date: '2026-06-03', ext: 'JSON', content: '{\n  "fabricId": "FB-2026",\n  "name": "针织特柔冰丝",\n  "stock": 3500,\n  "suppliers": ["南通面料厂", "绍兴针织库"]\n}' },
      { name: 'sf_delivery_specs.yaml', size: '1.5 KB', date: '2026-05-28', ext: 'YAML', content: 'carrier: SF EXPRESS\nroutes: [SHANGHAI_AIR, BRUSSELS_AIR]\ninsurance: true\npaymentCallback: "https://modaui.com/api/v2/sf-express/tracking"' }
    ],
    'modaui-jewelry-config': [
      { name: 'gold_spot_price_hedge.json', size: '840 B', date: '2026-06-04', ext: 'JSON', content: '{\n  "spotRate": 640.5,\n  "hedgeRatio": 0.82,\n  "lastAudit": "2026-06-04T12:00:00Z"\n}' },
      { name: 'vip_grading_matrix.prompt', size: '1.8 KB', date: '2026-05-15', ext: 'TXT', content: 'Verify diamond clarity GIA grading algorithms.\nReturns valuationMultiplier = 1.15 if cut == "EXCELLENT" and clarity == "VVS1".' }
    ],
    'modaui-core-prompts': [
      { name: 'agent_standard_dag_schema.json', size: '4.8 KB', date: '2026-06-02', ext: 'JSON', content: '{\n  "nodes": ["Aria", "Barton", "Cyrus", "Fiona"],\n  "edges": [\n    {"from": "Aria", "to": "Barton"},\n    {"from": "Barton", "to": "Cyrus"},\n    {"from": "Cyrus", "to": "Fiona"}\n  ]\n}' },
      { name: 'global_firewall_blacklist.txt', size: '150 B', date: '2026-06-04', ext: 'TXT', content: '198.51.100.23\n203.0.113.50\n192.0.2.14\n185.190.140.2' }
    ]
  });
  const [viewingFile, setViewingFile] = useState<any | null>(null);
  const [newFileName, setNewFileName] = useState<string>('');
  const [newFileContent, setNewFileContent] = useState<string>('');

  // --- MULTI-TENANT INSTANTIATION ---
  const [newTenantName, setNewTenantName] = useState<string>('');
  const [newTenantIndustry, setNewTenantIndustry] = useState<string>('服装快反');
  const [newTenantPlan, setNewTenantPlan] = useState<string>('企业尊享版');
  const [newTenantRAM, setNewTenantRAM] = useState<number>(8);
  const [newTenantCPU, setNewTenantCPU] = useState<number>(4);
  const [isProvisioningTenant, setIsProvisioningTenant] = useState<boolean>(false);
  const [tenantProvisionLogs, setTenantProvisionLogs] = useState<string[]>([]);

  // --- PROMPT FACTORY & INTERACTIVE PLAYGROUND ---
  const [promptTemplate, setPromptTemplate] = useState<string>(
    `你是有 MODAUI 行业智脑驱动的虚拟专家 {{ROLE}}\n当前大类分属: {{INDUSTRY}}\n当前处理的业务流程为: {{TASK}}\n请遵守 2026 大促全自动合规算法，产出高阶执行代码。`
  );
  const [promptIndustry, setPromptIndustry] = useState<string>('服装快反');
  const [promptRole, setPromptRole] = useState<string>('创意总监 Aria');
  const [promptTask, setPromptTask] = useState<string>('自动生成大促透气面料推广文案');
  const [promptResult, setPromptResult] = useState<string>('');
  const [isCompilingPrompt, setIsCompilingPrompt] = useState<boolean>(false);

  // --- INTERACTIVE SYSTEM TOOLS PLAYGROUND ---
  const [sfWeight, setSfWeight] = useState<string>('2.5');
  const [sfDest, setSfDest] = useState<string>('北京航空官仓');
  const [goldWeight, setGoldWeight] = useState<string>('12.5');
  const [goldRate, setGoldRate] = useState<string>('640.5');
  const [toolResult, setToolResult] = useState<string>('');

  // --- LONG-TERM VECTOR MEMORY MATRIX ---
  const [vectorQuery, setVectorQuery] = useState<string>('大促黄金套利对冲');
  const [vectorResults, setVectorResults] = useState<Array<{ chunk: string, score: number, coord: string }>>([]);
  const [isVectorSearching, setIsVectorSearching] = useState<boolean>(false);

  // --- WEBSOCKET EVENT HUB ---
  const [wsLogs, setWsLogs] = useState<string[]>([
    '【WS服务】Websocket 广播通信池部署成功。',
    '【WS心跳】[OK] 正常侦听所有 142 个活跃租户 client 会话。'
  ]);
  const [activeWsClients, setActiveWsClients] = useState<number>(142);

  // --- 7 VERTICAL TEAM MATRIX ROSTER ---
  const [selectedIndustryRoster, setSelectedIndustryRoster] = useState<string>('clothing');
  const industryRosters: Record<string, Array<{ name: string, emoji: string, task: string, tokens: string, weight: number }>> = {
    clothing: [
      { name: '创意总监 Aria', emoji: '🎨', task: '潮流海报精美渲染/春装小红书极速快反', tokens: '45K', weight: 95 },
      { name: '供应链 Barton', emoji: '🤖', task: '款式集采/供应商协议自动对冲', tokens: '38K', weight: 90 },
      { name: '物流专家 Cyrus', emoji: '👨‍🎤', task: '顺丰大货专运API/清运清关回调实时核销', tokens: '31K', weight: 85 },
      { name: '智慧营销 Nova', emoji: '📡', task: '商铺直通车裂变/自动抢词调价', tokens: '40K', weight: 88 },
      { name: '量本财务 Jeff', emoji: '🧮', task: '大件实物自动核账/算力Token月扣结算', tokens: '52K', weight: 92 },
      { name: '客户成功 Claire', emoji: '💬', task: '24h过敏及色差事件先行极速理赔', tokens: '29K', weight: 80 }
    ],
    catering: [
      { name: '菜牌创意 Bruce', emoji: '🥦', task: '热销菜品AI研判/季节菜谱自调整发布', tokens: '32K', weight: 91 },
      { name: '物料采销 Sally', emoji: '🥗', task: '农贸合同直连平盘/生鲜供应链对账', tokens: '28K', weight: 89 },
      { name: '送餐调配 Jerry', emoji: '🛵', task: '美团外卖专线/闪送调度/防雨特配派单', tokens: '42K', weight: 87 },
      { name: '私域拓展 Tina', emoji: '📣', task: '社群满返拼单自动生成海报与拉新', tokens: '33K', weight: 86 },
      { name: '金流平准 Fiona', emoji: '🏦', task: 'Stripe餐饮佣金代扣/银行结算流对账', tokens: '41K', weight: 90 },
      { name: '在线品控 Chef', emoji: '🍳', task: '一秒极速赔付餐具破损差评/自动补券', tokens: '25K', weight: 84 }
    ],
    goods: [
      { name: '爆品捕手 Gary', emoji: '📦', task: 'Temu/TikTok高曝光爆款抓取及采购', tokens: '48K', weight: 94 },
      { name: '大宗拼货 Mark', emoji: '🚢', task: '海空集运智能代舱/体积扣算算法拼包', tokens: '39K', weight: 89 },
      { name: '关税批报 Larry', emoji: '🛂', task: '欧洲VAT/北美海关多接口清关预申报', tokens: '35K', weight: 87 },
      { name: '直通投手 Kevin', emoji: '📈', task: 'Google Ads投产QPS/流量定向精采', tokens: '44K', weight: 91 },
      { name: '跨境财务 Tracy', emoji: '💵', task: 'PayPal多币汇率套保/极速出海转账', tokens: '49K', weight: 93 },
      { name: '纠纷化解 Bella', emoji: '🗣️', task: '70国语言无感AI翻译/极速争议退款', tokens: '30K', weight: 85 }
    ],
    beauty: [
      { name: '发式渲染 Stella', emoji: '✂️', task: '春装发型AI拟化/爆款造型同城引路', tokens: '27K', weight: 88 },
      { name: '美耗管理 Henry', emoji: '🧴', task: '沙龙药水洗发水合资批采/耗算配比', tokens: '26K', weight: 85 },
      { name: '座次跟单 Vicky', emoji: '📆', task: '双休日大忙多租户空闲房型爆流拦截', tokens: '29K', weight: 89 },
      { name: '引流总监 Ada', emoji: '📱', task: '抖音团购裂变/美容大促单自动卡券发布', tokens: '38K', weight: 90 },
      { name: '店铺账目 Lily', emoji: '🪙', task: '同城充额度流水平准理账/月季对账', tokens: '35K', weight: 89 },
      { name: '美丽管家 Daisy', emoji: '🌹', task: '常客防遗漏一键高客单促单智能回访', tokens: '22K', weight: 80 }
    ],
    fitness: [
      { name: '私操统配 David', emoji: '🏋️', task: '燃脂私课方案生成/AI形体评估配餐', tokens: '31K', weight: 92 },
      { name: '器械核保 Sam', emoji: '🎽', task: '跑鞋护膝健身包集中套保批量订仓', tokens: '25K', weight: 84 },
      { name: '高峰排期 Eric', emoji: '🕒', task: '私教节假日排期无缝排产/高峰拦截', tokens: '28K', weight: 86 },
      { name: '社群裂变 Joy', emoji: '🤸', task: '马甲线比拼打卡图自动海报发朋友圈', tokens: '39K', weight: 91 },
      { name: '会费管家 Cindy', emoji: '💳', task: '包月连续次卡Stripe自动续扣/异常回退', tokens: '42', weight: 88 },
      { name: '姿态精算 Matrix', emoji: '🦾', task: '视频深蹲/硬拉姿势AI自动打分及回评', tokens: '36K', weight: 85 }
    ],
    jewelry: [
      { name: '高定设计师 Gisele', emoji: '💎', task: '极奢金价对焦/GIA真钻等级多极计算', tokens: '55K', weight: 97 },
      { name: '套保专家 Ryan', emoji: '🔒', task: '上金所对冲锁价/金价变幅差价套保', tokens: '46K', weight: 92 },
      { name: '专机保障 Derek', emoji: '✈️', task: '顺丰航空押运/高端保价高额拦截配送', tokens: '33K', weight: 90 },
      { name: '名媛投放 Leo', emoji: '👑', task: '高定珠宝小众沙龙邀请海报高逼格发布', tokens: '41K', weight: 89 },
      { name: '奢藏平准 Fiona', emoji: '🏛️', task: '异地奢藏库存同步/多币结算月结算', tokens: '58K', weight: 96 },
      { name: '尊礼售后 Alice', emoji: '💍', task: '顶级典当行折价回购认证评估/清洗', tokens: '35K', weight: 88 }
    ],
    home: [
      { name: '美学铺设 Designer', emoji: '🛋️', task: '全屋三维户型自动绘线渲染/软装拼配', tokens: '44K', weight: 93 },
      { name: '林业采供 Sourcing', emoji: '🪵', task: '高级实木供应链直连招租对冲', tokens: '38K', weight: 88 },
      { name: '重货卡运 Transport', emoji: '🚛', task: '重卡货运路线QPS/极速无损配装上门', tokens: '35K', weight: 86 },
      { name: '装潢营销 Marketing', emoji: '🏡', task: '同城样板房智能引流/户型一览发贴', tokens: '40K', weight: 90 },
      { name: '多级财务 Comptroller', emoji: '💹', task: '开工/竣工两级Stripe款项打划锁结', tokens: '46K', weight: 91 },
      { name: '绿色质保 Specialist', emoji: '🔧', task: '装潢甲醛复检预约/理赔保质合同', tokens: '29K', weight: 83 }
    ]
  };

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    type PollFn = () => Promise<void>;
    const fns: PollFn[] = [];

    const loadTenants = async () => {
      try {
        const res = await apiService.getTenants();
        const list = Array.isArray(res) ? res : [];
        setCompanies(list);
        setSelectedCompanyId(prev => {
          if (list.some(c => c.id === prev)) return prev;
          return list.length > 0 ? list[0].id : '';
        });
      } catch (e) {
        console.debug('Failed to fetch tenants', e);
      } finally {
        setLoading(false);
      }
    };

    const loadAudits = async () => {
      try {
        const res = await apiService.getAuditLogs();
        const auditList = Array.isArray(res) ? res : [];
        setCompanyAudits(auditList.slice(0, 10));
      } catch (e) {
        console.debug('Failed to fetch audit logs', e);
      }
    };

    const loadUsers = async () => {
      try {
        const res = await apiService.getUsers();
        const users = Array.isArray(res) ? res : [];
        setUsersList(users);
      } catch (e) {
        console.debug('Failed to fetch users', e);
      }
    };

    const tick = async () => {
      await Promise.all([loadTenants(), loadAudits(), loadUsers()]);
    };

    tick();
    const timer = window.setInterval(tick, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleOnUpdateCompanyFirestore = async (corpId: string, updatedFields: any) => {
    try {
      await apiService.updateTenant(corpId, updatedFields);
      // Local state is updated via subscription or manually if needed
      setCompanies(prev => prev.map(c => {
        if (c.id !== corpId) return c;
        return { ...c, ...updatedFields };
      }));
    } catch (e) {
      console.error("API persistence error in handleOnUpdateCompanyFirestore:", e);
    }
  };

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companyAudits, setCompanyAudits] = useState<any[]>([]);
  const [backendDataMode, setBackendDataMode] = useState<boolean>(true);

  const [specialists, setSpecialists] = useState([
    { role: '创意专家 Aria', spec: '自流文案/春季海报/小红书投产', weight: 95, state: '工作中' },
    { role: '供应链采购 Barton', spec: '款式采集/供应商自动竞价对冲', weight: 90, state: '工作中' },
    { role: '物流履约 Cyrus', spec: '顺丰API连线/空运保价极速拦截', weight: 85, state: '待命中' },
    { role: '智慧营销 Nova', spec: '商铺直通车调优/裂变文案自动分发', weight: 88, state: '工作中' },
    { role: '量本财务 Jeff', spec: '实时分摊划扣/Stripe多维度毛利结算', weight: 92, state: '工作中' },
    { role: '客户成功 Claire', spec: '过敏事件先行赔付/24h智能问答', weight: 80, state: '待命中' },
  ]);

  const [activeCapabilities, setActiveCapabilities] = useState({
    geminiFlow: true,
    sfLogistics: true,
    stripeAccounting: true,
    wechatNotify: true,
    autoAdvertising: false
  });

  const [dagStep, setDagStep] = useState<number>(0);
  const [taskLogs, setTaskLogs] = useState<string[]>([
    '【系统初始化】SaaS 总后台智体监听引擎正常绑定。',
    '【心跳包】多租户 WebSocket 通讯正常建立，延迟 8ms。'
  ]);

  const [workflowTasks, setWorkflowTasks] = useState<any[]>([]);

  const [industryTemplates, setIndustryTemplates] = useState([
    { code: 'clothing', name: '时尚服装快反模板', specialists: 6, nodeType: '高级工作流', rating: '9.8', apps: 420 },
    { code: 'catering', name: '智慧餐饮外卖模板', specialists: 6, nodeType: '本地即开型', rating: '9.6', apps: 310 },
    { code: 'goods', name: '跨境百货大宗模板', specialists: 6, nodeType: '多接口联动型', rating: '9.5', apps: 280 },
    { code: 'beauty', name: '丽人美业沙龙模板', specialists: 5, nodeType: '预约卡券型', rating: '9.4', apps: 195 },
    { code: 'fitness', name: '健身运动轻食模板', specialists: 5, nodeType: '社群裂变型', rating: '9.2', apps: 130 },
    { code: 'jewelry', name: '高定珠宝极奢模板', specialists: 6, nodeType: '全真挂牌型', rating: '9.9', apps: 155 },
    { code: 'home', name: '家居生活整装模板', specialists: 6, nodeType: '大件物流型', rating: '9.3', apps: 88 }
  ]);

  const [billingLogs, setBillingLogs] = useState<any[]>([]);

  const [usersList, setUsersList] = useState<any[]>([]);

  const [apiKeys, setApiKeys] = useState([
    { name: 'GEMINI_API_KEY', key: 'sk_gemini_v4_35_secured_db', hidden: true, host: 'Google AI Studio Client' },
    { name: 'STRIPE_SECRET_KEY', key: 'sk_live_51P_secured_checkout_direct', hidden: true, host: 'Stripe Global Core' },
    { name: 'SF_EXPRESS_APP_ID', key: 'sf_exp_2026_speedy_gateway', hidden: true, host: '顺丰航空货运运载轨' }
  ]);

  const [firewallActive, setFirewallActive] = useState<boolean>(true);
  const [rbacMatrix, setRbacMatrix] = useState<Record<string, Record<string, boolean>>>({
    SUPER_ADMIN: { READ: true, WRITE: true, DESTROY: true },
    TENANT_OWNER: { READ: true, WRITE: true, DESTROY: false },
    AI_SPECIALIST: { READ: true, WRITE: true, DESTROY: false },
    GUEST_CLIENT: { READ: true, WRITE: false, DESTROY: false }
  });

  const [telemetryTime, setTelemetryTime] = useState<string>('');

  const [chartData, setChartData] = useState<Array<{time: string; reqs: number}>>([]);

  // Set real stats timeline for chart mapping
  useEffect(() => {
    const defaultChart = [
      { time: '14:00', reqs: companies.length > 0 ? companies.length * 4 : 0 },
      { time: '16:00', reqs: companies.length > 0 ? companies.length * 8 : 0 },
      { time: '18:00', reqs: companies.length > 0 ? companies.length * 12 : 0 },
      { time: '20:00', reqs: companies.length > 0 ? companies.length * 20 : 0 }
    ];
    setChartData(defaultChart);
  }, [companies.length]);

  // --- AI PARTNERS MEETING CHAT STATE ---
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    { sender: 'ai', text: '您好！我是平台运维协同智脑。当前云端控制系统的 8 大数据子系统已经彻底解算同步完毕，没有依靠任何模拟的桩，直接与 Firestore 云资源连接就绪。请问需要执行什么运维指令？', time: '刚才' }
  ]);
  const [inputText, setInputText] = useState('');

  // --- COLLABORATION WORKFLOW SIMULATION STATE & HANDLER ---
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simLogs, setSimLogs] = useState<Array<{
    id: string;
    emoji: string;
    sender: string;
    time: string;
    type: string;
    message: string;
  }>>([]);

  const runCoCollaborationSim = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimLogs([]);

    const simulationSteps = [
      {
        id: 'sim-1',
        emoji: '🎨',
        sender: '创意总监 Aria',
        time: new Date().toLocaleTimeString(),
        type: 'aria',
        message: '【设计智能决策】大促流量攀升，已自动将「时尚服装快反模板」微调优化，自适应生成 2026 夏季透气面料推广海报并全域发布上线。'
      },
      {
        id: 'sim-2',
        emoji: '🤖',
        sender: '架构专家 Barton',
        time: new Date().toLocaleTimeString(),
        type: 'barton',
        message: '【供应链智能优化】Aria 发布信号触发！已运行采购标准认知权重算法，自动与上游针织面料厂协议价对冲，批量锁定一期现货 3,000 米，物料到位。'
      },
      {
        id: 'sim-3',
        emoji: '👨‍🎤',
        sender: '跟单专家 Cyrus',
        time: new Date().toLocaleTimeString(),
        type: 'cyrus',
        message: '【物流自动履约】物料到位触发航空货运链！已自动通过顺丰 API 申请保价专机直达排产，订舱代号 SF-AIR-2026-06，CallBack 回执正常：Green Stable。'
      },
      {
        id: 'sim-4',
        emoji: '🧮',
        sender: '财务主管 Fiona',
        time: new Date().toLocaleTimeString(),
        type: 'finance',
        message: '【财务全智能账单】顺丰回单触发！Stripe 金流汇合入账结算自动触发，本日 32K 及 118K 各子版年租金扣除完毕，平台净利润 ROI 抬升 3.5%。流水审计无误。'
      }
    ];

    let currentStep = 0;
    // Deliver logs sequentially to provide premium high-fidelity live simulation experience
    const interval = setInterval(() => {
      if (currentStep < simulationSteps.length) {
        const step = {
          ...simulationSteps[currentStep],
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setSimLogs(prev => [...prev, step]);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsSimulating(false);
        }, 1500);
      }
    }, 1500);
  };

  useEffect(() => {
    setTelemetryTime(new Date().toUTCString());
    const timer = setInterval(() => {
      setTelemetryTime(new Date().toUTCString());
    }, 1000);

    const dataTimer = setInterval(() => {
      setChartData(prev => {
        const nextTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const last = prev[prev.length - 1];
        const change = Math.floor((Math.random() - 0.4) * 45);
        const nextReqs = Math.max(100, Math.min(800, last.reqs + change));
        return [...prev.slice(1), { time: nextTime, reqs: nextReqs }];
      });
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(dataTimer);
    };
  }, []);

  const executeDagStep = () => {
    const steps = [
      '【智能分析阶段】第1步: 解析多租户意向与意图分流 (Aria+Nova) — QPS分发就绪',
      '【对账审核阶段】第2步: 理想家开户资质与Stripe收款链绑定 (Fiona+Susan) — 成功授权',
      '【物流联调阶段】第3步: 顺丰速运一键航空舱位 Callback 配比 (Cyrus) — DELIVERED 200',
      '【清盘对账阶段】第4步: Stripe 年度对账账单结算并刷入 Firestore 审计桶 (Fiona) — SLA 归档'
    ];
    setDagStep(prev => (prev + 1) % 4);
    const now = new Date().toLocaleTimeString();
    setTaskLogs(prev => [`[${now}] ${steps[dagStep]}`, ...prev]);
  };

  const handleAuditAction = (id: string, action: 'approve' | 'reject') => {
    const record = companyAudits.find(a => a.id === id);
    if (!record) return;
    if (action === 'approve') {
      const emailDomain = record.name.includes('蜜雪') ? 'honeyice.com' : 'decor.com';
      const cleanIndustry = record.industry;
      const sysModules = cleanIndustry.includes('餐饮') 
        ? ['delivery', 'dinein', 'member', 'inventory'] 
        : ['home_design', 'supply_wood', 'install'];
      
      const newCorp = {
        id: `MODA_${Math.floor(Math.random() * 9000 + 1000)}`,
        name: record.name,
        industry: record.industry,
        plan: '专业高级版',
        status: '运行中',
        specialistCount: 6,
        billingCycle: '2026-06',
        creator: `manager@${emailDomain}`,
        createdAtTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        features: ['designer', 'selection', 'marketing', 'operation', 'financial', 'customer'],
        plugins: ['coupons', 'groups', 'seckill', 'loyalty'],
        industryModules: sysModules,
        agentLimit: 6,
        geminiQuota: 500000,
        openaiQuota: 200000,
        claudeQuota: 100000,
        storageLimit: '20GB'
      };
      setCompanies(prev => [...prev, newCorp]);
      setSelectedCompanyId(newCorp.id); // focus automatically on newly approved company!
    }
    setCompanyAudits(companyAudits.filter(a => a.id !== id));
  };

  const toggleRbac = (role: string, right: string) => {
    setRbacMatrix(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [right]: !prev[role][right]
      }
    }));
  };

  const toggleKeyVisibility = (name: string) => {
    setApiKeys(prev => prev.map(k => k.name === name ? { ...k, hidden: !k.hidden } : k));
  };

  // --- MULTI-TENANT SAAS FEATURE GATING FUNCTIONS ---
  const updateCompanyFeature = (corpId: string, featureKey: string) => {
    setCompanies(prev => prev.map(c => {
      if (c.id !== corpId) return c;
      const features = c.features || [];
      const newFeatures = features.includes(featureKey)
        ? features.filter(f => f !== featureKey)
        : [...features, featureKey];
      return { ...c, features: newFeatures };
    }));
  };

  const updateCompanyPlugin = (corpId: string, pluginKey: string) => {
    setCompanies(prev => prev.map(c => {
      if (c.id !== corpId) return c;
      const plugins = c.plugins || [];
      const newPlugins = plugins.includes(pluginKey)
        ? plugins.filter(p => p !== pluginKey)
        : [...plugins, pluginKey];
      return { ...c, plugins: newPlugins };
    }));
  };

  const updateCompanyIndustryModule = (corpId: string, moduleKey: string) => {
    setCompanies(prev => prev.map(c => {
      if (c.id !== corpId) return c;
      const modules = c.industryModules || [];
      const newModules = modules.includes(moduleKey)
        ? modules.filter(m => m !== moduleKey)
        : [...modules, moduleKey];
      return { ...c, industryModules: newModules };
    }));
  };

  const updateCompanyPlan = (corpId: string, planName: string) => {
    setCompanies(prev => prev.map(c => {
      if (c.id !== corpId) return c;
      
      let features = c.features || [];
      let plugins = c.plugins || [];
      let agentLimit = c.agentLimit || 5;
      let geminiQuota = c.geminiQuota || 500000;
      let openaiQuota = c.openaiQuota || 200000;
      let claudeQuota = c.claudeQuota || 100000;
      let storageLimit = c.storageLimit || '20GB';

      if (planName === '新手体验版' || planName === '基础版') {
        features = ['designer', 'marketing', 'customer'];
        plugins = ['coupons', 'groups'];
        agentLimit = 3;
        geminiQuota = 100000;
        openaiQuota = 50000;
        claudeQuota = 20000;
        storageLimit = '5GB';
      } else if (planName === '专业高级版' || planName === '标准版') {
        features = ['designer', 'selection', 'marketing', 'customer', 'financial'];
        plugins = ['coupons', 'groups', 'seckill', 'voucher'];
        agentLimit = 6;
        geminiQuota = 500000;
        openaiQuota = 200000;
        claudeQuota = 100000;
        storageLimit = '20GB';
      } else if (planName === '企业尊享版' || planName === '企业版') {
        features = ['designer', 'selection', 'marketing', 'operation', 'financial', 'customer', 'livestream'];
        plugins = ['coupons', 'groups', 'seckill', 'distribution', 'voucher', 'loyalty', 'presales'];
        agentLimit = 12;
        geminiQuota = 2000000;
        openaiQuota = 500000;
        claudeQuota = 200000;
        storageLimit = '100GB';
      } else if (planName === '定制无限版' || planName === '集团版' || planName === '定制商户版') {
        features = ['designer', 'selection', 'marketing', 'operation', 'financial', 'customer', 'livestream', 'legal'];
        plugins = ['coupons', 'groups', 'seckill', 'distribution', 'voucher', 'loyalty', 'presales', 'multistore'];
        agentLimit = 20;
        geminiQuota = 99999999;
        openaiQuota = 99999999;
        claudeQuota = 99999999;
        storageLimit = 'Unlimited';
      }

      return {
        ...c,
        plan: planName,
        features,
        plugins,
        agentLimit,
        geminiQuota,
        openaiQuota,
        claudeQuota,
        storageLimit,
        specialistCount: features.length
      };
    }));
  };

  const updateCompanyLimit = (corpId: string, limitKey: 'agentLimit' | 'geminiQuota' | 'openaiQuota' | 'claudeQuota' | 'storageLimit', value: any) => {
    setCompanies(prev => prev.map(c => {
      if (c.id !== corpId) return c;
      return { ...c, [limitKey]: value };
    }));
  };

  const updateCompanyDetailField = (corpId: string, field: string, value: any) => {
    setCompanies(prev => prev.map(c => {
      if (c.id !== corpId) return c;
      return { ...c, [field]: value };
    }));
  };

  // 1. OPERATION MODE DECK RENDERER
  const renderOperationModeDeck = () => {
    // Filter companies based on search query
    const filteredCompanies = companies.filter(c => 
      c.name.toLowerCase().includes(operationSearchQuery.toLowerCase()) ||
      c.industry.toLowerCase().includes(operationSearchQuery.toLowerCase())
    );

    const industryBreakdown = [
      { name: '服装行业', count: companies.filter(c => c.industry === '服装快反').length, color: 'from-amber-500 to-yellow-600', text: 'text-amber-400' },
      { name: '餐饮外卖', count: companies.filter(c => c.industry === '餐饮外卖').length, color: 'from-emerald-500 to-teal-600', text: 'text-emerald-400' },
      { name: '跨境百货', count: companies.filter(c => c.industry === '跨境百货').length, color: 'from-blue-500 to-indigo-600', text: 'text-blue-400' },
      { name: '美业丽人', count: companies.filter(c => c.industry === '美业沙龙').length, color: 'from-rose-500 to-pink-600', text: 'text-rose-400' },
      { name: '运动健身', count: companies.filter(c => c.industry === '运动健身').length, color: 'from-cyan-500 to-sky-600', text: 'text-cyan-400' },
      { name: '高级珠宝', count: companies.filter(c => c.industry === '高定珠宝').length, color: 'from-purple-500 to-violet-600', text: 'text-purple-400' },
    ];

    const totalSpend = companies.reduce((acc, c) => acc + (c.spendAmount || 0), 0) + (companies.length * 1280); 
    const statsOverview = {
      totalCreatedToday: companies.length,
      activeNodes: companies.length * 6,
      monthlyRevenue: `￥${totalSpend.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    };

    // System alarm state triggers based on actual tenant status (e.g. running or balance warning)
    const defaultAlarms: any[] = [];
    companies.forEach((c) => {
      if (c.tokenBalance && c.tokenBalance < 200000) {
        defaultAlarms.push({
          id: `ALM-${c.id.slice(0, 4).toUpperCase()}`,
          time: c.createdAtTime || '12:00',
          level: 'WARN',
          text: `租户 ${c.name} 的 API 预存算力额度较低 (${c.tokenBalance.toLocaleString()} tokens)`
        });
      }
      if (c.status === '已停单') {
        defaultAlarms.push({
          id: `ALM-${c.id.slice(0, 4).toUpperCase()}`,
          time: c.createdAtTime || '12:00',
          level: 'HIGH',
          text: `租户 ${c.name} 的智能值守环境处于[暂停离线]阻断状态`
        });
      }
    });

    if (defaultAlarms.length === 0) {
      defaultAlarms.push({
        id: 'SYS-OK',
        time: '随时',
        level: 'INFO',
        text: 'SaaS 智网调度防火墙和多租户算力负载完美平滑，当前无异常告警。'
      });
    }

    return (
      <React.Fragment>
        {/* LEFT COLUMN PANEL: REGISTRATIONS & MONITORING */}
        <div className="space-y-6">
          
          {/* Card A: 今日创建大盘监控 */}
          <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm hover:border-zinc-700 transition">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">今日新建公司实时大看盘</h3>
              </div>
              <span className="text-[10px] font-mono bg-blue-950/40 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded-full font-bold">
                今日累计: {statsOverview.totalCreatedToday} 家
              </span>
            </div>

            {/* Industry Specific Breakdown Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {industryBreakdown.map((ind, i) => (
                <div key={i} className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-lg hover:border-zinc-800 transition">
                  <span className="text-[10px] text-zinc-500 block font-semibold">{ind.name}</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={`text-lg font-black font-mono ${ind.text}`}>{ind.count}</span>
                    <span className="text-[9px] text-[#8B949E]">家公司</span>
                  </div>
                  {/* Subtle progress indicator */}
                  <div className="w-full bg-zinc-900 h-1 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full" 
                      style={{ width: `${(ind.count / statsOverview.totalCreatedToday) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Companies Creation Timeline Feed */}
            <div className="space-y-3 pt-3 border-t border-zinc-900">
              <span className="text-[10px] text-[#8B949E] font-bold font-mono tracking-wider block uppercase">➔ 近期公司在线注册时间线:</span>
              
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {companies.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-zinc-900 rounded-xl bg-zinc-950/40">
                    <Building2 className="w-8 h-8 text-zinc-700 mx-auto mb-2 opacity-50" />
                    <span className="text-xs text-zinc-500 font-mono">暂无任何真实商家注册节点就绪</span>
                  </div>
                ) : (
                  companies.map((c, idx) => (
                    <div key={idx} className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-[11px] hover:border-zinc-800 transition">
                      <div className="flex items-start gap-2.5">
                        <span className="text-blue-400 font-bold bg-neutral-900 px-1.5 py-0.5 rounded border border-zinc-800/80 text-[10px]">{c.createdAtTime}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{c.name}</span>
                            <span className="text-[9.5px] text-[#8B949E]">({c.industry} 商社)</span>
                          </div>
                          <div className="mt-1 text-[10px] text-zinc-400 flex flex-wrap gap-x-2 gap-y-1">
                            <span>创建人: <strong className="text-zinc-300 font-medium">{c.creator}</strong></span>
                            <span>&bull;</span>
                            <span>行业: <strong className="text-zinc-300 font-medium">{c.industry}</strong></span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800 text-[10px] font-bold font-mono">
                          {c.plan}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.status === '运行中' ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30' : 'text-zinc-400 bg-zinc-950/20 border-zinc-900/30'}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Card B: SDK算力统计与智体分布 (Industry Area Chart) */}
          <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm hover:border-zinc-700 transition">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">智力引擎分部 & 算力消耗占比</span>
              <span className="text-[10px] font-mono text-zinc-500">活跃Agent专家：36 个</span>
            </div>

            <div style={{ width: '100%', height: 160 }} className="pt-2 font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { industry: '服装', activeAgents: 8, tokens: 420 },
                  { industry: '餐饮', activeAgents: 5, tokens: 280 },
                  { industry: '百货', activeAgents: 4, tokens: 360 },
                  { industry: '美业', activeAgents: 3, tokens: 190 },
                  { industry: '健身', activeAgents: 2, tokens: 110 },
                  { industry: '珠宝', activeAgents: 5, tokens: 530 }
                ]}>
                  <XAxis dataKey="industry" stroke="#52525b" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#09090b', borderColor: '#2f3336', fontSize: 10, color: '#e8eaed' }} />
                  <Bar dataKey="tokens" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Token 日消耗 (万)" />
                  <Bar dataKey="activeAgents" fill="#818cf8" radius={[4, 4, 0, 0]} name="激活数" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN PANEL: SEARCH, CONTROLS, AND SYSTEM ALARMS */}
        <div className="space-y-6">
          
          {/* Card C: 企业租户大池列表与直接载入功能 */}
          <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm hover:border-zinc-700 transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-900">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-sky-400" /> 租户公司管控名录 ({filteredCompanies.length}家)
          </span>
              
              {/* Search Bar */}
              <div className="relative max-w-xs w-full shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="搜索企业名称或行业..."
                  value={operationSearchQuery}
                  onChange={(e) => setOperationSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            {/* List scroll panel */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredCompanies.length === 0 ? (
                <div className="text-center py-10 font-mono text-zinc-500 italic text-xs">
                  找不到符合检索条件的公司租户
                </div>
              ) : (
                filteredCompanies.map((c) => {
                  const isCurrentlyActive = selectedCompanyId === c.id;
                  return (
                    <div 
                      key={c.id} 
                      className={`p-3.5 rounded-lg border transition font-mono ${
                        isCurrentlyActive 
                          ? 'bg-indigo-950/20 border-indigo-500/40' 
                          : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 text-xs">{c.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 font-extrabold uppercase">{c.id}</span>
                          </div>
                          
                          <div className="mt-2 text-[10px] text-[#8B949E] flex flex-wrap gap-x-3 gap-y-1">
                            <span>行业: <strong className="text-sky-400">{c.industry}</strong></span>
                            <span>套餐: <strong className="text-zinc-300">{c.plan}</strong></span>
                            <span>专家席: <strong className="text-white">{c.specialistCount || 6}个</strong></span>
                            <span>计费期: <strong className="text-zinc-400">{c.billingCycle}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            onClick={() => {
                              if (onNavigate) {
                                onNavigate({ 
                                  step: 'DASHBOARD', 
                                  industryId: c.industry, // Expecting ind.id like 'fashion'
                                  merchantName: c.name 
                                });
                              }
                            }}
                            className="px-3 py-1.5 rounded text-[10px] font-black cursor-pointer shadow bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 font-mono"
                          >
                            <Play className="w-3 h-3 text-white" />
                            进入后台
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedCompanyId(c.id);
                              setControlCenterMode('control');
                            }}
                            className={`px-3 py-1.5 rounded text-[10px] font-black cursor-pointer shadow transition flex items-center gap-1 font-mono ${
                              isCurrentlyActive 
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/10' 
                                : 'bg-zinc-900 text-[#8B949E] border border-zinc-800 hover:text-white hover:border-zinc-700'
                            }`}
                          >
                            <Sliders className="w-3 h-3 text-indigo-400" />
                            {isCurrentlyActive ? '进入调控' : '载入调控'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm hover:border-zinc-700 transition">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">登录提供商配置</span>
              {isAuthProviderLoading ? (
                <span className="text-[10px] text-zinc-500 font-mono">加载中...</span>
              ) : authProviderError ? (
                <span className="text-[10px] text-rose-400 font-mono">{authProviderError}</span>
              ) : (
                <span className="text-[10px] text-zinc-500 font-mono">控制登录入口</span>
              )}
            </div>
            <div className="space-y-3">
              {authProviders.length === 0 ? (
                <div className="text-xs text-zinc-500">未配置提供商。</div>
              ) : authProviders.map((provider) => (
                <div key={provider.id} className="rounded-xl border border-zinc-900 p-3 bg-zinc-950/80 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{provider.label}</div>
                    <div className="text-[11px] text-zinc-500">{provider.description}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-400">
                      {provider.configured ? '已配置' : '未配置'} • {provider.enabled ? '启用' : '禁用'}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={provider.enabled ? 'secondary' : 'outline'}
                    size="sm"
                    disabled={!provider.configured}
                    onClick={() => toggleAuthProvider(provider.id, !provider.enabled)}
                    className="text-[11px] font-bold px-3 py-2"
                  >
                    {provider.enabled ? '禁用' : provider.configured ? '启用' : '不可用'}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Card D: 联机实时告警与系统健康中心 */}
          <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm hover:border-zinc-700 transition">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-rose-400" /> 安全告警与中枢
              </span>
              <span className="text-[9px] font-mono text-zinc-500">监控：高灵敏度</span>
            </div>

            <div className="space-y-2">
              {defaultAlarms.map((item, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-900 p-3 rounded-lg text-[10.5px] font-mono flex items-start gap-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                    item.level === 'HIGH' ? 'bg-rose-950/40 text-rose-400 border-rose-900/30' :
                    item.level === 'WARN' ? 'bg-amber-950/40 text-amber-400 border-amber-900/30' :
                    'bg-slate-900 text-slate-400 border-zinc-800'
                  }`}>
                    {item.level}
                  </span>
                  <div>
                    <div className="text-zinc-500 flex items-center gap-1.5 pb-0.5">
                      <span>告警编号: {item.id}</span>
                      <span>&bull;</span>
                      <span>时间: {item.time}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-semibold">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  };

  // 2. CONTROL MODE DECK RENDERER
  const renderControlModeDeck = () => {
    const activeCorp = companies.find(c => c.id === selectedCompanyId) || companies[0];

    if (!activeCorp) {
      return (
        <div className="bg-[#09090B] border border-zinc-800 p-8 rounded-xl text-center text-zinc-500 font-mono">
          ⚠️ 暂未检测到活动的租户，请先在 [运营管理集市] 中注册或载入一家企业。
        </div>
      );
    }

    // Initialize or fallback attributes
    const enabledFeatures = activeCorp.enabledFeatures || ['distribution', 'crm'];
    const enabledPlugins = activeCorp.enabledPlugins || ['customer_chat', 'stripe_billing'];
    const enabledModules = activeCorp.enabledModules || ['multi_size', 'sf_contract'];
    const rbacLevel = activeCorp.rbacLevel || 'TENANT_ADMIN';

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-mono text-xs">
        
        {/* PANEL 1: LEFT SIDEBAR (COMPANY DETAILS & STATUS FLOW) - COL SPAN 5 */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 1: 租户详细开户信息更改 */}
          <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm hover:border-zinc-800 transition">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400" /> SECTION 1: 基础资料与开户治理
              </span>
              <span className="text-[10px] bg-indigo-950/40 text-indigo-300 font-bold border border-indigo-900/30 px-1.5 py-0.5 rounded">
                ID: {activeCorp.id}
              </span>
            </div>

            {/* Change Company Name */}
            <div className="space-y-1.5 text-[11px]">
              <label className="text-zinc-500 font-bold block uppercase tracking-wider">🏢 租户注册企业名称 [Corp Name]</label>
              <Input
                type="text"
                value={activeCorp.name}
                onChange={(e) => updateCompanyDetailField(activeCorp.id, 'name', e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-600 font-sans"
              />
            </div>

            {/* Plan Tier Selection buttons */}
            <div className="space-y-1.5">
              <label className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">⭐ 订阅服务套餐资费档位 [SaaS Plan Tier]</label>
              <div className="grid grid-cols-3 gap-2">
                {['普通基础版', '普通标准版', '高级尊贵版'].map(tier => {
                  const isPlanActive = activeCorp.plan === tier;
                  return (
                    <Button
                      key={tier}
                      onClick={() => updateCompanyDetailField(activeCorp.id, 'plan', tier)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer select-none ${
                        isPlanActive
                          ? 'bg-indigo-600 border-indigo-500 text-white font-extrabold shadow shadow-indigo-505/10'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-900 hover:border-zinc-800'
                      }`}
                    >
                      {tier.replace('普通', '')}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Status Flow Selection buttons */}
            <div className="space-y-1.5">
              <label className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">🟢 租户实例运行生命周期 [Instance Lifecycle Status]</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: '运行中', label: '运行中', style: 'activeClass' },
                  { key: '维护挂起', label: '维护中', style: 'maintenanceClass' },
                  { key: '冻结整顿', label: '锁定冻结', style: 'lockedClass' }
                ].map(state => {
                  const isStatusActive = activeCorp.status === state.key;
                  let colorClass = 'border-zinc-900 bg-zinc-950 text-zinc-400';
                  if (isStatusActive) {
                    if (state.key === '运行中') colorClass = 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400 font-bold';
                    if (state.key === '维护挂起') colorClass = 'bg-amber-950/20 border-amber-500/40 text-amber-400 font-bold';
                    if (state.key === '冻结整顿') colorClass = 'bg-rose-950/20 border-rose-500/40 text-rose-400 font-bold';
                  }
                  return (
                    <Button
                      key={state.key}
                      onClick={() => updateCompanyDetailField(activeCorp.id, 'status', state.key)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer select-none ${colorClass}`}
                    >
                      {state.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: 24h高频插件授权 Plugin Enablement */}
          <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm hover:border-zinc-800 transition">
            <div className="pb-2 border-b border-zinc-900">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" /> SECTION 2: 平台核心套件插件授权
              </span>
            </div>

            <div className="space-y-2">
              {[
                { key: 'customer_chat', label: '💬 Active 24小时自动化智能客服弹窗', desc: '在买家端自动部署 6 岗位统一数字客服分身' },
                { key: 'stripe_billing', label: '💳 Stripe 实时自动化计费记账管辖', desc: '管理财务账目与多币种收单结算 DAG 流' },
                { key: 'sf_cargo', label: '✈️ 顺丰空运/保价 API 自动发件合同契约', desc: '启用 SF Express 物流打单对合与索赔机制' }
              ].map(plug => {
                const isPlugEnabled = enabledPlugins.includes(plug.key);
                return (
                  <div
                    key={plug.key}
                    onClick={() => {
                      const nextPlugs = isPlugEnabled
                        ? enabledPlugins.filter(p => p !== plug.key)
                        : [...enabledPlugins, plug.key];
                      updateCompanyDetailField(activeCorp.id, 'enabledPlugins', nextPlugs);
                    }}
                    className={`p-3 rounded-lg border transition cursor-pointer select-none text-[11px] ${
                      isPlugEnabled
                        ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400 font-bold'
                        : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{plug.label}</span>
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                        isPlugEnabled ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-zinc-800'
                      }`}>
                        {isPlugEnabled && '✓'}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#8B949E] mt-1 font-normal leading-relaxed">{plug.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PANEL 2: RIGHT CONTENT SECTIONS - COL SPAN 7 */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 3: 行业定制高发智体模块包 Industry Module Enablement */}
          <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm hover:border-zinc-800 transition">
            <div className="pb-3 border-b border-zinc-900 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-blue-400" /> SECTION 3: 行业定制高发智理模块授权
              </span>
              <span className="text-[10px] font-bold text-sky-400">
                所属大类: {activeCorp.industry}
              </span>
            </div>

            <div className="space-y-2">
              {(() => {
                const ind = activeCorp.industry || '服装';
                let items: { key: string, label: string, desc: string }[] = [];

                if (ind.includes('服装') || ind.includes('Fashion')) {
                  items = [
                    { key: 'multi_size', label: '👕 服装行业：多尺寸/多色板柔性快反仓配矩阵', desc: '支撑多变极速上新 SKU 和分色对账' },
                    { key: 'virtual_makeup', label: '🎨 服装行业：AI AI 试衣海报高透算力节点', desc: '调用 Stable Diffusion 生成高水准产品图' }
                  ];
                } else if (ind.includes('餐饮') || ind.includes('Catering') || ind.includes('Food')) {
                  items = [
                    { key: 'delivery_routing', label: '🛵 餐饮行业：美团/饿了么高灵敏秒级双吐接口', desc: '多并发外卖接单与极速配送调度哨兵' },
                    { key: 'menu_forecast', label: '🥗 餐饮行业：基于节令的排菜与销毁预测算法', desc: '自动估算食材耗损，合理控制冻品储备' }
                  ];
                } else if (ind.includes('珠宝') || ind.includes('Jewelry')) {
                  items = [
                    { key: 'spot_hedge', label: '💎 珠宝行业：上海黄金交易所实时锁金锁价锁单包', desc: '金价波动风险对冲，瞬间规避溢价亏损' },
                    { key: 'gia_valuation', label: '💍 珠宝行业：GIA 裸钻级别动态溢价资产估标', desc: '提供最权威的保值与资产归账记录机制' }
                  ];
                } else if (ind.includes('美业') || ind.includes('Beauty')) {
                  items = [
                    { key: 'salon_sched', label: '💆 美业行业：美团到店排班预约高吞吐哨兵', desc: '调和排钟排卡冲突，锁死技师每日算力' },
                    { key: 'consumables', label: '🧪 美业行业：耗材毫升级自动划扣与防盗报警', desc: '一客一扣，精准管理院线药剂和消耗品' }
                  ];
                } else if (ind.includes('运动') || ind.includes('Fitness')) {
                  items = [
                    { key: 'coach_pool', label: '🏋️ 健身行业：私教流转课酬自动扣账机制', desc: '教练佣金阶梯累提，一键入财务计费' },
                    { key: 'gym_control', label: '🎫 健身行业：闸机物联网高灵敏开卡自动对账', desc: '与人脸门禁深度绑定，避免逃卡和共用' }
                  ];
                } else {
                  items = [
                    { key: 'cross_border', label: '📦 百货行业：跨境多店铺直通车爆品选品池', desc: '跟踪海外风向标，挑选高客单红海 SPUs' },
                    { key: 'stripe_routing', label: '💳 百货行业：全链安全交易防阻断结算模块', desc: '拦截异常商户退款率并保证清算平稳' }
                  ];
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map(it => {
                      const isActive = enabledModules.includes(it.key);
                      return (
                        <div
                          key={it.key}
                          onClick={() => {
                            const nextMods = isActive
                              ? enabledModules.filter(m => m !== it.key)
                              : [...enabledModules, it.key];
                            updateCompanyDetailField(activeCorp.id, 'enabledModules', nextMods);
                          }}
                          className={`p-3.5 rounded-lg border transition cursor-pointer select-none flex flex-col justify-between ${
                            isActive
                              ? 'bg-blue-950/20 border-blue-900/40 text-blue-400 font-bold'
                              : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1 pb-2">
                            <span>{it.label}</span>
                            <span className={`w-3 h-3 rounded shrink-0 block mt-0.5 ${
                              isActive ? 'bg-blue-500' : 'bg-zinc-900'
                            }`} />
                          </div>
                          <p className="text-[9px] text-[#8B949E] font-normal leading-relaxed">{it.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Card 4: 磁盘与API物理算力池容量限额 Hardware Limits & Quotas */}
          <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm hover:border-zinc-800 transition">
            <div className="pb-2 border-b border-zinc-900">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-sky-400" /> SECTION 4: 算力、安全与磁盘配额控制 [Hardware Quotas]
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Left Column: API Limits */}
              <div className="space-y-3.5">
                
                {/* Agent worker Seats allocation */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1 font-semibold text-slate-200">
                    <span>AI 专家智能工席限制:</span>
                    <span className="text-indigo-400 font-bold">{activeCorp.agentLimit || 6} / 20 个专家</span>
                  </div>
                  <Input
                    type="range"
                    min="1"
                    max="20"
                    value={activeCorp.agentLimit || 6}
                    onChange={(e) => updateCompanyLimit(activeCorp.id, 'agentLimit', parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-505"
                  />
                </div>

                {/* Disk Space select */}
                <div>
                  <label className="text-zinc-500 font-bold block mb-1.5 uppercase text-[9px]">🗄️ 平台分配磁盘持久化空间限制</label>
                  <div className="flex gap-1.5">
                    {['5GB', '20GB', '100GB', 'Unlimited'].map(cap => {
                      const isCapActive = activeCorp.storageLimit === cap;
                      return (
                        <Button
                          key={cap}
                          onClick={() => updateCompanyLimit(activeCorp.id, 'storageLimit', cap)}
                          className={`flex-1 py-1 rounded text-[9px] font-bold border transition cursor-pointer select-none ${
                            isCapActive
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-855 hover:border-zinc-800'
                          }`}
                        >
                          {cap}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Key Token Limits */}
              <div className="space-y-2">
                <label className="text-zinc-500 font-bold block mb-1 uppercase text-[9px]">🚀 全链路智能调用最大安全限流 (Token Qps)</label>
                
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded border border-zinc-900">
                    <span className="text-zinc-400">Gemini 1.5 Flash /月</span>
                    <span className="text-sky-400 font-bold">20,000,000 pts</span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded border border-zinc-900">
                    <span className="text-zinc-400">OpenAI API Proxy /月</span>
                    <span className="text-purple-405 font-bold">15,000,000 pts</span>
                  </div>

                  <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded border border-zinc-900">
                    <span className="text-zinc-400">Claude Core SDK /月</span>
                    <span className="text-pink-400 font-bold">5,000,000 pts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: RBAC高级管理员权限降配 & 核心密钥 Root Privileges */}
          <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm hover:border-zinc-800 transition">
            <div className="pb-2 border-b border-zinc-900">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-purple-400" /> SECTION 5: RBAC 高级超级授信与物理多租户隔离
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-slate-300 block font-bold text-[11px]">租户最高鉴权角色层级 [Role Authority]</span>
                <span className="text-[9.5px] text-zinc-505 block">控制数据库独立沙箱与多点负载穿透配置权限</span>
              </div>

              {/* RBAC Selector dropdown */}
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-900">
                {[
                  { key: 'TENANT_ADMIN', label: '高级管理员' },
                  { key: 'SYS_ADMIN_BYPASS', label: 'SAAS 特权绕过' }
                ].map(r => {
                  const isRoleActive = rbacLevel === r.key;
                  return (
                    <Button
                      key={r.key}
                      onClick={() => updateCompanyDetailField(activeCorp.id, 'rbacLevel', r.key)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition cursor-pointer select-none ${
                        isRoleActive
                          ? 'bg-purple-650 text-white shadow shadow-purple-500/10'
                          : 'text-[#8B949E] hover:text-white'
                      }`}
                    >
                      {r.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // SUGGESTION CLICK TRIGGER LOGIC
  const handleSuggestionClick = (msg: string) => {
    const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: msg, time: timeStr };
    setAiMessages(prev => [...prev, userMsg]);
    
    setTimeout(() => {
      const respTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const spec = activeSpecialistMap[activeTab];
      let reply = `[${spec.name}] 正在安全执行指令: "${msg}"...\n➔ 直连底层连线：操作已审计并生效。模块状态：GREEN_STABLE.`;
      
      if (msg.includes('32K')) {
        reply = `[Fiona] Stripe 实时计费流解扣检测成功！模拟 32,000.00 元账单已经入账。对账记录 TX-${Math.floor(Math.random()*80000)+10000} 已自动在本地归账。`;
        const nowStr = new Date().toLocaleTimeString();
        setBillingLogs(prev => [{ id: `TX-${Math.floor(Math.random()*80000)+10000}`, customer: 'ZARA 服饰', amount: '￥32,000.00', desc: '模拟计费入账 (专家触发)', date: nowStr }, ...prev]);
      } else if (msg.includes('理想家')) {
        reply = `[Susan] 理想家全屋家居定制 会员身份/开户申请准入审计通过。已为您部署 [🛋️ 家居生活整装模板] 以及 6 大岗位专属智脑。`;
        setCompanies(prev => [...prev, {
          id: `MODA_${Math.floor(Math.random() * 9000 + 1000)}`,
          name: '理想家全屋家居定制',
          industry: '家居生活',
          plan: '专业高级版',
          status: '运行中',
          specialistCount: 6,
          billingCycle: '2026-06'
        }]);
        setCompanyAudits(prev => prev.filter(c => !c.name.includes('理想家')));
      } else if (msg.includes('单步 DAG')) {
        reply = `[Cyrus] 分发执行运行流！当前步进第 ${((dagStep + 1) === 4 ? 4 : (dagStep + 1))} 阶段正常。`;
        executeDagStep();
      } else if (msg.includes('DDoS')) {
        reply = `[Vance] 激活全局 DDoS 防盾并配置硬连接硬熔断。系统审计阻断灵敏度上调。`;
        setFirewallActive(true);
      } else if (msg.includes('Aria')) {
        reply = `[Barton] RIA 创意专家认知权重由 95% 置顶调配至 99%。小红书文案与穿搭海报生成优先占用 GPU 算力通道。`;
        setSpecialists(prev => prev.map(s => s.role.includes('Aria') ? { ...s, weight: 99 } : s));
      } else if (msg.includes('QPS')) {
        reply = `[Fiona] 本季度并发处于绿区安全水位，平均 QPS 保持在 340-380区间，暂无熔断降级必要。`;
      }
      
      setAiMessages(prev => [...prev, { sender: 'ai' as const, text: reply, time: respTime }]);
    }, 700);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const msg = inputText.trim();
    setInputText('');
    handleSuggestionClick(msg);
  };

  const currentSpecialist = activeSpecialistMap[activeTab] || activeSpecialistMap.overview;

  // --- PROPRIETOR SECURITY GATE / 平台老板入口 ---
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050507] text-white flex flex-col items-center justify-center p-4 selection:bg-[#1D9BF0] selection:text-white relative overflow-hidden">
        {/* Cyber coordinate grids background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0c11_1px,transparent_1px),linear-gradient(to_bottom,#0c0c11_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-40" />
        
        {/* Ambient neon radial glows */}
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-lg z-10 space-y-6">
          
          {/* Main platform logo and title group */}
          <div className="text-center space-y-3.5">
            <motion.div 
               initial={{ rotate: -15, scale: 0.9 }}
               animate={{ rotate: 0, scale: 1 }}
               className="mx-auto w-14 h-14 bg-gradient-to-tr from-amber-500 via-yellow-405 to-[#1D9BF0] rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/10 border border-amber-500/30"
            >
               <Terminal className="w-7 h-7 text-black stroke-[2.5]" />
            </motion.div>
            
            <div className="space-y-1.5">
               <div className="inline-flex items-center space-x-1.5 py-1 px-3.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                 <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                 <span className="text-[10px] font-bold font-mono tracking-wider text-amber-400 uppercase">PLATFORM ADMIN LOGIN</span>
               </div>
               <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
                 MODAUI 平台控制中心
               </h1>
               <p className="text-xs font-semibold text-zinc-400 max-w-sm mx-auto leading-relaxed">
                 使用真实管理员账号登录，进入平台后台。
               </p>
            </div>
          </div>

          {/* Glowing obsidian security container */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#09090D] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
          >
                {isCheckingAuth ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-center text-sm text-slate-300">
                {t('platformAdmin.checkingAuth')}
              </div>
            ) : (
              <>
                {authError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-900/35 text-rose-300 text-xs rounded-xl font-semibold leading-relaxed">
                    ⚠️ {authError}
                  </div>
                )}
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">真实登录认证</p>
                  <div className="text-sm text-zinc-300 leading-relaxed">
                    请输入管理员邮箱和密码登录；未注册则可直接创建管理员账号。
                  </div>
                </div>
                <AuthPanel onAuthSuccess={handleAuthSuccess} />
                {sessionId && (
                  <Button
                    type="button"
                    onClick={handleLogout}
                    className="w-full bg-rose-500 hover:bg-rose-400 text-black text-xs font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all duration-150"
                  >
                    退出当前会话
                  </Button>
                )}
              </>
            )}
          </motion.div>

          {/* Quick exit footer */}
          <div className="flex items-center justify-between px-4 text-xs text-zinc-500">
            <Button
              type="button"
              onClick={onBackToLanding}
              className="hover:text-white transition duration-155 cursor-pointer font-medium"
            >
              ← 返回官方首页
            </Button>
            <span className="font-mono text-[10px] tracking-wide text-zinc-600">SaaS Node: Cluster-A-CN</span>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-[#E8EAED] font-sans flex flex-col lg:flex-row overflow-x-hidden selection:bg-blue-600 selection:text-white">
      
      {/* 1. LEFT SIDEBAR: NAVIGATION MENU */}
      <aside className={`fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0 h-screen flex flex-col w-64 bg-[#09090B] border-r border-[#2F3336]/60 p-5 shrink-0 transition-transform duration-300 transform ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        
        {/* Logo Container */}
        <div className="flex items-center gap-3 pb-6 border-b border-[#2F3336]/60">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-white">操作菜单</h1>
            <p className="text-[9px] text-[#8B949E] leading-none mt-0.5">系统控制台</p>
          </div>
        </div>

        {/* 8 Core Navigation Items */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto scrollbar-none">
          <div className="px-3 mb-4">
            <div className="flex bg-neutral-950 p-1 rounded-xl border border-[#2F3336]/60">
              <button
                onClick={() => {
                  setAdminMode('operation');
                  setActiveTab('overview');
                }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  adminMode === 'operation' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                运营模式
              </button>
              <button
                onClick={() => {
                  setAdminMode('development');
                  setActiveTab('database');
                }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  adminMode === 'development' ? 'bg-amber-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                开发模式
              </button>
            </div>
          </div>

          <span className="text-[10px] font-bold text-zinc-500 tracking-wider block mb-2 px-3">
            {adminMode === 'operation' ? '主控页面' : '技术底座'}
          </span>
          {(adminMode === 'operation' ? [
            { id: 'overview', label: '📊 总览', icon: BarChartIcon },
            { id: 'companies', label: '🏢 AI公司', icon: Building2 },
            { id: 'ai_team', label: '🤖 AI团队', icon: Cpu },
            { id: 'orders', label: '📦 订单中心', icon: ShoppingCart },
            { id: 'customers', label: '👥 客户中心', icon: Users },
            { id: 'finance', label: '💰 财务中心', icon: Coins },
            { id: 'analytics', label: '📈 数据分析', icon: TrendingUp },
            { id: 'system_messages', label: '✉️ 系统消息', icon: Bell }
          ] : [
            { id: 'database', label: '🗄️ 数据库', icon: Layers },
            { id: 'sse', label: '📡 SSE状态', icon: Activity },
            { id: 'api_monitor', label: '🚀 API监控', icon: Sliders },
            { id: 'workflow', label: '🕸️ 工作流', icon: Workflow },
            { id: 'agent_debug', label: '🤖 Agent调试', icon: Terminal },
            { id: 'prompt_debug', label: '📝 Prompt调试', icon: MessageSquare },
            { id: 'logs', label: '📑 系统日志', icon: Sliders },
            { id: 'nodes', label: '💻 节点监控', icon: Cpu },
            { id: 'system_config', label: '⚙️ 系统配置', icon: Settings }
          ]).map(item => {
            const Icon = (item as any).icon;
            const isSelected = activeTab === item.id;
            return (
              <Button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left cursor-pointer ${
                  isSelected 
                    ? adminMode === 'operation' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10 font-bold' : 'bg-amber-600 text-white shadow-md shadow-amber-600/10 font-bold'
                    : 'text-[#8B949E] hover:bg-neutral-900 hover:text-white font-medium'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/10 text-white' : 'bg-neutral-800 text-[#8B949E]'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs">{item.label}</span>
              </Button>
            );
          })}

          <div className="h-[1px] bg-[#2F3336]/60 my-3" />
          
          <span className="text-[10px] font-bold text-zinc-500 tracking-wider block mb-2 px-3">
            快速跳转
          </span>
          <div className="grid grid-cols-2 gap-1.5 px-2">
            <Button
              onClick={() => onNavigate?.({ step: 'LANDING' })}
              className="flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-[#8B949E] hover:text-white text-[11px] font-bold border border-zinc-800/10 transition cursor-pointer"
            >
              <span>🏠</span>
              <span>主页</span>
            </Button>
            <Button
              onClick={() => onNavigate?.({ step: 'CUSTOMER_STOREFRONT' })}
              className="flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg bg-red-950/15 hover:bg-red-950/35 text-rose-450 hover:text-rose-200 text-[11px] font-bold border border-red-950/20 transition cursor-pointer"
            >
              <span>🛒</span>
              <span>前台</span>
            </Button>
            <Button
              onClick={() => onNavigate?.({ step: 'DASHBOARD' })}
              className="flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg bg-emerald-950/15 hover:bg-emerald-950/35 text-emerald-450 hover:text-emerald-200 text-[11px] font-bold border border-emerald-900/20 transition cursor-pointer"
            >
              <span>💼</span>
              <span>后台</span>
            </Button>
            <Button
              className="flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg bg-blue-600/15 text-blue-300 text-[11px] font-extrabold border border-blue-500/20 cursor-default select-none"
            >
              <span>👑</span>
              <span>总管</span>
            </Button>
          </div>
        </nav>

        {/* Sidebar Footer Info */}
        <div className="mt-auto bg-black/40 rounded-xl p-3 border border-[#2F3336]/60 text-[9px] font-mono text-[#8B949E] space-y-1">
          <div className="flex items-center justify-between">
            <span>底座信息:</span>
            <span className="text-blue-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>运行时间:</span>
            <span className="text-zinc-300">24H</span>
          </div>
          <div className="flex items-center justify-between">
            <span>底座SLA:</span>
            <span className="text-emerald-400">99.98%</span>
          </div>
        </div>

      </aside>

      {/* Mobile Backdrop Drawer */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* 2. MIDDLE COLUMN: CENTRAL WORKSPACE HUB */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#050507]">
        
        {/* Navigation Dark Header */}
        <header className="bg-[#09090B] border-b border-[#2F3336]/65 py-4 px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xl">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-400 hover:text-white lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-[#8B949E] tracking-wider">
                <span>管理系统</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-blue-400">
                  {activeTab === 'overview' && '平台总览'}
                  {activeTab === 'companies' && '租户中心'}
                  {activeTab === 'ai' && 'AI中心'}
                  {activeTab === 'finance' && '财务中心'}
                  {activeTab === 'security' && '安全中心'}
                  {activeTab === 'system' && '系统中心'}
                </span>
                <span className="mx-2 select-none text-zinc-700">&bull;</span>
                <span className="text-[10px] text-zinc-500">负责人: {currentSpecialist.name.split(' ').pop()}</span>
              </div>
              <h2 className="text-sm font-extrabold text-white mt-0.5 flex items-center gap-1.5 font-sans tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>MODAUI 统合总控制台</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-right text-[9px] text-[#8B949E] leading-tight">
              <span className="text-white font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" />
                {telemetryTime || 'Thu, 04 Jun 2026 02:59 UTC'}
              </span>
              <span>管理员</span>
            </div>
            
            <div className="h-6 w-[1px] bg-[#2F3336]/60 hidden sm:block" />

            {/* 当前登录用户信息 */}
            {authUser ? (
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-left">
                  <div className="font-bold text-white">{authUser.username}</div>
                  <div className="text-slate-500">{authUser.email}</div>
                  <div className="text-[10px] text-emerald-400 uppercase tracking-widest">{authUser.role}</div>
                </div>
                <Button
                  onClick={handleLogout}
                  className="rounded-lg bg-rose-500 hover:bg-rose-400 text-black px-3 py-1.5 text-xs font-bold transition"
                >
                  退出
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setIsCheckingAuth(false)}
                className="rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-[#2F3336]/60 text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer"
              >
                登录中...
              </Button>
            )}

            <Button
              onClick={onBackToLanding}
              className="rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-[#2F3336]/60 text-white px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>退出系统</span>
            </Button>
          </div>
        </header>

        {/* MIDDLE CONTENT PANEL */}
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto flex-1 overflow-y-auto scrollbar-none">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >

              {/* 📊 1. DATA TELEMETRY & SECURITY FIREWALL (SaaS数据监控与防WAF) */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in text-[#E8EAED]">
                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {adminMode === 'operation' ? [
                      { label: '今日收入', val: '￥8.2万', desc: '净利 +18%', color: 'text-emerald-400' },
                      { label: '今日订单', val: '1,240笔', desc: '转化 4.2%', color: 'text-blue-400' },
                      { label: '新增客户', val: '+35位', desc: '增长 +12%', color: 'text-indigo-400' },
                      { label: '利润', val: '￥1.85万', desc: '环比 +5.2%', color: 'text-amber-400' },
                      { label: 'AI团队状态', val: '运行中', desc: '6位智体在线', color: 'text-purple-400' },
                      { label: '待处理事项', val: '12项', desc: '需人工介入', color: 'text-rose-400' },
                      { label: '总租户', val: String(companies.length), desc: '已入驻商户', color: 'text-slate-400' },
                      { label: '系统状态', val: '运行稳定', desc: 'SLA 99.9%', color: 'text-emerald-500' }
                    ].map((m, idx) => (
                      <div key={idx} className="bg-[#09090B] border border-[#2F3336]/60 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700 transition">
                        <span className="text-[10px] font-bold text-zinc-500 tracking-wider block">{m.label}</span>
                        <div className={`text-xl md:text-2xl font-black tracking-tight my-2 ${m.color}`}>{m.val}</div>
                        <span className="text-[9px] text-[#8B949E] leading-none block font-semibold">{m.desc}</span>
                      </div>
                    )) : [
                      { label: '通讯链路', val: `${activeWsClients}个`, desc: '延时 8ms', color: 'text-indigo-400' },
                      { label: '流量监控', val: isUnderDdosAttack ? '1.2万 QPS' : '380 QPS', desc: firewallActive ? '防护中' : '未拦截', color: isUnderDdosAttack ? 'text-amber-400 animate-pulse' : 'text-slate-400' },
                      { label: '在线节点', val: String(companies.length * 6), desc: '36位专家执勤', color: 'text-blue-400' },
                      { label: '提现总额', val: '￥16.8万', desc: '托管池已就绪', color: 'text-emerald-400' }
                    ].map((m, idx) => (
                      <div key={idx} className="bg-[#09090B] border border-[#2F3336]/60 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-700 transition">
                        <span className="text-[10px] font-bold text-zinc-500 tracking-wider block">{m.label}</span>
                        <div className={`text-xl md:text-2xl font-black tracking-tight my-2 ${m.color}`}>{m.val}</div>
                        <span className="text-[9px] text-[#8B949E] leading-none block font-semibold">{m.desc}</span>
                      </div>
                    ))}
                  </div>

                  {adminMode === 'operation' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Business Trends */}
                      <div className="lg:col-span-8 bg-[#09090B] rounded-xl border border-[#2F3336]/60 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#8B949E] tracking-widest">业务增长趋势</span>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-[9px]">收入</Badge>
                            <Badge variant="outline" className="text-[9px]">订单</Badge>
                          </div>
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="colorReqs" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#1D9BF0" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#1D9BF0" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#09090B', border: '1px solid #2F3336', borderRadius: '8px', fontSize: '10px' }}
                                itemStyle={{ color: '#1D9BF0' }}
                              />
                              <Area type="monotone" dataKey="reqs" stroke="#1D9BF0" fillOpacity={1} fill="url(#colorReqs)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Team Status */}
                      <div className="lg:col-span-4 bg-[#09090B] rounded-xl border border-[#2F3336]/60 p-5 space-y-4">
                        <span className="text-xs font-bold text-[#8B949E] tracking-widest block">AI团队健康度</span>
                        <div className="space-y-4">
                          {[
                            { name: 'CEO Agent', status: '在线', load: '12%', color: 'bg-emerald-500' },
                            { name: '运营 Agent', status: '忙碌', load: '85%', color: 'bg-amber-500' },
                            { name: '营销 Agent', status: '在线', load: '45%', color: 'bg-emerald-500' },
                            { name: '客服 Agent', status: '在线', load: '22%', color: 'bg-emerald-500' }
                          ].map((agent, i) => (
                            <div key={i} className="space-y-1.5">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-white font-bold">{agent.name}</span>
                                <span className="text-zinc-500">{agent.load}</span>
                              </div>
                              <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                                <div className={`h-full ${agent.color}`} style={{ width: agent.load }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {adminMode === 'development' && (
                    <div className="grid grid-cols-1 gap-6">
                      <div className="bg-[#09090B] rounded-xl border border-[#2F3336]/60 p-8 text-center text-sm text-[#8B949E]">
                        开发模式面板正在维护中，当前仅显示最小化监控视图。
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 🏢 2. TENANT INSTANCES (店铺租户实例与开户审核) */}

              {/* 🏢 2. TENANT INSTANCES (店铺租户实例与开户审核) */}
              {activeTab === 'companies' && (
                <div className="space-y-6">
                  {/* Modern Tab Bar Selector */}
                  <div className="flex bg-zinc-950 border border-zinc-800 p-1 rounded-xl overflow-x-auto scrollbar-none gap-1">
                    {[
                      { id: 'all', label: '全部' },
                      { id: 'clothing', label: '服装' },
                      { id: 'catering', label: '餐饮' },
                      { id: 'goods', label: '百货' },
                      { id: 'beauty', label: '美业' },
                      { id: 'hotel', label: '酒店' },
                      { id: 'influencer', label: '网红' }
                    ].map(tab => (
                      <Button
                        key={tab.id}
                        onClick={() => setSelectedSubTab(tab.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                          selectedSubTab === tab.id ? 'bg-blue-600 text-white' : 'text-[#8B949E] hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>

                  {(selectedSubTab === 'all' || ['clothing', 'catering', 'goods', 'beauty', 'hotel', 'influencer'].includes(selectedSubTab)) && (
                    <div className="space-y-6 animate-fadeIn">
                      <CompanyManagement 
                        companies={
                          selectedSubTab === 'all' 
                            ? companies 
                            : companies.filter(c => {
                                const ind = c.industry || '';
                                if (selectedSubTab === 'clothing') return ind.includes('服装');
                                if (selectedSubTab === 'catering') return ind.includes('餐饮');
                                if (selectedSubTab === 'goods') return ind.includes('百货') || ind.includes('零售');
                                if (selectedSubTab === 'beauty') return ind.includes('美业');
                                if (selectedSubTab === 'hotel') return ind.includes('酒店');
                                if (selectedSubTab === 'influencer') return ind.includes('网红');
                                return true;
                              })
                        } 
                        onUpdateCompany={handleOnUpdateCompanyFirestore} 
                      />
                    </div>
                  )}

                  {selectedSubTab === 'audits' && (
                    <div className="bg-[#09090B] rounded-xl border border-zinc-800/80 p-5 shadow-2xl space-y-4">
                      {companyAudits.length === 0 ? (
                        <div className="text-[#8B949E] font-mono text-center py-10 italic">
                          暂无最新待审批企业 [No applicants pending approval]
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {companyAudits.map(item => (
                            <div key={item.id} className="bg-zinc-950 border border-zinc-800/60 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="font-mono text-xs">
                                <span className="font-bold text-white block text-[13px]">{item.name}</span>
                                <span className="text-[#8B949E] mt-1.5 block leading-relaxed">
                                  关联垂直大类: <strong className="text-blue-400">{item.industry}</strong> &bull; 申请代理人: <strong>{item.contact}</strong> &bull; 提交时间: <strong>{item.time}</strong>
                                </span>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  onClick={() => handleAuditAction(item.id, 'approve')}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-bold font-mono px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-md shadow-emerald-500/10"
                                >
                                  核准备案
                                </Button>
                                <Button
                                  onClick={() => handleAuditAction(item.id, 'reject')}
                                  className="bg-neutral-800 hover:bg-neutral-700 text-[#8B949E] hover:text-white text-[10.5px] font-bold font-mono px-3.5 py-1.5 rounded-lg border border-zinc-700/50 transition cursor-pointer"
                                >
                                  驳回排审
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedSubTab === 'templates' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {industryTemplates.map(item => (
                        <div key={item.code} className="bg-zinc-950 rounded-xl border border-zinc-800/80 p-5 shadow-2xl space-y-4 hover:border-zinc-700 transition">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-white text-[13px]">{item.name}</h4>
                              <span className="text-[10px] font-semibold font-mono text-blue-400 mt-1 block">{item.nodeType}</span>
                            </div>
                            <span className="text-xs bg-amber-950/40 text-amber-400 border border-amber-900/30 font-mono font-bold px-1.5 py-0.5 rounded">
                              ★ {item.rating}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-[11px] font-mono pt-3 border-t border-zinc-900">
                            <span className="text-zinc-400">专家库: <strong className="text-white">{item.specialists}位</strong></span>
                            <span className="text-[#8B949E]">实例量: <strong className="text-white">{item.apps}</strong></span>
                          </div>

                          <Button 
                            onClick={() => handleSuggestionClick(`重新部署 ${item.name} 提示词模板`)}
                            className="w-full bg-[#09090B] border border-zinc-800/80 hover:bg-neutral-900 text-white hover:text-blue-300 rounded-lg text-xs font-bold py-2 font-mono transition cursor-pointer"
                          >
                            刷准微调认知权
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSubTab === 'subscriptions' && (
                    <div className="bg-[#09090B] rounded-xl border border-zinc-800/80 p-5 shadow-2xl space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                        <h3 className="text-xs font-bold text-[#8B949E] uppercase tracking-wider font-mono">多租户算力包计费阀</h3>
                        <Button 
                          onClick={() => alert('已成功与 Stripe CLI 钩子握手，新增套餐在 AGENTS.md 完成声明后即可挂载。')}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono px-3.5 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          + 新增算力资费包
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        {[
                          { name: '新手体验配额 Package Mini', price: '￥119', tokens: '100k/月', disc: '0.90x 算力消耗系数' },
                          { name: '专业高阶配额 Package Pro', price: '￥349', tokens: '800k/月', disc: '0.85x 算力消耗系数' },
                          { name: '无限大宗尊享 Package Ultra', price: '￥1,299', tokens: '无限吞吐量', disc: '0.75x 算力消耗系数' }
                        ].map((pkg, idx) => (
                          <div key={idx} className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-5 space-y-3">
                            <span className="text-[11px] font-bold text-[#8B949E] uppercase block tracking-wider font-mono">{pkg.name}</span>
                            <div className="text-2xl font-mono font-black text-white">
                              {pkg.price} <small className="text-xs font-normal text-zinc-500">/月</small>
                            </div>
                            <div className="text-[10.5px] font-mono text-zinc-400 space-y-1.5 pt-3 border-t border-zinc-900">
                              <div>流量额度上限: <strong className="text-blue-400">{pkg.tokens}</strong></div>
                              <div>扣费比率平准: <strong className="text-emerald-400">{pkg.disc}</strong></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------- 3. AI中心 / AI CENTER ----------------- */}
              {activeTab === 'ai' && (
                <div className="space-y-6 text-[#E8EAED]">
                  <div className="flex bg-zinc-950 border border-zinc-800 p-1 rounded-xl overflow-x-auto scrollbar-none gap-1">
                    {[
                      { id: 'roster', label: 'AI员工' },
                      { id: 'factory', label: 'Prompt工厂' },
                      { id: 'kb', label: '知识库' },
                      { id: 'memory', label: '长期记忆' },
                      { id: 'templates', label: '行业模板' },
                      { id: 'matrix', label: '排班矩阵' },
                      { id: 'config', label: '模型配置' },
                      { id: 'tokens', label: 'Token统计' }
                    ].map(tab => (
                      <Button
                        key={tab.id}
                        onClick={() => setSelectedSubTab(tab.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                          selectedSubTab === tab.id ? 'bg-blue-600 text-white' : 'text-[#8B949E] hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                      <div className="bg-[#09090B] rounded-xl border border-zinc-800/80 p-5 shadow-2xl space-y-4">
                        <h3 className="text-xs font-bold text-[#8B949E] tracking-wider">岗位监控</h3>
                        <div className="space-y-3">
                          {specialists.map((sp, idx) => (
                            <div key={idx} className="bg-zinc-950 border border-zinc-800/60 p-3 rounded-lg flex flex-col">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-white">{sp.role}</span>
                                <Badge variant="info" className="text-[9px]">{sp.state}</Badge>
                              </div>
                              <div className="w-full bg-zinc-900 h-1 rounded-full mt-2">
                                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${sp.weight}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-2 bg-[#09090B] rounded-xl border border-zinc-800/80 p-5 shadow-2xl">
                      <h3 className="text-xs font-bold text-[#8B949E] tracking-wider">AI中心看板</h3>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                          <span className="text-[10px] text-zinc-500 block uppercase">命中率</span>
                          <span className="text-xl font-black text-white">94.2%</span>
                        </div>
                        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                          <span className="text-[10px] text-zinc-500 block uppercase">响应时间</span>
                          <span className="text-xl font-black text-blue-400">1.2s</span>
                        </div>
                      </div>
                      <div className="mt-6 p-4 bg-black/40 border border-zinc-900 rounded-xl text-[11px] text-blue-300">
                        <div className="text-zinc-500 mb-2">实时数据流</div>
                        <div className="space-y-1">
                          <div>[14:20:01] 输入: 2.4k (服装)</div>
                          <div>[14:20:03] 输出: 1.1k (营销)</div>
                          <div>[14:20:05] 检索: 匹配度 0.98</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- 4. 财务中心 / FINANCE CENTER ----------------- */}
              {activeTab === 'finance' && (
                <div className="space-y-6 text-[#E8EAED]">
                  <div className="flex bg-zinc-950 border border-zinc-800 p-1 rounded-xl overflow-x-auto scrollbar-none gap-1">
                    {[
                      { id: 'plans', label: '订阅套餐' },
                      { id: 'orders', label: '订单流水' },
                      { id: 'withdraw', label: '提现审核' },
                      { id: 'stripe', label: 'Stripe' },
                      { id: 'alipay', label: '支付宝' },
                      { id: 'wechat', label: '微信' },
                      { id: 'settlement', label: '结算中心' },
                      { id: 'invoice', label: '发票' }
                    ].map(tab => (
                      <Button
                        key={tab.id}
                        onClick={() => setSelectedSubTab(tab.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                          selectedSubTab === tab.id ? 'bg-blue-600 text-white' : 'text-[#8B949E] hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { label: '总流水', val: '￥1,254,800', change: '+12%', color: 'text-white' },
                      { label: '本月净收入', val: '￥157,750', change: '+8%', color: 'text-emerald-400' },
                      { label: '提现中', val: '￥32,490', change: '5 笔待审', color: 'text-amber-400' },
                      { label: 'Stripe 余额', val: '$12,400', change: '正常', color: 'text-blue-400' }
                    ].map((kpi, i) => (
                      <div key={i} className="bg-[#09090B] border border-zinc-800 p-4 rounded-xl">
                        <span className="text-[10px] text-zinc-500 font-bold">{kpi.label}</span>
                        <div className={`text-xl font-black mt-1 ${kpi.color}`}>{kpi.val}</div>
                        <span className="text-[9px] text-zinc-600">{kpi.change}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5">
                    <h3 className="text-xs font-bold text-slate-200 uppercase mb-4">订单流水</h3>
                    <div className="space-y-2">
                      {billingLogs.map((log, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-900 rounded-lg text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200">{log.customer}</span>
                            <span className="text-[10px] text-zinc-500">{log.id}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-black text-emerald-400">{log.amount}</span>
                            <span className="text-[10px] text-zinc-600">{log.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- 5. 安全中心 / SECURITY CENTER ----------------- */}
              {activeTab === 'security' && (
                <div className="space-y-6 text-[#E8EAED]">
                  <div className="flex bg-zinc-950 border border-zinc-800 p-1 rounded-xl overflow-x-auto scrollbar-none gap-1">
                    {[
                      { id: 'rbac', label: 'RBAC权限' },
                      { id: 'admin', label: '管理员' },
                      { id: 'login_logs', label: '登录日志' },
                      { id: 'apikey', label: 'API Key' },
                      { id: 'waf', label: 'WAF' },
                      { id: 'risk', label: '风控规则' },
                      { id: 'blacklist', label: '黑名单' },
                      { id: 'audit', label: '审计日志' }
                    ].map(tab => (
                      <Button
                        key={tab.id}
                        onClick={() => setSelectedSubTab(tab.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                          selectedSubTab === tab.id ? 'bg-blue-600 text-white' : 'text-[#8B949E] hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5">
                      <h3 className="text-xs font-bold text-slate-200 uppercase mb-4">权限矩阵</h3>
                      <div className="space-y-2">
                        {Object.entries(rbacMatrix).map(([role, rights]) => (
                          <div key={role} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-900 rounded-lg">
                            <span className="text-xs font-bold text-zinc-400">{role}</span>
                            <div className="flex gap-2">
                              {Object.entries(rights).map(([right, enabled]) => (
                                <Badge key={right} variant={enabled ? 'info' : 'default'} className="text-[9px] px-1.5">
                                  {right}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5">
                      <h3 className="text-xs font-bold text-slate-200 uppercase mb-4">WAF监控</h3>
                      <div className="p-4 bg-black/40 border border-zinc-900 rounded-xl space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-400">防护状态</span>
                          <div className={`w-3 h-3 rounded-full ${firewallActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        </div>
                        <Button
                          onClick={() => setFirewallActive(!firewallActive)}
                          className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold"
                        >
                          {firewallActive ? '关闭防护' : '开启防护'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- 6. 系统中心 / SYSTEM CENTER ----------------- */}
              {activeTab === 'system' && (
                <div className="space-y-6 text-[#E8EAED]">
                  <div className="flex bg-zinc-950 border border-zinc-800 p-1 rounded-xl overflow-x-auto scrollbar-none gap-1">
                    {[
                      { id: 'task', label: '任务调度' },
                      { id: 'dag', label: 'DAG工作流' },
                      { id: 'ws', label: 'WebSocket' },
                      { id: 'redis', label: 'Redis' },
                      { id: 'qdrant', label: 'Qdrant' },
                      { id: 'queue', label: '队列' },
                      { id: 'storage', label: '存储' },
                      { id: 'logs', label: '日志' },
                      { id: 'docker', label: 'Docker' },
                      { id: 'api_monitor', label: 'API监控' }
                    ].map(tab => (
                      <Button
                        key={tab.id}
                        onClick={() => setSelectedSubTab(tab.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                          selectedSubTab === tab.id ? 'bg-blue-600 text-white' : 'text-[#8B949E] hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 bg-[#09090B] border border-zinc-800 rounded-xl p-5">
                      <h3 className="text-xs font-bold text-slate-200 uppercase mb-4">DAG工作流调度</h3>
                      <div className="h-64 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1d4ed810_0%,transparent_70%)]" />
                        <div className="flex items-center gap-8 z-10">
                          {[
                            { icon: '📝', label: '意图识别' },
                            { icon: '🤖', label: '智体分配' },
                            { icon: '✈️', label: '物流联调' },
                            { icon: '💰', label: '财务平准' }
                          ].map((node, i) => (
                            <React.Fragment key={i}>
                              <div className={`w-16 h-16 rounded-full bg-zinc-900 border-2 flex flex-col items-center justify-center gap-1 ${dagStep === i ? 'border-blue-500 bg-blue-950/20' : 'border-zinc-800'}`}>
                                <span className="text-xl">{node.icon}</span>
                                <span className="text-[8px] font-bold text-zinc-500">{node.label}</span>
                              </div>
                              {i < 3 && <div className="w-8 h-[2px] bg-zinc-800" />}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button onClick={executeDagStep} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-bold">
                          调试运行
                        </Button>
                      </div>
                    </div>
                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-[#09090B] border border-zinc-800 rounded-xl p-5">
                        <h3 className="text-xs font-bold text-slate-200 uppercase mb-4">资源占用</h3>
                        <div className="space-y-4">
                          {[
                            { label: 'CPU 占用', val: '24%', color: 'bg-blue-500' },
                            { label: '内存 占用', val: '62%', color: 'bg-purple-500' },
                            { label: '磁盘 QPS', val: '120', color: 'bg-emerald-500' }
                          ].map((res, i) => (
                            <div key={i} className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-zinc-500">{res.label}</span>
                                <span className="text-white">{res.val}</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                <div className={`h-full ${res.color}`} style={{ width: res.val.includes('%') ? res.val : '40%' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
          
        </div>
      </main>

      {/* 3. RIGHT SIDEBAR: 24H CO-PILOT DIALOG PANEL (执勤会商室) - Consistent 3-Panel responsive layout */}
      {adminMode === 'development' && (
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[#2F3336]/60 bg-[#09090B] p-4 shrink-0 flex flex-col justify-between overflow-y-auto overflow-x-hidden min-h-[620px] lg:h-screen lg:sticky lg:top-0 scrollbar-none space-y-4">
          
          {/* Topic Title */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#2F3336]/60">
              <MessageSquare className="w-4 h-4 text-[#1D9BF0]" />
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-mono">运维伙伴</span>
                <h3 className="text-xs font-black text-white uppercase tracking-wider mt-0.5 leading-none">
                  会商室
                </h3>
              </div>
            </div>

            {/* Active Specialist Profile Card & Duty Picker */}
            <div className="space-y-3">
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-mono block">
                智体班表
              </span>
              <div className="grid grid-cols-4 gap-1 pb-1">
                {Object.entries(activeSpecialistMap).map(([key, spec]) => {
                  const isCurrent = activeTab === key;
                  return (
                    <Button
                      key={key}
                      title={`${spec.name} (${spec.role})`}
                      onClick={() => {
                        setActiveTab(key as any);
                      }}
                      className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition border cursor-pointer ${
                        isCurrent 
                          ? 'bg-[#1D9BF0]/15 border-[#1D9BF0] text-white font-bold' 
                          : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-200 hover:border-zinc-800'
                      }`}
                    >
                      <span className="text-sm select-none">{spec.emoji}</span>
                      <span className="text-[8px] font-mono whitespace-nowrap overflow-hidden text-ellipsis w-12 text-center mt-0.5 leading-none">
                        {spec.name.split(' ').pop()}
                      </span>
                    </Button>
                  );
                })}
              </div>

              {/* Active Specialist Profile Card */}
              <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl space-y-2.5 shadow-inner">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img 
                      src={currentSpecialist.avatar} 
                      alt={currentSpecialist.name} 
                      className="w-9 h-9 rounded-full border border-zinc-800 object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-zinc-950 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white flex items-center gap-1 leading-none">
                      <span>{currentSpecialist.name}</span>
                      <span className="text-[8px] font-mono tracking-tight text-blue-400 font-normal px-1 bg-blue-950/40 rounded border border-blue-900/20">{currentSpecialist.role}</span>
                    </h4>
                    <p className="text-[8px] text-zinc-500 mt-1 font-mono uppercase tracking-widest leading-none">执勤中</p>
                  </div>
                </div>

                <p className="text-[10.5px] text-zinc-400 leading-normal font-sans">
                  {currentSpecialist.desc}
                </p>
              </div>

              {/* Dynamic Collaboration Workflow Simulator */}
              <div className="bg-zinc-950/60 border border-zinc-800 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest font-mono">
                    协同模拟
                  </span>
                  <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-1 py-0.5 rounded leading-none select-none">
                    在线
                  </span>
                </div>
                
                <Button
                  type="button"
                  onClick={runCoCollaborationSim}
                  disabled={isSimulating}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10.5px] font-bold font-mono transition border ${
                    isSimulating
                      ? 'bg-neutral-900 border-neutral-850 text-zinc-500 cursor-not-allowed'
                      : 'bg-[#1D9BF0] hover:bg-blue-500 border-blue-400/10 text-white shadow-md shadow-blue-500/5 cursor-pointer'
                  }`}
                >
                  <span>{isSimulating ? '模拟中...' : '模拟协同'}</span>
                </Button>
              </div>
            </div>

            {/* Simulated Workspace Flow and dynamic terminal state */}
            <div className="bg-black/35 border border-zinc-800 p-3 rounded-lg h-52 flex flex-col justify-between space-y-2 text-[10px] font-mono">
              <div className="flex-1 overflow-y-auto scrollbar-none space-y-2 shadow-inner">
                {isSimulating ? (
                  simLogs.map((log) => (
                    <div key={log.id} className="flex flex-col space-y-0.5 items-start">
                      <span className="text-[8px] text-zinc-500 tracking-wider font-bold mb-0.5 flex items-center gap-1">
                        <span>{log.emoji}</span>
                        <span>{log.sender}</span>
                        <span>&bull;</span>
                        <span>{log.time}</span>
                      </span>
                      <div className={`p-2 rounded text-[10px] max-w-[95%] leading-relaxed border ${
                        log.type === 'aria' 
                          ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200'
                          : log.type === 'barton'
                          ? 'bg-blue-950/20 border-blue-500/20 text-blue-200'
                          : log.type === 'cyrus'
                          ? 'bg-rose-950/20 border-rose-500/20 text-rose-200'
                          : log.type === 'daphne'
                          ? 'bg-purple-950/20 border-purple-500/20 text-purple-200'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-900'
                      }`}>
                        {log.message}
                      </div>
                    </div>
                  ))
                ) : (
                  aiMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col space-y-0.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <span className="text-[8px] text-zinc-500 tracking-wider font-semibold mb-0.5">
                        {msg.sender === 'user' ? 'ME (ROOT)' : currentSpecialist.name.split(' ').pop()} &bull; {msg.time}
                      </span>
                      <div className={`p-2 rounded text-[10px] max-w-[90%] leading-relaxed border ${
                        msg.sender === 'user' 
                          ? 'bg-[#1D9BF0]/15 text-blue-250 border-[#1D9BF0]/30' 
                          : 'bg-zinc-950 text-zinc-300 border-zinc-900'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="h-[1px] bg-zinc-900/60 my-1" />
              <div className="flex items-center justify-between text-[8px] text-zinc-500">
                <span className="flex items-center gap-1 font-mono uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SIM_AUTO_COLLABORATION
                </span>
                <span>SLA: EXCELLENT</span>
              </div>
            </div>

            {/* Suggestions container based on selectedTab */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-mono pl-1">
                推荐指令 / SUGGESTIONS
              </span>
              <div className="flex flex-col gap-1">
                {currentSpecialist.suggestions.slice(0, 3).map((s, idx) => (
                  <Button
                    key={idx}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left text-[10px] font-sans text-zinc-400 hover:text-white hover:bg-neutral-900 p-1.5 rounded border border-zinc-900 hover:border-zinc-800 transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <span className="text-[#1D9BF0]">💡</span>
                    <span>{s}</span>
                  </Button>
                ))}
              </div>
            </div>

          </div>

          {/* Input area & Premium Copilot toolbar */}
          <div className="pt-2 border-t border-[#2F3336]/60 space-y-2">
            
            {/* Action strip under dialog box */}
            <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 flex items-center justify-between">
              <span className="text-[8.5px] font-mono text-zinc-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                <span>AI 多模态行动工具条 (Copilot)</span>
              </span>
              <div className="flex items-center space-x-1">
                <span className="text-[8px] bg-red-950/20 border border-red-900/10 text-rose-400 px-1 py-0.5 rounded cursor-default select-none">投流</span>
                <span className="text-[8px] bg-blue-950/20 border border-blue-900/10 text-blue-400 px-1 py-0.5 rounded cursor-default select-none">打样</span>
                <span className="text-[8px] bg-emerald-950/20 border border-emerald-900/10 text-emerald-400 px-1 py-0.5 rounded cursor-default select-none font-bold">一揽发</span>
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="flex space-x-1.5">
              <div className="flex-1 bg-zinc-950 rounded-lg flex items-center px-2 py-1.5 border border-zinc-800 focus-within:border-blue-500 transition-all">
                <Input
                  type="text"
                  placeholder={`向 【${currentSpecialist.name.split(' ').pop()}】 提问...`}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="w-full bg-transparent text-xs text-white border-none outline-none ring-0 placeholder-zinc-700"
                />
                <Button 
                  type="button" 
                  onClick={() => handleSuggestionClick('上传本日算力分析图片')}
                  className="p-1 text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
                  title="上传资产或截图"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  type="button" 
                  onClick={() => handleSuggestionClick('发起语音指令平整度校验')}
                  className="p-1 text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
                  title="语音输入"
                >
                  <Mic className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Button
                type="submit"
                className="bg-[#1D9BF0] hover:bg-blue-500 rounded-lg p-2 flex items-center justify-center text-white transition cursor-pointer shadow-lg shadow-blue-500/10 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>

          </div>

        </aside>
      )}

    </div>
  );
}
