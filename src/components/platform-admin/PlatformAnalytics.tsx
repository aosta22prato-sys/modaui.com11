import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, PieChart } from 'lucide-react';

export default function PlatformAnalytics() {
  const [activeTab, setActiveTab] = useState<'gmv' | 'metrics' | 'trends'>('gmv');

  const stats = [
    { label: '平台 GMV', value: '¥2,840,500', trend: '+12.5%', color: 'text-green-400' },
    { label: 'MRR 收入', value: '¥285,000', trend: '+8.3%', color: 'text-blue-400' },
    { label: '活跃商户', value: '1,243', trend: '+45', color: 'text-purple-400' },
    { label: '流失率', value: '2.1%', trend: '-0.3%', color: 'text-red-400' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-teal-400" />
            <span>平台数据大盘</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">查看平台关键业务指标和商业表现</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
          >
            <p className="text-xs text-neutral-400">{stat.label}</p>
            <p className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-green-500 mt-2">{stat.trend}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-800">
        {(['gmv', 'metrics', 'trends'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === tab
                ? 'text-teal-400 border-teal-400'
                : 'text-neutral-500 border-transparent hover:text-neutral-400'
            }`}
          >
            {tab === 'gmv' && '💰 GMV 统计'}
            {tab === 'metrics' && '📊 商业指标'}
            {tab === 'trends' && '🔥 热搜趋势'}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 h-48 flex items-center justify-center">
          <div className="text-center">
            {activeTab === 'gmv' && <p className="text-xs text-neutral-400">全平台所有商家产生的总交易额数据</p>}
            {activeTab === 'metrics' && <p className="text-xs text-neutral-400">MRR、ARR、LTV 等核心商业指标</p>}
            {activeTab === 'trends' && <p className="text-xs text-neutral-400">热搜和流行商品品类排行</p>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
