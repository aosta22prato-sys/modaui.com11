import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Warehouse, MapPin, Box, RotateCcw, ArrowRight, BarChart3, ListChecks, Plus, Search, Activity, Settings } from 'lucide-react';
import { InventoryMovement, InventoryRecord, Warehouse as InventoryWarehouse, StorageLocation, InventoryTransfer, InventoryAdjustment } from '../../types/modaui';
import { computeAvailableQuantity } from './inventoryDomain';
import { PageHeader, StatsCard, Table, TableRow, TableCell, Button, Badge, SearchInput } from '../../components/ui';

type InventorySubTab = 'overview' | 'warehouses' | 'locations' | 'records' | 'transfers' | 'adjustments' | 'movements';

interface InventoryCenterViewProps {
  tenantId: string;
  activeSubTab: InventorySubTab;
}

const sampleWarehouses: InventoryWarehouse[] = [
  {
    id: 'wh-001',
    merchantId: 'tenant_x',
    name: '深圳宝安智能仓',
    code: 'SZ-BA-01',
    capacity: 18000,
    occupancy: 12640,
    status: 'active',
    location: '深圳市宝安区智慧物流园',
    contact: '仓库经理: 小张',
    lastAuditAt: '2026-06-03',
    createdAt: '2025-12-10'
  },
  {
    id: 'wh-002',
    merchantId: 'tenant_x',
    name: '上海冷链防潮仓',
    code: 'SH-CL-02',
    capacity: 12000,
    occupancy: 8850,
    status: 'maintenance',
    location: '上海市青浦区枢纽物流园',
    contact: '仓库经理: 李芳',
    lastAuditAt: '2026-05-28',
    createdAt: '2026-01-18'
  }
];

const sampleLocations: StorageLocation[] = [
  {
    id: 'loc-001',
    warehouseId: 'wh-001',
    name: 'A1-12',
    zone: '冷冻区',
    capacity: 480,
    occupied: 430,
    palletId: 'PL-8412',
    status: 'available',
    createdAt: '2026-04-12'
  },
  {
    id: 'loc-002',
    warehouseId: 'wh-001',
    name: 'B3-04',
    zone: '常温区',
    capacity: 640,
    occupied: 612,
    palletId: 'PL-3042',
    status: 'reserved',
    createdAt: '2026-04-18'
  }
];

const sampleRecords: InventoryRecord[] = [
  {
    id: 'rec-001',
    merchantId: 'tenant_x',
    productId: 'prod-105',
    variantId: 'var-315',
    sku: 'SKU-123-APL',
    warehouseId: 'wh-001',
    locationId: 'loc-001',
    batchId: 'batch-425',
    quantity: 288,
    reservedQuantity: 42,
    availableQuantity: 246,
    status: 'available',
    lastUpdatedAt: '2026-06-03 09:45:00'
  },
  {
    id: 'rec-002',
    merchantId: 'tenant_x',
    productId: 'prod-221',
    variantId: 'var-221',
    sku: 'SKU-221-BLK',
    warehouseId: 'wh-002',
    locationId: 'loc-002',
    quantity: 120,
    reservedQuantity: 0,
    status: 'on_hand',
    lastUpdatedAt: '2026-06-02 17:20:00'
  }
];

const sampleTransfers: InventoryTransfer[] = [
  {
    id: 'trans-001',
    merchantId: 'tenant_x',
    sku: 'SKU-123-APL',
    fromWarehouseId: 'wh-001',
    toWarehouseId: 'wh-002',
    quantity: 120,
    status: 'in_transit',
    scheduledAt: '2026-06-04',
    notes: '补齐上海冷链仓货品',
    createdAt: '2026-06-03'
  }
];

const sampleAdjustments: InventoryAdjustment[] = [
  {
    id: 'adj-001',
    merchantId: 'tenant_x',
    sku: 'SKU-221-BLK',
    warehouseId: 'wh-002',
    locationId: 'loc-002',
    adjustmentType: 'count',
    quantityDelta: -4,
    reason: '盘点差异',
    adjustedAt: '2026-06-03',
    createdAt: '2026-06-03'
  }
];

const sampleMovements: InventoryMovement[] = [
  {
    id: 'mov-001',
    merchantId: 'tenant_x',
    type: 'COUNT',
    inventoryRecordId: 'rec-001',
    variantId: 'var-315',
    batchId: 'batch-425',
    sku: 'SKU-123-APL',
    warehouseId: 'wh-001',
    quantity: 288,
    delta: 0,
    notes: '期末盘点确认数量',
    createdAt: '2026-06-03T09:50:00.000Z'
  },
  {
    id: 'mov-002',
    merchantId: 'tenant_x',
    type: 'TRANSFER',
    inventoryRecordId: 'rec-001',
    variantId: 'var-315',
    batchId: 'batch-425',
    sku: 'SKU-123-APL',
    fromWarehouseId: 'wh-001',
    toWarehouseId: 'wh-002',
    quantity: 120,
    delta: -120,
    notes: '调拨上海冷链仓',
    createdAt: '2026-06-03T11:10:00.000Z'
  },
  {
    id: 'mov-003',
    merchantId: 'tenant_x',
    type: 'DAMAGE',
    inventoryRecordId: 'rec-002',
    variantId: 'var-221',
    sku: 'SKU-221-BLK',
    warehouseId: 'wh-002',
    quantity: 4,
    delta: -4,
    notes: '盘点发现损坏',
    createdAt: '2026-06-03T14:20:00.000Z'
  }
];

export default function InventoryCenterView({ tenantId, activeSubTab }: InventoryCenterViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const summaryMetrics = useMemo(() => ({
    totalWarehouses: sampleWarehouses.length,
    totalLocations: sampleLocations.length,
    currentOnHand: sampleRecords.reduce((sum, record) => sum + record.quantity, 0),
    currentAvailable: sampleRecords.reduce((sum, record) => sum + computeAvailableQuantity(record), 0),
    pendingTransfers: sampleTransfers.filter((item) => item.status === 'pending' || item.status === 'in_transit').length,
    recentMovements: sampleMovements.length,
  }), []);

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader 
        title="库存中心" 
        subtitle="多仓库存监控、库位管理与调拨自动化管线"
        icon={Box}
        actions={
          <>
            <SearchInput 
              placeholder="搜索 SKU、批次或仓库..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              新增入库单
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard 
          label="库存总览" 
          value={summaryMetrics.currentOnHand} 
          icon={Box} 
          color="sky"
          description="当前全仓可用库存总量"
        />
        <StatsCard 
          label="活跃仓库" 
          value={summaryMetrics.totalWarehouses} 
          icon={Warehouse} 
          color="emerald"
          description="已启用的智能仓储中心"
        />
        <StatsCard 
          label="调拨进行中" 
          value={summaryMetrics.pendingTransfers} 
          icon={RotateCcw} 
          color="amber"
          description="跨仓在途与待收货单据"
        />
        <StatsCard 
          label="本月流水" 
          value={summaryMetrics.recentMovements} 
          icon={Activity} 
          color="indigo"
          description="入库/出库/损耗/盘点事件"
        />
      </div>

      <div className="grid gap-6">
        {activeSubTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <Table headers={['SKU', '仓库', '库位', '现有量', '占用', '可用', '状态']}>
                  {sampleRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono font-bold text-sky-400">{record.sku}</TableCell>
                      <TableCell>{sampleWarehouses.find(w => w.id === record.warehouseId)?.name}</TableCell>
                      <TableCell>{record.locationId}</TableCell>
                      <TableCell className="font-bold">{record.quantity}</TableCell>
                      <TableCell className="text-slate-500">{record.reservedQuantity || 0}</TableCell>
                      <TableCell className="text-emerald-400 font-bold">{computeAvailableQuantity(record)}</TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'available' ? 'success' : 'warning'}>
                          {record.status === 'available' ? '正常' : '锁定'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              </div>
              
              <div className="space-y-6">
                <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    近期库存变动
                  </h3>
                  <div className="space-y-4">
                    {sampleMovements.slice(0, 5).map((mov) => (
                      <div key={mov.id} className="flex items-center justify-between text-xs border-b border-slate-900 pb-3 last:border-0">
                        <div className="space-y-1">
                          <p className="text-slate-300 font-medium">{mov.sku}</p>
                          <p className="text-slate-500">{new Date(mov.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className={mov.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {mov.delta > 0 ? '+' : ''}{mov.delta}
                          </p>
                          <Badge className="text-[9px] px-1.5 py-0">{mov.type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'warehouses' && (
          <div className="space-y-6">
            <Table headers={['仓库名称', '代码', '容量', '占用率', '状态', '最后盘点', '操作']}>
              {sampleWarehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400">
                        <Warehouse className="w-4 h-4" />
                      </div>
                      <span className="font-bold">{warehouse.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{warehouse.code}</TableCell>
                  <TableCell>{warehouse.capacity.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="w-full max-w-[100px] space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>{Math.round((warehouse.occupancy / warehouse.capacity) * 100)}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-sky-500 transition-all" 
                          style={{ width: `${(warehouse.occupancy / warehouse.capacity) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={warehouse.status === 'active' ? 'success' : 'warning'}>
                      {warehouse.status === 'active' ? '运营中' : '维护中'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">{warehouse.lastAuditAt}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-sky-400 hover:bg-sky-400/10">管理</Button>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </div>
        )}

        {activeSubTab === 'locations' && (
          <div className="space-y-6">
            <Table headers={['库位名称', '所属仓库', '区域', '托盘号', '占用/容量', '状态', '操作']}>
              {sampleLocations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-bold text-white">{location.name}</TableCell>
                  <TableCell className="text-slate-400">{location.warehouseId}</TableCell>
                  <TableCell>{location.zone}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{location.palletId}</TableCell>
                  <TableCell>
                    <span className={location.occupied / location.capacity > 0.9 ? 'text-rose-400' : 'text-slate-300'}>
                      {location.occupied} / {location.capacity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={location.status === 'available' ? 'success' : 'warning'}>
                      {location.status === 'available' ? '空闲' : '占用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-sky-400 h-8 w-8 p-0">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </div>
        )}

        {activeSubTab === 'records' && (
          <div className="space-y-6">
            <Table headers={['SKU', '库存ID', '数量', '占用', '仓库', '更新时间', '状态']}>
              {sampleRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono font-bold text-sky-400">{record.sku}</TableCell>
                  <TableCell className="text-[10px] text-slate-500 font-mono">{record.id}</TableCell>
                  <TableCell className="font-bold">{record.quantity}</TableCell>
                  <TableCell className="text-slate-500">{record.reservedQuantity || 0}</TableCell>
                  <TableCell>{record.warehouseId}</TableCell>
                  <TableCell className="text-[10px] text-slate-500">{record.lastUpdatedAt}</TableCell>
                  <TableCell>
                    <Badge variant={record.status === 'available' ? 'success' : 'warning'}>
                      {record.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </div>
        )}

        {activeSubTab === 'transfers' && (
          <div className="space-y-6">
            <Table headers={['单据号', 'SKU', '路线', '数量', '计划日期', '状态', '操作']}>
              {sampleTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell className="font-mono font-bold text-amber-400">{transfer.id}</TableCell>
                  <TableCell className="font-mono text-xs">{transfer.sku}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{transfer.fromWarehouseId}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="text-slate-200">{transfer.toWarehouseId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{transfer.quantity}</TableCell>
                  <TableCell className="text-xs text-slate-500">{transfer.scheduledAt}</TableCell>
                  <TableCell>
                    <Badge variant="warning">{transfer.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-sky-400">查看</Button>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </div>
        )}

        {activeSubTab === 'adjustments' && (
          <div className="space-y-6">
            <Table headers={['调整号', 'SKU', '类型', '差异', '原因', '时间', '操作']}>
              {sampleAdjustments.map((adj) => (
                <TableRow key={adj.id}>
                  <TableCell className="font-mono font-bold text-rose-400">{adj.id}</TableCell>
                  <TableCell className="font-mono text-xs">{adj.sku}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{adj.adjustmentType}</Badge>
                  </TableCell>
                  <TableCell className={adj.quantityDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {adj.quantityDelta > 0 ? '+' : ''}{adj.quantityDelta}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{adj.reason}</TableCell>
                  <TableCell className="text-[10px] text-slate-500">{adj.adjustedAt}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-sky-400">详情</Button>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </div>
        )}

        {activeSubTab === 'movements' && (
          <div className="space-y-6">
            <Table headers={['类型', 'SKU', '变动量', '结存', '备注', '发生时间']}>
              {sampleMovements.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>
                    <Badge variant="outline">{mov.type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{mov.sku}</TableCell>
                  <TableCell className={mov.delta > 0 ? 'text-emerald-400' : mov.delta < 0 ? 'text-rose-400' : 'text-slate-400'}>
                    {mov.delta > 0 ? '+' : ''}{mov.delta}
                  </TableCell>
                  <TableCell className="font-bold">{mov.quantity}</TableCell>
                  <TableCell className="text-xs text-slate-500">{mov.notes}</TableCell>
                  <TableCell className="text-[10px] text-slate-500">{new Date(mov.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
