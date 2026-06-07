import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Archive } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { ProductBatch, ProductVariant } from '../../../types/modaui';
import BatchForm from './BatchForm';

interface BatchPanelProps {
  productId?: string;
  productName?: string;
  variants?: ProductVariant[];
}

export default function BatchPanel({ productId, productName, variants }: BatchPanelProps) {
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ProductBatch | null>(null);

  useEffect(() => {
    if (!productId) {
      setBatches([]);
      return;
    }
    loadBatches();
  }, [productId]);

  const loadBatches = async () => {
    if (!productId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiService.getProductBatches(productId);
      if (res?.success && Array.isArray(res.batches)) {
        setBatches(res.batches);
      } else {
        setBatches([]);
      }
    } catch (err: any) {
      setError(err?.message || '加载批次失败。');
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setEditingBatch(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (batch: ProductBatch) => {
    setEditingBatch(batch);
    setShowForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingBatch(null);
  };

  const handleSave = async (payload: Partial<ProductBatch>) => {
    if (!productId) return;
    setBusy(true);
    setError(null);
    try {
      if (editingBatch) {
        await apiService.updateProductBatch(editingBatch.id, payload);
      } else {
        await apiService.createProductBatch({ productId, ...payload });
      }
      await loadBatches();
      setShowForm(false);
      setEditingBatch(null);
    } catch (err: any) {
      setError(err?.message || '保存批次失败。');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (batchId: string) => {
    if (!productId) return;
    const confirmed = window.confirm('确定删除这个库存批次记录吗？');
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await apiService.deleteProductBatch(batchId);
      await loadBatches();
    } catch (err: any) {
      setError(err?.message || '删除批次失败。');
    } finally {
      setBusy(false);
    }
  };

  if (!productId) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] rounded-3xl border border-dashed border-[#2F3336] bg-[#09090B]/50 text-center text-sm text-[#8B949E]">
        <div className="mb-3 rounded-full bg-[#1D9BF0]/10 p-4 text-sky-400">
          <Archive className="w-6 h-6" />
        </div>
        <h3 className="text-white text-lg font-semibold">请选择商品以管理批次</h3>
        <p className="mt-2 max-w-xl">批次信息是库存、采购和销售的核心基础。请选择具体商品后继续。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-[#2F3336] bg-[#09090B] p-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-sky-500/10 px-3 py-2 text-sky-300 text-xs">
            <Archive className="w-4 h-4" /> 批次域
          </div>
          <h3 className="mt-4 text-xl font-bold text-white">{productName || '商品'} 的库存批次</h3>
          <p className="mt-2 text-sm text-[#8B949E]">记录 SKU 对应的批次库存与到期信息。</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
        >
          <Plus className="w-4 h-4" /> 新增批次
        </button>
      </div>

      {error && <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

      {showForm && (
        <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-6">
          <BatchForm batch={editingBatch ?? undefined} variants={variants ?? []} onCancel={handleCancel} onSave={handleSave} />
        </div>
      )}

      <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-6">
        {busy ? (
          <div className="py-10 text-center text-sm text-[#8B949E]">正在加载批次…</div>
        ) : batches.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#2F3336] p-6 text-sm text-[#8B949E]">当前商品尚未创建批次库存。创建批次后，可用于库存与采购运算。</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {batches.map((batch) => (
              <div key={batch.id} className="rounded-3xl border border-[#2F3336] bg-[#09090B] p-5 text-sm text-white">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <p className="font-semibold">{batch.batchNumber}</p>
                    <p className="text-[#8B949E] mt-2">数量：{batch.quantity}</p>
                    {batch.variantSku && <p className="text-[#8B949E]">关联 SKU：{batch.variantSku}</p>}
                    {batch.receivedAt && <p className="text-[#8B949E]">接收：{batch.receivedAt}</p>}
                    {batch.expiresAt && <p className="text-[#8B949E]">到期：{batch.expiresAt}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(batch)}
                      className="rounded-2xl border border-[#2F3336] px-3 py-2 text-[11px] text-[#8B949E] hover:bg-neutral-900"
                    >编辑</button>
                    <button
                      type="button"
                      onClick={() => handleDelete(batch.id)}
                      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 hover:bg-rose-500/15"
                    >删除</button>
                  </div>
                </div>
                {batch.notes && <p className="mt-3 text-[#8B949E]">备注：{batch.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
