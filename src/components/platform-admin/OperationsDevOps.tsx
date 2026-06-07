import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Activity, AlertCircle, Shield } from 'lucide-react';

export default function OperationsDevOps() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'riskcontrol' | 'announcements'>('monitoring');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Activity className="w-6 h-6 text-rose-400" />
            <span>全局运维与监控</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">监控平台健康状况、风险控制和系统公告</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-800">
        {(['monitoring', 'riskcontrol', 'announcements'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === tab
                ? 'text-rose-400 border-rose-400'
                : 'text-neutral-500 border-transparent hover:text-neutral-400'
            }`}
          >
            {tab === 'monitoring' && '📊 资源监控'}
            {tab === 'riskcontrol' && '🛡️ 风控管理'}
            {tab === 'announcements' && '📢 系统公告'}
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
        {activeTab === 'monitoring' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span>平台健康度监控</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'API 正常率', value: '99.98%', status: 'good' },
                { label: '数据库响应', value: '45ms', status: 'good' },
                { label: '并发请求数', value: '12,450/s', status: 'normal' },
                { label: '存储占用', value: '68%', status: 'normal' }
              ].map((item) => (
                <div key={item.label} className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-400">{item.label}</p>
                  <p className={`text-lg font-bold mt-2 ${item.status === 'good' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'riskcontrol' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-orange-400" />
              <span>违规风控系统</span>
            </h3>
            <div className="space-y-3">
              <div className="bg-neutral-800 rounded-lg p-3">
                <p className="text-xs font-semibold text-white">🚫 敏感词过滤</p>
                <p className="text-xs text-neutral-400 mt-1">检测商品标题和描述中的违禁词汇</p>
              </div>
              <div className="bg-neutral-800 rounded-lg p-3">
                <p className="text-xs font-semibold text-white">📋 黑名单系统</p>
                <p className="text-xs text-neutral-400 mt-1">封禁诈骗店铺或恶意买家 IP</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white mb-4">📢 系统公告</h3>
            <p className="text-xs text-neutral-400 mb-4">向全平台商家群发系统升级、维护和活动通知</p>
            <button className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded transition">
              发送新公告
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
