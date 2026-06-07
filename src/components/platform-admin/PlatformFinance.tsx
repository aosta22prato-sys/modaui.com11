import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, Plus, Search } from 'lucide-react';

export default function PlatformFinance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'devshare'>('withdrawals');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Wallet className="w-6 h-6 text-yellow-400" />
            <span>财务结算</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">管理商家提现和开发者分账</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-800">
        {(['withdrawals', 'devshare'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === tab
                ? 'text-yellow-400 border-yellow-400'
                : 'text-neutral-500 border-transparent hover:text-neutral-400'
            }`}
          >
            {tab === 'withdrawals' && '💸 商家提现'}
            {tab === 'devshare' && '👥 开发者分账'}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
        <Search className="w-3.5 h-3.5 text-neutral-500" />
        <input
          type="text"
          placeholder="搜索提现申请或开发者..."
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
        {activeTab === 'withdrawals' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white mb-4">💸 提现申请审核</h3>
            <p className="text-xs text-neutral-400">针对平台代收货款模式，审核商家的钱包提现申请</p>
          </div>
        )}

        {activeTab === 'devshare' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white mb-4">👥 开发者分账管理</h3>
            <p className="text-xs text-neutral-400">计算并结算第三方应用开发者、模板设计师的收益</p>
            <p className="text-xs text-neutral-500 mt-2">平台抽成 20%，开发者拿 80%</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
