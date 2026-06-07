import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Image } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { ProductImage } from '../../../types/modaui';
import ImageForm from './ImageForm';

interface ImagePanelProps {
  productId?: string;
  productName?: string;
}

export default function ImagePanel({ productId, productName }: ImagePanelProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null);

  useEffect(() => {
    if (!productId) {
      setImages([]);
      return;
    }
    loadImages();
  }, [productId]);

  const loadImages = async () => {
    if (!productId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiService.getProductImages(productId);
      if (res?.success && Array.isArray(res.images)) {
        setImages(res.images);
      } else {
        setImages([]);
      }
    } catch (err: any) {
      setError(err?.message || '加载图片失败。');
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setEditingImage(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (image: ProductImage) => {
    setEditingImage(image);
    setShowForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingImage(null);
  };

  const handleSave = async (payload: Partial<ProductImage>) => {
    if (!productId) return;
    setBusy(true);
    setError(null);
    try {
      if (editingImage) {
        await apiService.deleteProductImage(editingImage.id);
        await apiService.createProductImage({ productId, ...payload });
      } else {
        await apiService.createProductImage({ productId, ...payload });
      }
      await loadImages();
      setShowForm(false);
      setEditingImage(null);
    } catch (err: any) {
      setError(err?.message || '保存图片失败。');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!productId) return;
    const confirmed = window.confirm('确定删除这张商品图片吗？');
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await apiService.deleteProductImage(imageId);
      await loadImages();
    } catch (err: any) {
      setError(err?.message || '删除图片失败。');
    } finally {
      setBusy(false);
    }
  };

  if (!productId) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] rounded-3xl border border-dashed border-[#2F3336] bg-[#09090B]/50 text-center text-sm text-[#8B949E]">
        <div className="mb-3 rounded-full bg-[#1D9BF0]/10 p-4 text-sky-400">
          <ImageIcon className="w-6 h-6" />
        </div>
        <h3 className="text-white text-lg font-semibold">请选择商品以管理图片</h3>
        <p className="mt-2 max-w-xl">商品图片是商品详情的核心组成部分。请先从列表中打开一个商品详情。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-[#2F3336] bg-[#09090B] p-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-sky-500/10 px-3 py-2 text-sky-300 text-xs">
            <ImageIcon className="w-4 h-4" /> 图片域
          </div>
          <h3 className="mt-4 text-xl font-bold text-white">{productName || '商品'} 的商品图片</h3>
          <p className="mt-2 text-sm text-[#8B949E]">管理商品的展示图、主图和排序信息。</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
        >
          <Plus className="w-4 h-4" /> 新增图片
        </button>
      </div>

      {error && <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

      {showForm && (
        <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-6">
          <ImageForm image={editingImage ?? undefined} onCancel={handleCancel} onSave={handleSave} />
        </div>
      )}

      <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-6">
        {busy ? (
          <div className="py-10 text-center text-sm text-[#8B949E]">正在加载图片…</div>
        ) : images.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#2F3336] p-6 text-sm text-[#8B949E]">当前商品尚未上传图片。创建图片后，可在商品详情页展示。</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((image) => (
              <div key={image.id} className="rounded-3xl border border-[#2F3336] bg-[#09090B] overflow-hidden">
                <div className="h-44 bg-[#111]">
                  <img src={image.url} alt={image.alt || '商品图片'} className="h-full w-full object-cover" />
                </div>
                <div className="p-4 space-y-2 text-sm text-white">
                  <p className="font-semibold truncate">{image.alt || '未命名图片'}</p>
                  <p className="text-[#8B949E]">排序：{image.orderIndex ?? 0}</p>
                  <p className="text-[#8B949E]">主图：{image.isPrimary ? '是' : '否'}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => openEdit(image)}
                      className="rounded-2xl border border-[#2F3336] px-3 py-2 text-[11px] text-[#8B949E] hover:bg-neutral-900"
                    >编辑</button>
                    <button
                      type="button"
                      onClick={() => handleDelete(image.id)}
                      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 hover:bg-rose-500/15"
                    >删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
