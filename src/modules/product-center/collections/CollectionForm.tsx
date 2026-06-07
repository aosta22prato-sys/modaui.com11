import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Collection } from '../../../types/modaui';

interface ProductOption {
  id: string;
  name: string;
}

interface CollectionFormProps {
  collection?: Partial<Collection>;
  productOptions: ProductOption[];
  onCancel: () => void;
  onSave: (payload: Partial<Collection>) => Promise<void>;
}

export default function CollectionForm({ collection, productOptions, onCancel, onSave }: CollectionFormProps) {
  const [name, setName] = useState(collection?.name || '');
  const [description, setDescription] = useState(collection?.description || '');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(collection?.productIds || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(collection?.name || '');
    setDescription(collection?.description || '');
    setSelectedProductIds(collection?.productIds || []);
    setError('');
  }, [collection]);

  const toggleProductId = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('集合名称不能为空。');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        productIds: selectedProductIds,
      });
      onCancel();
    } catch (err: any) {
      setError(err?.message || '保存集合失败。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="space-y-2 text-sm text-[#8B949E] block">
        <span>集合名称</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：春夏新品"
          className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
        />
      </label>
      <label className="space-y-2 text-sm text-[#8B949E] block">
        <span>集合描述</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="可选：与活动页和推荐区关联的集合说明。"
          className="w-full rounded-2xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500 resize-none"
        />
      </label>
      <div className="space-y-2 text-sm text-[#8B949E]">
        <div className="flex items-center justify-between">
          <span>关联商品</span>
          <span>{selectedProductIds.length} / {productOptions.length}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto rounded-2xl border border-[#2F3336] bg-[#09090B] p-3">
          {productOptions.map((product) => (
            <label key={product.id} className="inline-flex items-center gap-2 rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-[#d8dade] cursor-pointer">
              <input
                type="checkbox"
                checked={selectedProductIds.includes(product.id)}
                onChange={() => toggleProductId(product.id)}
                className="h-4 w-4 rounded border-[#2F3336] bg-[#09090B] text-sky-400"
              />
              <span>{product.name}</span>
            </label>
          ))}
        </div>
      </div>
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
          <Check className="w-4 h-4" /> 保存集合
        </button>
      </div>
    </form>
  );
}
