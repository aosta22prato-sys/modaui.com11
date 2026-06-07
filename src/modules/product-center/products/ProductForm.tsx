import React, { useEffect, useState } from 'react';
import { SPUProduct } from '../../types/modaui';
import { Check, X } from 'lucide-react';

interface ProductFormProps {
  mode: 'create' | 'edit';
  product?: Partial<SPUProduct>;
  categories?: string[];
  onCancel: () => void;
  onSave: (data: Partial<SPUProduct>) => Promise<void>;
}

export default function ProductForm({ mode, product, categories = [], onCancel, onSave }: ProductFormProps) {
  const [name, setName] = useState(product?.name || '');
  const [desc, setDesc] = useState(product?.desc || '');
  const [category, setCategory] = useState(product?.category || 'Uncategorized');
  const [price, setPrice] = useState(product?.price?.toString() || '0');
  const [inventory, setInventory] = useState(product?.inventory?.toString() || product?.stock?.toString() || '0');
  const [sku, setSku] = useState(product?.barcode || product?.id || '');
  const [brand, setBrand] = useState(product?.brandId || '');
  const [image, setImage] = useState(product?.image || '');
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(product?.name || '');
    setDesc(product?.desc || '');
    setCategory(product?.category || 'Uncategorized');
    setPrice(product?.price?.toString() || '0');
    setInventory(product?.inventory?.toString() || product?.stock?.toString() || '0');
    setSku(product?.barcode || product?.sku || '');
    setBrand(product?.brandId || '');
    setImage(product?.image || '');
    setIsActive(product?.isActive ?? true);
    setIsFeatured(product?.isFeatured ?? false);
    setError('');
  }, [product]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    if (!name.trim()) {
      setError('商品名称不能为空。');
      setSubmitting(false);
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        desc: desc.trim(),
        category: category.trim(),
        price: parseFloat(price) || 0,
        inventory: parseInt(inventory) || 0,
        barcode: sku.trim() || undefined,
        sku: sku.trim() || undefined,
        brandId: brand.trim() || undefined,
        image: image.trim(),
        isActive,
        isFeatured,
      });
      onCancel();
    } catch (err: any) {
      setError(err?.message || '保存商品时出错。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-2 text-sm text-[#8B949E]">
          <span>商品名称</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：轻奢经典连衣裙"
            className="w-full bg-[#0b0b0d] border border-[#2F3336] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <label className="space-y-2 text-sm text-[#8B949E]">
          <span>分类</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="例如：本季新品"
            className="w-full bg-[#0b0b0d] border border-[#2F3336] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
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
            className="w-full bg-[#0b0b0d] border border-[#2F3336] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <label className="space-y-2 text-sm text-[#8B949E]">
          <span>库存</span>
          <input
            type="number"
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            min="0"
            className="w-full bg-[#0b0b0d] border border-[#2F3336] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-2 text-sm text-[#8B949E] block">
          <span>品牌</span>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="例如：Aria Studio"
            className="w-full bg-[#0b0b0d] border border-[#2F3336] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <label className="space-y-2 text-sm text-[#8B949E] block">
          <span>SKU / 条码</span>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="例如：SKU-2026-FASH-001"
            className="w-full bg-[#0b0b0d] border border-[#2F3336] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
      </div>

      <label className="space-y-2 text-sm text-[#8B949E] block">
        <span>商品描述</span>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          className="w-full bg-[#0b0b0d] border border-[#2F3336] rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500 resize-none"
          placeholder="输入商品卖点、规格说明、适用场景等"
        />
      </label>

      <label className="space-y-2 text-sm text-[#8B949E] block">
        <span>主图 URL</span>
        <input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://..."
          className="w-full bg-[#0b0b0d] border border-[#2F3336] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
        />
      </label>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="inline-flex items-center gap-2 text-sm text-[#8B949E]">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-[#2F3336] bg-[#09090B] text-sky-400 focus:ring-sky-400"
          />
          上架中
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[#8B949E]">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="rounded border-[#2F3336] bg-[#09090B] text-sky-400 focus:ring-sky-400"
          />
          推荐商品
        </label>
      </div>

      {error && <div className="text-rose-400 text-sm">{error}</div>}

      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-[#2F3336]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-[#2F3336] text-[#8B949E] hover:border-slate-500"
        >
          <X className="w-4 h-4 inline-block mr-1" /> 取消
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 rounded-xl bg-sky-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          {mode === 'create' ? '创建商品' : '保存修改'}
        </button>
      </div>
    </form>
  );
}
