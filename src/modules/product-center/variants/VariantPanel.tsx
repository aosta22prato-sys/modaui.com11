import React, { useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, Package, Layers } from 'lucide-react';
import { ProductVariant } from '../../../types/modaui';
import VariantForm from './VariantForm';

interface VariantPanelProps {
  productId: string;
  productName: string;
  variants: ProductVariant[];
  onCreateVariant: (payload: Partial<ProductVariant>) => Promise<void>;
  onUpdateVariant: (variantId: string, payload: Partial<ProductVariant>) => Promise<void>;
  onDeleteVariant: (variantId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function VariantPanel({
  productId,
  productName,
  variants,
  onCreateVariant,
  onUpdateVariant,
  onDeleteVariant,
  onRefresh,
}: VariantPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedVariants = useMemo(
    () => [...variants].sort((a, b) => a.sku.localeCompare(b.sku)),
    [variants]
  );

  const openCreate = () => {
    setEditingVariant(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setShowForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVariant(null);
    setError(null);
  };

  const handleSave = async (payload: Partial<ProductVariant>) => {
    setBusy(true);
    setError(null);
    try {
      if (editingVariant) {
        await onUpdateVariant(editingVariant.id, payload);
      } else {
        await onCreateVariant(payload);
      }
      await onRefresh();
      setShowForm(false);
    } catch (err: any) {
      setError(err?.message || '保存变体失败。');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (variantId: string) => {
    const yes = window.confirm('确定删除这个 SKU 变体吗？此操作不可恢复。');
    if (!yes) return;
    setBusy(true);
    setError(null);
    try {
      await onDeleteVariant(variantId);
      await onRefresh();
    } catch (err: any) {
      setError(err?.message || '删除变体失败。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#2F3336] bg-[#09090B] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-sky-500/10 px-3 py-2 text-sky-300 text-xs">
              <Layers className="w-4 h-4" /> SKU 管理
            </div>
            <h3 className="mt-4 text-xl font-bold text-white">{productName} 的 SKU 变体</h3>
            <p className="text-sm text-[#8B949E] mt-2">维护变体列表，建立真实库存单元和后续采购、销售基础。</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
          >
            <Plus className="w-4 h-4" /> 新增 SKU
          </button>
        </div>

        {error && <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[#d8dade]">
            <thead className="bg-[#0b0c0f] text-[#8B949E] text-[10px] uppercase tracking-[0.14em]">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">属性</th>
                <th className="px-4 py-3">价格</th>
                <th className="px-4 py-3">库存</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2F3336]/50">
              {sortedVariants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#8B949E]">
                    尚未创建 SKU 变体。请点击“新增 SKU”开始构建。
                  </td>
                </tr>
              ) : (
                sortedVariants.map((variant) => (
                  <tr key={variant.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 font-semibold text-white">{variant.sku}</td>
                    <td className="px-4 py-4 text-sm text-[#8B949E]">{Object.entries(variant.attributes || {}).map(([key, value]) => `${key}:${value}`).join(', ') || '无'}</td>
                    <td className="px-4 py-4 text-sm text-emerald-300">¥{variant.price?.toFixed(2) ?? '0.00'}</td>
                    <td className="px-4 py-4 text-sm text-[#8B949E]">{variant.inventory ?? 0}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] ${variant.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                        {variant.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-4 space-x-2">
                      <button
                        type="button"
                        onClick={() => openEdit(variant)}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#2F3336] px-3 py-2 text-[11px] text-[#8B949E] hover:bg-neutral-900"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> 编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(variant.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 hover:bg-rose-500/15 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> 删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="rounded-3xl border border-[#2F3336] bg-[#09090B] p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{editingVariant ? '编辑 SKU 变体' : '新增 SKU 变体'}</p>
              <p className="text-xs text-[#8B949E]">SKU 作为库存单元，是库存、采购、销售的最小核心实体。</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-[#1b2933] px-3 py-2 text-xs text-[#8B949E]">
              <Package className="w-4 h-4" /> {sortedVariants.length} 个变体
            </div>
          </div>

          <VariantForm
            productId={productId}
            variant={editingVariant ?? undefined}
            mode={editingVariant ? 'edit' : 'create'}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  );
}
