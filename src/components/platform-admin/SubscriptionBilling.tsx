import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Plus, TrendingUp } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  maxStores: number;
  maxProducts: number;
  maxStaff: number;
  transactionFee: number;
  features: string[];
}

interface SubscriptionBillingProps {
  plans: Plan[];
  onUpdatePlans: (plans: Plan[]) => void;
}

export default function SubscriptionBilling({ plans, onUpdatePlans }: SubscriptionBillingProps) {
  const [activeTab, setActiveTab] = useState<'plans' | 'invoices' | 'fees'>('plans');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            <span>套餐与计费</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">管理订阅套餐、账单和费率配置</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-800">
        {(['plans', 'invoices', 'fees'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === tab
                ? 'text-indigo-400 border-indigo-400'
                : 'text-neutral-500 border-transparent hover:text-neutral-400'
            }`}
          >
            {tab === 'plans' && '套餐定义'}
            {tab === 'invoices' && '账单管理'}
            {tab === 'fees' && '费率配置'}
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
        {activeTab === 'plans' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white mb-4">📊 订阅套餐管理</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-white">{plan.name}</h4>
                  <p className="text-lg font-bold text-green-400 mt-2">
                    ¥{plan.price.toLocaleString()}
                    <span className="text-xs text-neutral-500">/月</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-neutral-400">
                    <li>• 店铺数: {plan.maxStores}</li>
                    <li>• 商品数: {plan.maxProducts.toLocaleString()}</li>
                    <li>• 员工数: {plan.maxStaff}</li>
                    <li>• 抽成率: {(plan.transactionFee * 100).toFixed(2)}%</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white mb-4">💰 账单记录</h3>
            <p className="text-xs text-neutral-400">商家订阅费、插件购买等账单将在此显示</p>
          </div>
        )}

        {activeTab === 'fees' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-bold text-white mb-4">⚙️ 交易费率</h3>
            <p className="text-xs text-neutral-400">配置不同套餐的支付渠道抽成比例</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
