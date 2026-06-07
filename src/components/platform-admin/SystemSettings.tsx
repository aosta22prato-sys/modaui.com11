import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Users, Lock, Plus } from 'lucide-react';

interface Account {
  email: string;
  role: 'admin' | 'founder' | 'manager' | 'staff' | 'customer';
  desc: string;
  lastActivity: string;
}

interface SystemSettingsProps {
  accounts: Account[];
  onUpdateAccounts: (accounts: Account[]) => void;
  userRole?: string;
}

export default function SystemSettings({ accounts, onUpdateAccounts, userRole = 'founder' }: SystemSettingsProps) {
  const [activeTab, setActiveTab] = useState<'staff' | 'roles' | 'logs'>('staff');
  const [searchTerm, setSearchTerm] = useState('');

  const roleDescriptions: Record<string, { label: string; color: string; permissions: string[] }> = {
    admin: {
      label: '超级管理员',
      color: 'text-red-400',
      permissions: ['全部权限', '平台配置', '用户管理', '财务审核', '系统日志']
    },
    founder: {
      label: '创始人',
      color: 'text-purple-400',
      permissions: ['商户管理', '套餐设置', '财务结算', '报表查看']
    },
    manager: {
      label: '经理',
      color: 'text-blue-400',
      permissions: ['商户审核', '工单处理', '报表查看']
    },
    staff: {
      label: '员工',
      color: 'text-green-400',
      permissions: ['工单查看', '报表查看']
    },
    customer: {
      label: '客户',
      color: 'text-gray-400',
      permissions: ['查看自己的订单', '提交工单']
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            <span>系统权限</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">管理员工角色、权限和审计日志</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-800">
        {(['staff', 'roles', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === tab
                ? 'text-emerald-400 border-emerald-400'
                : 'text-neutral-500 border-transparent hover:text-neutral-400'
            }`}
          >
            {tab === 'staff' && '👥 员工与角色'}
            {tab === 'roles' && '🔐 权限管理'}
            {tab === 'logs' && '📋 审计日志'}
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
        {activeTab === 'staff' && (
          <div className="space-y-4">
            {accounts.slice(0, 5).map((account, idx) => (
              <div key={idx} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{account.email}</p>
                    <p className="text-xs text-neutral-400 mt-1">{account.desc}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`text-xs font-semibold ${roleDescriptions[account.role]?.color || 'text-gray-400'}`}>
                        {roleDescriptions[account.role]?.label || account.role}
                      </span>
                      <span className="text-xs text-neutral-500">• {account.lastActivity}</span>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-neutral-800 rounded transition">
                    <Lock className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(roleDescriptions).map(([role, info]) => (
              <div key={role} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <h4 className={`text-sm font-bold ${info.color}`}>{info.label}</h4>
                <ul className="mt-3 space-y-1">
                  {info.permissions.map((perm, idx) => (
                    <li key={idx} className="text-xs text-neutral-400">✓ {perm}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white mb-4">📋 全局审计日志</h3>
            <p className="text-xs text-neutral-400">记录平台员工修改商家状态、套餐、费率等所有高危操作</p>
            <p className="text-xs text-neutral-500 mt-2">防止内鬼或操作失误</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
