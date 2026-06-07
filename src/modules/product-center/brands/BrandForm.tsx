import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Brand } from '../../../types/modaui';

interface BrandFormProps {
  brand?: Partial<Brand>;
  onCancel: () => void;
  onSave: (payload: Partial<Brand>) => Promise<void>;
}

export default function BrandForm({ brand, onCancel, onSave }: BrandFormProps) {
  const [name, setName] = useState(brand?.name || '');
  const [description, setDescription] = useState(brand?.description || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(brand?.name || '');
    setDescription(brand?.description || '');
    setError('');
  }, [brand]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('品牌名称不能为空。');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onCancel();
    } catch (err: any) {
      setError(err?.message || '保存品牌时出错。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="space-y-2 text-sm text-[#8B949E] block">
        <span>品牌名称</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：Nova Studio"
          className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
        />
      </label>
      <label className="space-y-2 text-sm text-[#8B949E] block">
        <span>品牌描述</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="可选：用于品牌故事与筛选维度的补充说明。"
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
          <Check className="w-4 h-4" /> 保存品牌
        </button>
      </div>
    </form>
  );
}
