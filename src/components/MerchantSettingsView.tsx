import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, CreditCard, Shield, Globe, 
  Key, Activity, Save, RefreshCw, 
  ChevronRight, ExternalLink, Zap, CheckCircle
} from 'lucide-react';
import { Button, Card, Input } from './ui';
import { apiService } from '../services/apiService';

interface MerchantSettingsViewProps {
  merchantId: string;
}

export default function MerchantSettingsView({ merchantId }: MerchantSettingsViewProps) {
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchMerchantData();
  }, [merchantId]);

  const fetchMerchantData = async () => {
    setLoading(true);
    try {
      const res = await apiService.fetchApi(`/api/merchants`);
      if (res.success) {
        const m = res.merchants.find((item: any) => item.id === merchantId);
        setMerchant(m);
      }
    } catch (error) {
      console.error('Failed to fetch merchant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiService.updateMerchant(merchantId, {
        name: merchant.name,
        status: merchant.status,
        billingPlan: merchant.billingPlan
      });
      if (res.success) {
        setMerchant(res.merchant);
        setMessage({ type: 'success', text: '商户资料已更新。' });
      } else {
        setMessage({ type: 'error', text: res.error || '更新失败。' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '请求失败。' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-neutral-500 font-mono animate-pulse">加载商户核心参数...</div>;
  }

  if (!merchant) {
    return <div className="p-8 text-center text-rose-500 font-mono">未找到商户数据。</div>;
  }

  return (
    <div className="space-y-8 animate-fadeIn text-left max-w-5xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-sky-400">
            <Building2 className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Merchant Profile</span>
          </div>
          <h2 className="text-xl font-bold text-white">{merchant.name}</h2>
          <p className="text-xs text-neutral-500 font-mono">ID: {merchant.id} • 创建于 {new Date(merchant.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
            merchant.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {merchant.status === 'active' ? '运营中' : '已停用'}
          </div>
          <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {merchant.billingPlan} PLAN
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: General Settings */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-6 bg-neutral-950 border-neutral-800">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              商户基础配置
            </h3>
            
            <form onSubmit={handleUpdateMerchant} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-neutral-500 uppercase">商户名称</label>
                  <Input 
                    value={merchant.name}
                    onChange={(e) => setMerchant({...merchant, name: e.target.value})}
                    className="bg-black border-neutral-800 focus:border-sky-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-neutral-500 uppercase">运营状态</label>
                  <select 
                    value={merchant.status}
                    onChange={(e) => setMerchant({...merchant, status: e.target.value})}
                    className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="active">正常运营 (Active)</option>
                    <option value="suspended">暂停服务 (Suspended)</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-900 flex justify-between items-center">
                <p className="text-[10px] text-neutral-500 max-w-xs leading-relaxed">
                  修改商户名称将同步更新至所有发票、物流单据及对外展示的 API 元数据中。
                </p>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-[#1D9BF0] hover:bg-[#38BDF8] px-6"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  保存更改
                </Button>
              </div>
            </form>
          </Card>

          {/* API Keys Section */}
          <Card className="p-6 bg-neutral-950 border-neutral-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                API 访问凭据 (MODAUI Edge)
              </h3>
              <Button className="text-[10px] h-7 bg-neutral-900 border-neutral-800 hover:bg-neutral-800">
                重新生成
              </Button>
            </div>

            <div className="space-y-4">
              <div className="bg-black border border-neutral-800 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">Production Key</span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">LIVE</span>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="text-xs font-mono text-neutral-300 bg-neutral-900 px-3 py-2 rounded flex-1">
                    mk_live_51Pz7XfG6...
                  </code>
                  <Button className="h-8 w-8 p-0 bg-neutral-900 border-neutral-800">
                    <Activity className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Module Control Center */}
          <Card className="p-6 bg-neutral-950 border-neutral-800">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              MODAUI 模块开关中心
            </h3>
            
            <div className="space-y-4">
              {[
                { id: 'pos', name: 'POS 收银系统', desc: '线下门店收银与扫码支付' },
                { id: 'sales', name: '销售中心', desc: '订单管理与销售流水追踪' },
                { id: 'purchase', name: '采购中心', desc: '供应商进货与入库管理' },
                { id: 'inventory', name: '库存中心', desc: '多仓库存监控与盘点调整' },
                { id: 'customer', name: '客户中心', desc: 'CRM 档案与忠诚度计划' },
                { id: 'supplier', name: '供应商中心', desc: '供应链伙伴管理' },
                { id: 'wallet', name: '企业钱包', desc: '公司账户余额与收支对账' },
                { id: 'payment', name: '支付网关', desc: '第三方支付渠道接入' },
                { id: 'report', name: '经营报表', icon: '📊', desc: '数据可视化经营决策' }
              ].map((mod) => (
                <div key={mod.id} className="flex items-center justify-between p-4 bg-black border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white">{mod.name}</h4>
                    <p className="text-[10px] text-neutral-500">{mod.desc}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[8px] font-mono text-neutral-600 uppercase">Status</span>
                      <button 
                        onClick={() => {
                          const modules = merchant.modules || {};
                          const current = modules[mod.id] || { enabled: true, visible: true, menuEnabled: true, permissionsEnabled: true, aiEnabled: true, testMode: false };
                          setMerchant({
                            ...merchant,
                            modules: {
                              ...modules,
                              [mod.id]: { ...current, enabled: !current.enabled }
                            }
                          });
                        }}
                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${
                          (merchant.modules?.[mod.id]?.enabled ?? true) ? 'bg-sky-500' : 'bg-neutral-800'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-200 ${
                          (merchant.modules?.[mod.id]?.enabled ?? true) ? 'left-5.5' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-900 flex justify-end">
              <Button 
                onClick={handleUpdateMerchant}
                disabled={saving}
                className="bg-[#1D9BF0] hover:bg-[#38BDF8] px-6"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                保存模块配置
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Billing & Plan */}
        <div className="space-y-8">
          <Card className="p-6 bg-gradient-to-br from-[#1D9BF0]/10 to-transparent border-sky-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="w-16 h-16 text-sky-400" />
            </div>
            
            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-400" />
              当前订阅计划
            </h3>

            <div className="space-y-4 relative z-10">
              <div className="text-3xl font-black text-white uppercase tracking-tighter">
                {merchant.billingPlan}
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                您的商户账号目前处于 <strong>{merchant.billingPlan}</strong> 计划。
                包含 5 个 AI 专家席位和每月 10k 次 API 调用额度。
              </p>
              
              <div className="pt-4 space-y-2">
                <Button className="w-full bg-white text-black hover:bg-neutral-200 font-black text-xs h-10">
                  升级到 PRO 计划
                </Button>
                <button className="w-full text-[10px] text-neutral-500 hover:text-white transition-colors flex items-center justify-center gap-1 mt-2">
                  查看所有计划详情 <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-neutral-950 border-neutral-800">
            <h3 className="text-sm font-bold text-white mb-4">快捷链接</h3>
            <div className="space-y-1">
              {[
                { label: '商户帮助文档', icon: ExternalLink },
                { label: '查看审计日志', icon: Activity },
                { label: '开发者控制台', icon: Globe },
                { label: '联系客户经理', icon: CheckCircle },
              ].map((link, idx) => (
                <button 
                  key={idx}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-900 transition-all group"
                >
                  <span className="text-xs text-neutral-400 group-hover:text-white">{link.label}</span>
                  <link.icon className="w-3.5 h-3.5 text-neutral-600 group-hover:text-sky-400" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
