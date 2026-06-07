import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, Plus, Search, Shield, Eye, Trash2 } from 'lucide-react';

interface ShopInstance {
  id: string;
  name: string;
  industry: 'catering' | 'retail' | 'fashion' | 'beauty' | 'fitness' | 'jewelry';
  founderEmail: string;
  planLevel: 'Trial' | 'Pro' | 'Enterprise';
  dailyTokens: number;
  cpuQuota: string;
  totalSalesSimulated: number;
  status: 'active' | 'suspended';
}

interface TenantManagementProps {
  shops: ShopInstance[];
  onUpdateShops: (shops: ShopInstance[]) => void;
}

export default function TenantManagement({ shops, onUpdateShops }: TenantManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newShopIndustry, setNewShopIndustry] = useState<'fashion' | 'catering' | 'retail' | 'beauty' | 'fitness' | 'jewelry'>('fashion');
  const [newShopFounder, setNewShopFounder] = useState('');
  const [newShopPlan, setNewShopPlan] = useState<'Trial' | 'Pro' | 'Enterprise'>('Pro');

  const handleAddShop = () => {
    if (!newShopName || !newShopFounder) return;
    const newShop: ShopInstance = {
      id: `sh${Date.now()}`,
      name: newShopName,
      industry: newShopIndustry,
      founderEmail: newShopFounder,
      planLevel: newShopPlan,
      dailyTokens: newShopPlan === 'Trial' ? 15000 : newShopPlan === 'Pro' ? 42000 : 100000,
      cpuQuota: newShopPlan === 'Trial' ? '1.0 Cores' : newShopPlan === 'Pro' ? '2.5 Cores' : '8.0 Cores',
      totalSalesSimulated: 0,
      status: 'active'
    };
    onUpdateShops([...shops, newShop]);
    setNewShopName('');
    setNewShopFounder('');
  };

  const filteredShops = shops.filter(shop =>
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.founderEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-blue-400" />
            <span>租户管理</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">管理平台所有商户的店铺生命周期和资源分配</p>
        </div>
      </div>

      {/* Add New Shop Form */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-4"
      >
        <h3 className="text-sm font-bold text-white">➕ 新增商户</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="店铺名称"
            value={newShopName}
            onChange={(e) => setNewShopName(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="email"
            placeholder="创始人邮箱"
            value={newShopFounder}
            onChange={(e) => setNewShopFounder(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={newShopIndustry}
            onChange={(e) => setNewShopIndustry(e.target.value as any)}
            className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="fashion">服装</option>
            <option value="catering">餐饮</option>
            <option value="beauty">美业</option>
            <option value="fitness">健身</option>
            <option value="jewelry">珠宝</option>
          </select>
          <select
            value={newShopPlan}
            onChange={(e) => setNewShopPlan(e.target.value as any)}
            className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="Trial">试用</option>
            <option value="Pro">专业版</option>
            <option value="Enterprise">企业版</option>
          </select>
          <button
            onClick={handleAddShop}
            className="md:col-span-2 lg:col-span-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center justify-center space-x-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>创建</span>
          </button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
        <Search className="w-3.5 h-3.5 text-neutral-500" />
        <input
          type="text"
          placeholder="搜索店铺名称或创始人..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none text-xs outline-none text-white w-full placeholder-neutral-500"
        />
      </div>

      {/* Shops List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredShops.map((shop) => (
          <motion.div
            key={shop.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">{shop.name}</h3>
                <p className="text-xs text-neutral-400 mt-1">{shop.founderEmail}</p>
                <div className="flex items-center space-x-4 mt-3 text-xs">
                  <span className="text-neutral-400">
                    行业: <span className="text-neutral-300 font-semibold">{shop.industry}</span>
                  </span>
                  <span className="text-neutral-400">
                    套餐: <span className="text-emerald-400 font-semibold">{shop.planLevel}</span>
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${shop.status === 'active' ? 'bg-green-950 text-green-300' : 'bg-red-950 text-red-300'}`}>
                    {shop.status === 'active' ? '✓ 活跃' : '⚠ 暂停'}
                  </span>
                  <span className="text-neutral-400">
                    日令牌: <span className="text-blue-300 font-mono">{shop.dailyTokens.toLocaleString()}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-neutral-800 rounded transition text-neutral-400 hover:text-white" title="登录为商家">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-neutral-800 rounded transition text-neutral-400 hover:text-white" title="管理权限">
                  <Shield className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-red-950 rounded transition text-neutral-400 hover:text-red-400" title="删除">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
