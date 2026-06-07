import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { ProductVariant } from '../../../types/modaui';

interface VariantFormProps {
  mode: 'create' | 'edit';
  productId: string;
  variant?: Partial<ProductVariant>;
  onCancel: () => void;
  onSave: (payload: Partial<ProductVariant>) => Promise<void>;
}

function parseAttributes(text: string) {
  const attributes: Record<string, string> = {};
  text.split(/[,;\n]/g).forEach((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const [key, ...rest] = trimmed.split(/[:=]/);
    const value = rest.join(':')?.trim();
    if (key && value !== undefined) {
      attributes[key.trim()] = value;
    }
  });
  return attributes;
}

function formatAttributes(attributes: Record<string, string> = {}) {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
}

export default function VariantForm({ mode, productId, variant, onCancel, onSave }: VariantFormProps) {
  const [sku, setSku] = useState(variant?.sku || '');
  const [attributes, setAttributes] = useState(formatAttributes(variant?.attributes));
  const [price, setPrice] = useState(variant?.price?.toString() || '0');
  const [inventory, setInventory] = useState(variant?.inventory?.toString() || '0');
  const [image, setImage] = useState(variant?.image || '');
  const [isActive, setIsActive] = useState(variant?.isActive ?? true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSku(variant?.sku || '');
    setAttributes(formatAttributes(variant?.attributes));
    setPrice(variant?.price?.toString() || '0');
    setInventory(variant?.inventory?.toString() || '0');
    setImage(variant?.image || '');
    setIsActive(variant?.isActive ?? true);
    setError('');
  }, [variant]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    if (!sku.trim()) {
      setError('SKU 必填。');
      setSubmitting(false);
      return;
    }

    try {
      await onSave({
        productId,
        sku: sku.trim(),
        attributes: parseAttributes(attributes),
        price: parseFloat(price) || 0,
        inventory: parseInt(inventory) || 0,
        image: image.trim() || undefined,
        isActive,
      });
      onCancel();
    } catch (err: any) {
      setError(err?.message || '保存变体时出错。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-2 text-sm text-[#8B949E]">
          <span>SKU</span>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="例如：TSHIRT-BLK-M"
            className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <label className="space-y-2 text-sm text-[#8B949E]">
          <span>价格 (¥)</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            step="0.01"
            min="0"
            className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <label className="space-y-2 text-sm text-[#8B949E]">
          <span>库存</span>
          <input
            type="number"
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            min="0"
            className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <label className="space-y-2 text-sm text-[#8B949E]">
          <span>图片 URL</span>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
      </div>

      <label className="space-y-2 text-sm text-[#8B949E] block">
        <span>属性 (例如: Color:Black, Size:M)</span>
        <textarea
          value={attributes}
          onChange={(e) => setAttributes(e.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500 resize-none"
          placeholder="Color:Black, Size:M"
        />
      </label>

      <label className="inline-flex items-center gap-3 text-sm text-[#8B949E]">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-[#2F3336] bg-[#09090B] text-sky-400 focus:ring-sky-400"
        />
        <span>变体已启用</span>
      </label>

      {error && <div className="text-rose-400 text-sm">{error}</div>}

      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-[#2F3336]">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[#2F3336] px-4 py-2 text-[#8B949E] hover:border-slate-500"
        >
          <X className="w-4 h-4 inline-block mr-1" /> 取消
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Check className="w-4 h-4" /> {mode === 'create' ? '新增变体' : '保存变体'}
        </button>
      </div>
    </form>
  );
}
