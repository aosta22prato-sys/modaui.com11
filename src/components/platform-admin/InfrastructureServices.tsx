import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Plus, Search, Key } from 'lucide-react';

export default function InfrastructureServices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'domains' | 'gateways' | 'shipping'>('domains');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Zap className="w-6 h-6 text-amber-400" />
            <span>基础服务管理</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">管理域名、支付网关、物流等公共资源</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-800">
        {(['domains', 'gateways', 'shipping'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === tab
                ? 'text-amber-400 border-amber-400'
                : 'text-neutral-500 border-transparent hover:text-neutral-400'
            }`}
          >
            {tab === 'domains' && '🌐 域名管理'}
            {tab === 'gateways' && '💳 支付网关'}
            {tab === 'shipping' && '📦 物流集成'}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
        <Search className="w-3.5 h-3.5 text-neutral-500" />
        <input
          type="text"
          placeholder="搜索资源..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none text-xs outline-none text-white w-full placeholder-neutral-500"
        />
      </div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h3 className="text-sm font-bold text-white mb-4">
            {activeTab === 'domains' && '域名配置'}
            {activeTab === 'gateways' && '支付网关配置'}
            {activeTab === 'shipping' && '物流服务商对接'}
          </h3>
          <div className="flex items-center space-x-2 text-amber-400 text-xs">
            <Key className="w-3.5 h-3.5" />
            <span>API 密钥和配置存储在此</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
