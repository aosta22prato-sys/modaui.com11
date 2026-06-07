import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Palette, Plus, Search } from 'lucide-react';

export default function ThemeStore() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'official' | 'thirdparty' | 'review'>('official');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Palette className="w-6 h-6 text-pink-400" />
            <span>模板/主题市场</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">管理官方和第三方设计师的前端模板</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-800">
        {(['official', 'thirdparty', 'review'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === tab
                ? 'text-pink-400 border-pink-400'
                : 'text-neutral-500 border-transparent hover:text-neutral-400'
            }`}
          >
            {tab === 'official' && '官方模板'}
            {tab === 'thirdparty' && '第三方模板'}
            {tab === 'review' && '审核中'}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
        <Search className="w-3.5 h-3.5 text-neutral-500" />
        <input
          type="text"
          placeholder="搜索模板..."
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
            {activeTab === 'official' && '📐 官方模板库'}
            {activeTab === 'thirdparty' && '🎨 第三方设计师'}
            {activeTab === 'review' && '⏳ 等待审核'}
          </h3>
          <p className="text-xs text-neutral-400">提供给商家建站用的前端模板库</p>
        </div>
      </motion.div>
    </div>
  );
}
