import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { ProductBatch, ProductVariant } from '../../../types/modaui';

interface BatchFormProps {
  batch?: Partial<ProductBatch>;
  variants: ProductVariant[];
  onCancel: () => void;
  onSave: (payload: Partial<ProductBatch>) => Promise<void>;
}

export default function BatchForm({ batch, variants, onCancel, onSave }: BatchFormProps) {
  const [batchNumber, setBatchNumber] = useState(batch?.batchNumber || '');
  const [variantId, setVariantId] = useState(batch?.variantId || '');
  const [quantity, setQuantity] = useState(batch?.quantity?.toString() || '0');
  const [receivedAt, setReceivedAt] = useState(batch?.receivedAt || '');
  const [expiresAt, setExpiresAt] = useState(batch?.expiresAt || '');
  const [notes, setNotes] = useState(batch?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBatchNumber(batch?.batchNumber || '');
    setVariantId(batch?.variantId || '');
    setQuantity(batch?.quantity?.toString() || '0');
    setReceivedAt(batch?.receivedAt || '');
    setExpiresAt(batch?.expiresAt || '');
    setNotes(batch?.notes || '');
    setError('');
  }, [batch]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!batchNumber.trim()) {
      setError('批次编号不能为空。');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        batchNumber: batchNumber.trim(),
        variantId: variantId || undefined,
        quantity: parseInt(quantity) || 0,
        receivedAt: receivedAt || undefined,
        expiresAt: expiresAt || undefined,
        notes: notes.trim() || undefined,
      });
      onCancel();
    } catch (err: any) {
      setError(err?.message || '保存批次失败。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-2 text-sm text-[#8B949E] block">
          <span>批次号</span>
          <input
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="例如：BATCH-202606"
            className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <label className="space-y-2 text-sm text-[#8B949E] block">
          <span>关联 SKU</span>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          >
            <option value="">无 SKU 关联</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.sku} {Object.entries(variant.attributes || {}).map(([k, v]) => `${k}:${v}`).join(', ')}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-2 text-sm text-[#8B949E] block">
          <span>数量</span>
          <input
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <label className="space-y-2 text-sm text-[#8B949E] block">
          <span>接收日期</span>
          <input
            type="date"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-2 text-sm text-[#8B949E] block">
          <span>到期日期</span>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <div />
      </div>

      <label className="space-y-2 text-sm text-[#8B949E] block">
        <span>备注</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="可选：批次来源、供应商、质检说明等。"
          className="w-full rounded-2xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500 resize-none"
        />
      </label>
      {error && <div className="text-rose-400 text-sm">{error}</div>}
      <div className="flex justify-end gap-3 pt-2 border-t border-[#2F3336]">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[#2F3336] px-4 py-2 text-sm text-[#8B949E] hover:border-slate-500"
        >
          <X className="w-4 h-4 inline-block mr-1" /> 取消
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Check className="w-4 h-4" /> 保存批次
        </button>
      </div>
    </form>
  );
}
