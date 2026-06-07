import React, { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, Tag } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { Brand } from '../../../types/modaui';
import BrandForm from './BrandForm';

interface BrandPanelProps {
  tenantId: string;
}

export default function BrandPanel({ tenantId }: BrandPanelProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    loadBrands();
  }, [tenantId]);

  const loadBrands = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiService.getBrands(tenantId);
      if (res?.success && Array.isArray(res.brands)) {
        setBrands(res.brands);
      } else {
        setBrands([]);
      }
    } catch (err: any) {
      setError(err?.message || '加载品牌失败。');
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setEditingBrand(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setShowForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingBrand(null);
  };

  const handleSave = async (payload: Partial<Brand>) => {
    setBusy(true);
    setError(null);
    try {
      if (editingBrand) {
        await apiService.updateBrand(editingBrand.id, payload);
      } else {
        await apiService.createBrand(tenantId, payload);
      }
      await loadBrands();
      setShowForm(false);
      setEditingBrand(null);
    } catch (err: any) {
      setError(err?.message || '保存品牌失败。');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (brandId: string) => {
    const confirmed = window.confirm('确定删除此品牌吗？该操作会清理品牌标签但不会自动删除商品。');
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await apiService.deleteBrand(brandId);
      await loadBrands();
    } catch (err: any) {
      setError(err?.message || '删除品牌失败。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-[#2F3336] bg-[#09090B] p-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-sky-500/10 px-3 py-2 text-sky-300 text-xs">
            <Tag className="w-4 h-4" /> 品牌域
          </div>
          <h3 className="mt-4 text-xl font-bold text-white">品牌管理</h3>
          <p className="mt-2 text-sm text-[#8B949E]">维护 MODAUI 商品域中的品牌实体，构建产品与品牌的真实关系。</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
        >
          <Plus className="w-4 h-4" /> 新建品牌
        </button>
      </div>

      {error && <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

      {showForm && (
        <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-6">
          <BrandForm brand={editingBrand ?? undefined} onCancel={handleCancel} onSave={handleSave} />
        </div>
      )}

      <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-6">
        <div className="flex items-center justify-between mb-5 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-white">品牌列表</h4>
            <p className="text-xs text-[#8B949E] mt-1">当前已定义的品牌会被商品 `brandId` 关联。</p>
          </div>
          <div className="text-xs text-[#8B949E]">{brands.length} 个品牌</div>
        </div>

        {busy ? (
          <div className="py-10 text-center text-sm text-[#8B949E]">正在加载品牌…</div>
        ) : brands.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#2F3336] p-6 text-sm text-[#8B949E]">目前还没有品牌。创建品牌后，可在商品编辑时关联。</div>
        ) : (
          <div className="space-y-4">
            {brands.map((brand) => (
              <div key={brand.id} className="rounded-3xl border border-[#2F3336] bg-[#09090B] p-5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                    <p className="text-white text-base font-semibold">{brand.name}</p>
                    <p className="text-sm text-[#8B949E] mt-2">{brand.description || '暂无品牌描述。'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(brand)}
                      className="rounded-2xl border border-[#2F3336] px-3 py-2 text-[11px] text-[#8B949E] hover:bg-neutral-900"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> 编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(brand.id)}
                      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 hover:bg-rose-500/15"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 删除
                    </button>
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
