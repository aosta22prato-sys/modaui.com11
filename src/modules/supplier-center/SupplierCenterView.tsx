import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Search, Mail, Phone, MapPin, Trash2, Edit, ArrowRight, DollarSign, Truck, History, CreditCard, AlertCircle } from 'lucide-react';
import { Button, Input, Card, Badge, PageHeader, StatsCard, Table, TableRow, TableCell, Modal, SearchInput } from '../../components/ui';
import { motion, AnimatePresence } from 'motion/react';

interface Supplier {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  taxNumber?: string;
  notes?: string;
}

export const SupplierCenterView: React.FC<{ merchantId: string }> = ({ merchantId }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({});

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [creditRecords, setCreditRecords] = useState<any[]>([]);
  const [showCreditModal, setShowCreditModal] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [merchantId]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`/api/suppliers?merchantId=${merchantId}`);
      const data = await res.json();
      if (data.success) setSuppliers(data.suppliers);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  };

  const fetchCreditRecords = async (supplierId: string) => {
    try {
      const res = await fetch(`/api/credits?entityType=supplier&entityId=${supplierId}`);
      const data = await res.json();
      if (data.success) setCreditRecords(data.records);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewCredits = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    fetchCreditRecords(supplier.id);
    setShowCreditModal(true);
  };

  const metrics = useMemo(() => {
    return {
      total: suppliers.length,
      active: suppliers.length,
      globalCredit: 0 // Could fetch from API
    };
  }, [suppliers]);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader 
        title="供应商中心" 
        subtitle="全球供应链伙伴档案、采购账期管理与合规准入体系"
        icon={Users}
        actions={
          <>
            <SearchInput 
              placeholder="搜索供应商、代码..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-72"
            />
            <Button className="gap-2" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4" />
              新增供应商
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard 
          label="合作供应商" 
          value={metrics.total} 
          icon={Users} 
          color="indigo"
        />
        <StatsCard 
          label="活跃供货中" 
          value={metrics.active} 
          icon={Truck} 
          color="sky"
        />
        <StatsCard 
          label="应付账款总额" 
          value={`¥${metrics.globalCredit}`} 
          icon={DollarSign} 
          color="rose"
        />
      </div>

      <Table headers={['供应商名称', '联系方式', '代码', '所在城市', '应付余额', '操作']}>
        {filteredSuppliers.map((supplier) => (
          <TableRow key={supplier.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-bold text-white">{supplier.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-300">{supplier.phone || '无电话'}</p>
                <p className="text-[10px] text-slate-500">{supplier.email || '无邮箱'}</p>
              </div>
            </TableCell>
            <TableCell className="font-mono text-[10px] text-slate-500">{supplier.code || 'SUP-NEW'}</TableCell>
            <TableCell className="text-xs text-slate-400">{supplier.city || '未填'}</TableCell>
            <TableCell className="font-bold text-rose-500">¥0.00</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-rose-400 hover:bg-rose-400/10 h-8 text-[10px] px-2"
                  onClick={() => handleViewCredits(supplier)}
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  对账单
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
        title={`${selectedSupplier?.name} - 供应商对账`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">应付账款余额</p>
              <p className="text-2xl font-black text-rose-500 font-mono">
                ¥{creditRecords.reduce((sum, r) => sum + (r.type === 'DEBT' ? r.amount : -r.amount), 0).toFixed(2)}
              </p>
            </div>
            <Button className="bg-rose-500 hover:bg-rose-400 text-white font-bold h-10 px-6">
              结算付款
            </Button>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              往来记录
            </h4>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {creditRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-600 text-xs">暂无往来对账记录</div>
              ) : (
                creditRecords.map((record) => (
                  <div key={record.id} className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={record.type === 'DEBT' ? 'danger' : 'success'} className="text-[8px] py-0">
                          {record.type === 'DEBT' ? '采购欠款' : '已付货款'}
                        </Badge>
                        <span className="text-[10px] text-slate-500">{new Date(record.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{record.notes || '采购入库自动记账'}</p>
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
          </div>
        </div>
      </Modal>

      {/* Modal for adding supplier omitted for brevity or can be added similarly */}
    </div>
  );
};
