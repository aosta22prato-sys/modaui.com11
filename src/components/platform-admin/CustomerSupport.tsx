import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Headphones, Plus, Search, FileText } from 'lucide-react';

export default function CustomerSupport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'tickets' | 'helpcenter'>('tickets');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Headphones className="w-6 h-6 text-cyan-400" />
            <span>客户成功/工单客服</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">服务商家、处理工单和发布帮助文档</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-800">
        {(['tickets', 'helpcenter'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === tab
                ? 'text-cyan-400 border-cyan-400'
                : 'text-neutral-500 border-transparent hover:text-neutral-400'
            }`}
          >
            {tab === 'tickets' && '🎫 工单系统'}
            {tab === 'helpcenter' && '📚 帮助中心'}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
        <Search className="w-3.5 h-3.5 text-neutral-500" />
        <input
          type="text"
          placeholder="搜索工单或文档..."
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
        {activeTab === 'tickets' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>工单列表</span>
            </h3>
            <p className="text-xs text-neutral-400">接收并处理商家在建站、支付、技术上遇到的问题</p>
          </div>
        )}

        {activeTab === 'helpcenter' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>帮助中心管理</span>
            </h3>
            <p className="text-xs text-neutral-400">发布和更新官方建站教程、API 文档</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
