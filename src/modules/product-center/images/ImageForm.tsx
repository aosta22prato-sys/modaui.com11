import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { ProductImage } from '../../../types/modaui';

interface ImageFormProps {
  image?: Partial<ProductImage>;
  onCancel: () => void;
  onSave: (payload: Partial<ProductImage>) => Promise<void>;
}

export default function ImageForm({ image, onCancel, onSave }: ImageFormProps) {
  const [url, setUrl] = useState(image?.url || '');
  const [alt, setAlt] = useState(image?.alt || '');
  const [isPrimary, setIsPrimary] = useState(image?.isPrimary ?? false);
  const [orderIndex, setOrderIndex] = useState(image?.order?.toString() || '0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUrl(image?.url || '');
    setAlt(image?.alt || '');
    setIsPrimary(image?.isPrimary ?? false);
    setOrderIndex(image?.order?.toString() || '0');
    setError('');
  }, [image]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!url.trim()) {
      setError('图片 URL 不能为空。');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        url: url.trim(),
        alt: alt.trim() || undefined,
        isPrimary,
        orderIndex: parseInt(orderIndex) || 0,
      });
      onCancel();
    } catch (err: any) {
      setError(err?.message || '保存图片时出错。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="space-y-2 text-sm text-[#8B949E] block">
        <span>图片链接</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
        />
      </label>
      <label className="space-y-2 text-sm text-[#8B949E] block">
        <span>图片说明</span>
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="例如：正面展示图"
          className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="inline-flex items-center gap-3 text-sm text-[#8B949E]">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="h-4 w-4 rounded border-[#2F3336] bg-[#09090B] text-sky-400"
          />
          <span>主图</span>
        </label>
        <label className="space-y-2 text-sm text-[#8B949E] block">
          <span>排序</span>
          <input
            type="number"
            min="0"
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            className="w-full rounded-xl border border-[#2F3336] bg-[#0b0b0d] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
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
          <Check className="w-4 h-4" /> 保存图片
        </button>
      </div>
    </form>
  );
}
