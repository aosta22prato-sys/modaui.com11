import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Package, Plus, Search } from 'lucide-react';

export default function AppStoreManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'developers' | 'apps' | 'categories'>('apps');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Package className="w-6 h-6 text-purple-400" />
            <span>应用市场管理</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">管理第三方开发者和插件应用</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-800">
        {(['apps', 'developers', 'categories'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === tab
                ? 'text-purple-400 border-purple-400'
                : 'text-neutral-500 border-transparent hover:text-neutral-400'
            }`}
          >
            {tab === 'apps' && '应用审核'}
            {tab === 'developers' && '开发者管理'}
            {tab === 'categories' && '分类与推荐'}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
        <Search className="w-3.5 h-3.5 text-neutral-500" />
        <input
          type="text"
          placeholder="搜索应用或开发者..."
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
            {activeTab === 'apps' && '📱 应用列表'}
            {activeTab === 'developers' && '👨‍💻 开发者列表'}
            {activeTab === 'categories' && '🏷️ 应用分类'}
          </h3>
          <p className="text-xs text-neutral-400">此模块用于管理第三方应用和开发者生态</p>
        </div>
      </motion.div>
    </div>
  );
}
