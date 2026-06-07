import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, Layers } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { Collection } from '../../../types/modaui';
import CollectionForm from './CollectionForm';

interface ProductOption {
  id: string;
  name: string;
}

interface CollectionPanelProps {
  tenantId: string;
  productOptions: ProductOption[];
}

export default function CollectionPanel({ tenantId, productOptions }: CollectionPanelProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    loadCollections();
  }, [tenantId]);

  const loadCollections = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiService.getCollections(tenantId);
      if (res?.success && Array.isArray(res.collections)) {
        setCollections(res.collections);
      } else {
        setCollections([]);
      }
    } catch (err: any) {
      setError(err?.message || '加载集合失败。');
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setEditingCollection(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setShowForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCollection(null);
  };

  const handleSave = async (payload: Partial<Collection>) => {
    setBusy(true);
    setError(null);
    try {
      if (editingCollection) {
        await apiService.updateCollection(editingCollection.id, payload);
      } else {
        await apiService.createCollection(tenantId, payload);
      }
      await loadCollections();
      setShowForm(false);
      setEditingCollection(null);
    } catch (err: any) {
      setError(err?.message || '保存集合失败。');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (collectionId: string) => {
    const confirmed = window.confirm('确定删除此商品集合吗？此操作将删除集合本身，但不会删除商品。');
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await apiService.deleteCollection(collectionId);
      await loadCollections();
    } catch (err: any) {
      setError(err?.message || '删除集合失败。');
    } finally {
      setBusy(false);
    }
  };

  const productCount = useMemo(
    () => collections.reduce((acc, collection) => acc + (collection.productIds?.length || 0), 0),
    [collections]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-[#2F3336] bg-[#09090B] p-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-violet-500/10 px-3 py-2 text-violet-300 text-xs">
            <Layers className="w-4 h-4" /> 集合域
          </div>
          <h3 className="mt-4 text-xl font-bold text-white">集合管理</h3>
          <p className="mt-2 text-sm text-[#8B949E]">定义产品展示与营销集合，构建商品与推荐展示关系。</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400"
        >
          <Plus className="w-4 h-4" /> 新建集合
        </button>
      </div>

      {error && <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

      {showForm && (
        <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-6">
          <CollectionForm
            collection={editingCollection ?? undefined}
            productOptions={productOptions}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        </div>
      )}

      <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <h4 className="text-sm font-semibold text-white">商品集合列表</h4>
            <p className="text-xs text-[#8B949E] mt-1">集合用于营销展示和商品分组。</p>
          </div>
          <div className="text-xs text-[#8B949E]">{collections.length} 个集合 · {productCount} 个关联商品</div>
        </div>

        {busy ? (
          <div className="py-10 text-center text-sm text-[#8B949E]">正在加载集合…</div>
        ) : collections.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#2F3336] p-6 text-sm text-[#8B949E]">目前还没有商品集合。创建集合后，可通过集合筛选商品。</div>
        ) : (
          <div className="space-y-4">
            {collections.map((collection) => (
              <div key={collection.id} className="rounded-3xl border border-[#2F3336] bg-[#09090B] p-5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                    <p className="text-white text-base font-semibold">{collection.name}</p>
                    <p className="text-sm text-[#8B949E] mt-2">{collection.description || '暂无集合描述。'}</p>
                    <p className="text-xs text-[#8B949E] mt-2">关联商品 {collection.productIds?.length || 0} 个</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(collection)}
                      className="rounded-2xl border border-[#2F3336] px-3 py-2 text-[11px] text-[#8B949E] hover:bg-neutral-900"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> 编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(collection.id)}
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
