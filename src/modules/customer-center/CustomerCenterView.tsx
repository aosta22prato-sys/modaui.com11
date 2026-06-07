import React, { useState, useEffect, useMemo } from 'react';
import { User, Plus, Search, Mail, Phone, CreditCard, Star, Trash2, ArrowRight, DollarSign, Wallet, History, AlertCircle } from 'lucide-react';
import { Button, Input, Card, Badge, PageHeader, StatsCard, Table, TableRow, TableCell, Modal, SearchInput } from '../../components/ui';
import { motion, AnimatePresence } from 'motion/react';

interface Customer {
  id: string;
  username: string;
  email: string;
  profile?: {
    fullName?: string;
    phone?: string;
    address?: string;
  };
  customerData?: {
    points: number;
    creditLimit: number;
    customerCode: string;
  };
}

export const CustomerCenterView: React.FC<{ merchantId: string }> = ({ merchantId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [creditRecords, setCreditRecords] = useState<any[]>([]);
  const [showCreditModal, setShowCreditModal] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [merchantId]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/users?role=Customer&merchantId=${merchantId}`);
      const data = await res.json();
      if (data.success) setCustomers(data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCreditRecords = async (customerId: string) => {
    try {
      const res = await fetch(`/api/credits?entityType=customer&entityId=${customerId}`);
      const data = await res.json();
      if (data.success) setCreditRecords(data.records);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewCredits = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCreditRecords(customer.id);
    setShowCreditModal(true);
  };

  const metrics = useMemo(() => {
    return {
      total: customers.length,
      active: customers.length, // simplified
      totalPoints: customers.reduce((sum, c) => sum + (c.customerData?.points || 0), 0)
    };
  }, [customers]);

  const filteredCustomers = customers.filter(c => 
    c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.customerData?.customerCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader 
        title="客户中心" 
        subtitle="私域客户资产管理、忠诚度计划与信用消费体系"
        icon={User}
        actions={
          <>
            <SearchInput 
              placeholder="搜索客户名、邮箱、编号..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-72"
            />
            <Button className="gap-2" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4" />
              新增客户
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard 
          label="注册客户数" 
          value={metrics.total} 
          icon={User} 
          color="sky"
        />
        <StatsCard 
          label="活跃会员" 
          value={metrics.active} 
          icon={Star} 
          color="emerald"
        />
        <StatsCard 
          label="累计发放积分" 
          value={metrics.totalPoints} 
          icon={Wallet} 
          color="amber"
        />
      </div>

      <Table headers={['客户信息', '联系方式', '客户编号', '积分', '信用额度', '操作']}>
        {filteredCustomers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 border border-slate-700">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{customer.profile?.fullName || customer.username}</p>
                  <p className="text-[10px] text-slate-500">{customer.email}</p>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-xs text-slate-400">{customer.profile?.phone || '未设置'}</TableCell>
            <TableCell className="font-mono text-[10px] text-slate-500">{customer.customerData?.customerCode || 'CUST-NEW'}</TableCell>
            <TableCell>
              <Badge variant="success" className="px-2 py-0.5">{customer.customerData?.points || 0} PTS</Badge>
            </TableCell>
            <TableCell className="font-bold text-white">¥{customer.customerData?.creditLimit || 0}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-amber-400 hover:bg-amber-400/10 h-8 text-[10px] px-2"
                  onClick={() => handleViewCredits(customer)}
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  欠款账单
                </Button>
                <Button variant="ghost" size="sm" className="text-sky-400 hover:bg-sky-400/10 h-8 w-8 p-0">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </Table>

      {/* Credit Records Modal */}
      <Modal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        title={`${selectedCustomer?.profile?.fullName || selectedCustomer?.username} - 信用账单`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">当前信用额度</p>
              <p className="text-xl font-black text-white font-mono">¥{selectedCustomer?.customerData?.creditLimit || 0}</p>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">当前欠款总额</p>
              <p className="text-xl font-black text-rose-500 font-mono">
                ¥{creditRecords.reduce((sum, r) => sum + (r.type === 'DEBT' ? r.amount : -r.amount), 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black text-white flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              变动记录
            </h4>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {creditRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-600 text-xs">暂无信用变动记录</div>
              ) : (
                creditRecords.map((record) => (
                  <div key={record.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={record.type === 'DEBT' ? 'danger' : 'success'} className="text-[8px] py-0">
                          {record.type === 'DEBT' ? '产生欠款' : '偿还欠款'}
                        </Badge>
                        <span className="text-[10px] text-slate-500">{new Date(record.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{record.notes || '无备注'}</p>
                    </div>
                    <p className={`font-mono font-bold ${record.type === 'DEBT' ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {record.type === 'DEBT' ? '+' : '-'}¥{record.amount.toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
            <Button variant="ghost" onClick={() => setShowCreditModal(false)}>关闭</Button>
            <Button className="bg-sky-500 hover:bg-sky-400 text-white font-bold px-6">还款入账</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
