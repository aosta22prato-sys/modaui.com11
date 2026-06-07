import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit3, Trash2, Layers, Folder, Box, Database, ShoppingBag, Eye, Tag, ArrowLeft } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { Collection, ProductVariant, SPUProduct } from '../../types/modaui';
import ProductForm from './products/ProductForm';
import VariantPanel from './variants/VariantPanel';
import BrandPanel from './brands/BrandPanel';
import CollectionPanel from './collections/CollectionPanel';
import ImagePanel from './images/ImagePanel';
import BatchPanel from './batches/BatchPanel';

type ProductSubTab = 'list' | 'categories' | 'inventory' | 'sku' | 'brands' | 'collections' | 'images' | 'batches' | 'suppliers' | 'purchase';

interface ProductCenterViewProps {
  tenantId: string;
  activeSubTab: ProductSubTab;
}

export default function ProductCenterView({ tenantId, activeSubTab }: ProductCenterViewProps) {
  const [products, setProducts] = useState<SPUProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SPUProduct | null>(null);
  const [detailProduct, setDetailProduct] = useState<SPUProduct | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [loadingDetail, setLoadingDetail] = useState(false);

  const normalizeVariant = (variant: any): ProductVariant => ({
    ...variant,
    attributes: typeof variant.attributes === 'string' ? JSON.parse(variant.attributes || '{}') : variant.attributes || {},
    isActive: variant.isActive === 1 || variant.isActive === true,
    price: variant.price !== undefined ? parseFloat(String(variant.price)) : 0,
    inventory: variant.inventory !== undefined ? parseInt(String(variant.inventory)) : 0,
  });

  const enrichProductDetails = (product: any): SPUProduct => ({
    ...product,
    variants: Array.isArray(product.variants) ? product.variants.map(normalizeVariant) : [],
    batches: Array.isArray(product.batches) ? product.batches : [],
    imagesMeta: Array.isArray(product.images) ? product.images : [],
    collections: Array.isArray(product.collections) ? product.collections : [],
    brand: product.brand || null,
  });

  const fetchProductDetails = async (product: SPUProduct) => {
    setLoadingDetail(true);
    try {
      const res = await apiService.getProductDetails(product.id);
      if (res?.success && res.product) {
        setDetailProduct(enrichProductDetails({ ...res.product, variants: res.variants, batches: res.batches, images: res.images, collections: res.collections }));
      } else {
        setDetailProduct(product);
      }
    } catch (err: any) {
      console.error('Failed to load product details', err);
      setDetailProduct(product);
    } finally {
      setLoadingDetail(false);
    }
  };

  const refreshProductDetails = async () => {
    if (!detailProduct?.id) return;
    await fetchProductDetails(detailProduct);
  };

  const createVariant = async (payload: Partial<ProductVariant>) => {
    if (!detailProduct?.id) throw new Error('请先选择一个商品。');
    await apiService.createProductVariant({ ...payload, productId: detailProduct.id });
  };

  const updateVariant = async (variantId: string, payload: Partial<ProductVariant>) => {
    await apiService.updateProductVariant(variantId, payload);
  };

  const removeVariant = async (variantId: string) => {
    await apiService.deleteProductVariant(variantId);
  };

  useEffect(() => {
    if (!tenantId) return;
    fetchProducts();
  }, [tenantId]);

  useEffect(() => {
    if (activeSubTab === 'categories') {
      fetchCategories();
    }
  }, [activeSubTab, tenantId]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getProducts(tenantId);
      if (res?.success && Array.isArray(res.products)) {
        setProducts(
          res.products.map((product: any) => ({
            ...product,
            inventory: product.inventory ?? product.stock ?? 0,
            stock: product.inventory ?? product.stock ?? 0,
          }))
        );
      } else {
        setProducts([]);
      }
      if (activeSubTab === 'categories') {
        await fetchCategories();
      }
    } catch (err: any) {
      setError(err?.message || '加载商品失败。');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setBusy(true);
    try {
      const res = await apiService.getCategories(tenantId);
      if (res?.success && Array.isArray(res.categories)) {
        setCategories(res.categories.map((category: any) => category?.name || category?.id || String(category)));
      } else {
        setCategories([]);
      }
    } catch (err: any) {
      console.error('Failed to load categories', err);
      setCategories([]);
    } finally {
      setBusy(false);
    }
  };

  const openCreateProduct = () => {
    setSelectedProduct(null);
    setDetailProduct(null);
    setFormMode('create');
    setShowForm(true);
  };

  const openEditProduct = (product: SPUProduct) => {
    setSelectedProduct(product);
    setDetailProduct(product);
    setFormMode('edit');
    setShowForm(true);
  };

  const openDetailProduct = async (product: SPUProduct) => {
    setDetailProduct(product);
    await fetchProductDetails(product);
  };

  const closeDetailProduct = () => {
    setDetailProduct(null);
  };

  const handleSaveProduct = async (productData: Partial<SPUProduct>) => {
    setBusy(true);
    setError(null);
    try {
      if (formMode === 'create') {
        const res = await apiService.createProduct(tenantId, {
          ...productData,
          inventory: productData.inventory ?? 0,
          price: productData.price ?? 0,
          name: productData.name || 'Unnamed Product',
        });
        if (!res?.success) throw new Error(res?.error || '创建商品失败。');
      } else if (selectedProduct?.id) {
        const res = await apiService.updateProduct(selectedProduct.id, {
          ...productData,
          inventory: productData.inventory ?? selectedProduct.inventory ?? 0,
          price: productData.price ?? selectedProduct.price ?? 0,
          brandId: productData.brandId ?? selectedProduct.brandId,
        });
        if (!res?.success) throw new Error(res?.error || '更新商品失败。');
      }
      await fetchProducts();
      setShowForm(false);
    } catch (err: any) {
      setError(err?.message || '保存商品时发生错误。');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const confirmed = window.confirm('确定要删除该商品吗？此操作不可恢复。');
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiService.deleteProduct(id);
      if (!res?.success) throw new Error(res?.error || '删除商品失败。');
      setProducts((list) => list.filter((item) => item.id !== id));
      if (detailProduct?.id === id) {
        setDetailProduct(null);
      }
    } catch (err: any) {
      setError(err?.message || '删除商品失败。');
    } finally {
      setBusy(false);
    }
  };

  const renameCategory = async (category: string) => {
    const target = window.prompt(`请输入新的分类名称，将把“${category}”下所有商品一起重命名：`, category);
    if (!target || target.trim() === '' || target.trim() === category) return;
    setBusy(true);
    setError(null);
    try {
      const updates = products.filter((product) => product.category === category);
      await Promise.all(
        updates.map((product) => apiService.updateProduct(product.id, { category: target.trim() }))
      );
      await fetchProducts();
      setError(null);
    } catch (err: any) {
      setError(err?.message || '重命名分类失败。');
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async (category: string) => {
    const confirmed = window.confirm(`确定要移除“${category}”分类吗？相关商品将改为“Uncategorized”。`);
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const updates = products.filter((product) => product.category === category);
      await Promise.all(
        updates.map((product) => apiService.updateProduct(product.id, { category: 'Uncategorized' }))
      );
      await fetchProducts();
    } catch (err: any) {
      setError(err?.message || '删除分类失败。');
    } finally {
      setBusy(false);
    }
  };

  const renameBrand = async (brand: string) => {
    const target = window.prompt(`请输入新的品牌名称，将把“${brand}”下所有商品一起重命名：`, brand);
    if (!target || target.trim() === '' || target.trim() === brand) return;
    setBusy(true);
    setError(null);
    try {
      const updates = products.filter((product) => product.brandId === brand);
      await Promise.all(
        updates.map((product) => apiService.updateProduct(product.id, { brandId: target.trim() }))
      );
      await fetchProducts();
    } catch (err: any) {
      setError(err?.message || '重命名品牌失败。');
    } finally {
      setBusy(false);
    }
  };

  const deleteBrand = async (brand: string) => {
    const confirmed = window.confirm(`确定要移除“${brand}”品牌标签吗？相关商品将清空品牌字段。`);
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const updates = products.filter((product) => product.brandId === brand);
      await Promise.all(
        updates.map((product) => apiService.updateProduct(product.id, { brandId: '' }))
      );
      await fetchProducts();
    } catch (err: any) {
      setError(err?.message || '删除品牌失败。');
    } finally {
      setBusy(false);
    }
  };

  const variantCount = useMemo(
    () => products.reduce((sum, product) => sum + (product.variant ? Object.keys(product.variant).length : 0), 0),
    [products]
  );

  const availableProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + (product.inventory ?? product.stock ?? 0), 0);
  const activeProducts = products.filter((product) => product.isActive ?? true).length;
  const categoryList = useMemo(
    () => Array.from(new Set(products.map((product) => product.category || 'Uncategorized'))).sort(),
    [products]
  );
  const brandList = useMemo(
    () => Array.from(new Set(products.map((product) => product.brandId || '').filter(Boolean))).sort(),
    [products]
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-[#09090B] border border-[#2F3336] rounded-3xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-sky-500/10 px-3 py-2 text-sky-300 text-xs">
              <Layers className="w-4 h-4" /> 商品中心
            </div>
            <div>
              <h2 className="text-white text-lg font-bold">
                {activeSubTab === 'list'
                  ? '产品列表管理'
                  : activeSubTab === 'categories'
                  ? '分类管理'
                  : activeSubTab === 'inventory'
                  ? '库存盘点'
                  : activeSubTab === 'sku'
                  ? 'SKU 规格'
                  : activeSubTab === 'brands'
                  ? '品牌域'
                  : activeSubTab === 'collections'
                  ? '商品集合'
                  : activeSubTab === 'images'
                  ? '商品图片'
                  : activeSubTab === 'batches'
                  ? '批次库存'
                  : activeSubTab === 'suppliers'
                  ? '供应商关系'
                  : '采购计划'}
              </h2>
              <p className="text-sm text-[#8B949E] max-w-2xl mt-1">
                {activeSubTab === 'list'
                  ? '浏览、创建和更新商品目录，将商品信息与库存、价格和上架状态集中管理。'
                  : activeSubTab === 'categories'
                  ? '查看当前商品分类并准备同步到商品算法与 AI 选品推荐。'
                  : activeSubTab === 'inventory'
                  ? '商品库存与安全库存实时概览。'
                  : activeSubTab === 'sku'
                  ? '整理 SKU 规格、属性组合与变体层级。'
                  : activeSubTab === 'brands'
                  ? '维护商品品牌实体，构建 MODAUI 品牌域。'
                  : activeSubTab === 'collections'
                  ? '定义商品集合，构建推荐与营销分组。'
                  : activeSubTab === 'images'
                  ? '管理商品图片库和主图排序。'
                  : activeSubTab === 'batches'
                  ? '记录商品批次库存、接收时间和到期信息。'
                  : activeSubTab === 'suppliers'
                  ? '供应商档案与合同管理将在后续版本完成。'
                  : '采购订单与补货计划即将接入供应链系统。'}
              </p>
            </div>
          </div>

          {activeSubTab === 'list' && (
            <button
              type="button"
              onClick={openCreateProduct}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition"
            >
              <Plus className="w-4 h-4" /> 新增商品
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {activeSubTab === 'list' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#09090B] border border-[#2F3336] rounded-3xl p-4">
              <p className="text-[10px] text-[#8B949E] uppercase tracking-[0.2em]">商品总数</p>
              <p className="text-3xl font-bold text-white mt-3">{availableProducts}</p>
            </div>
            <div className="bg-[#09090B] border border-[#2F3336] rounded-3xl p-4">
              <p className="text-[10px] text-[#8B949E] uppercase tracking-[0.2em]">总库存</p>
              <p className="text-3xl font-bold text-white mt-3">{totalStock}</p>
            </div>
            <div className="bg-[#09090B] border border-[#2F3336] rounded-3xl p-4">
              <p className="text-[10px] text-[#8B949E] uppercase tracking-[0.2em]">激活商品</p>
              <p className="text-3xl font-bold text-white mt-3">{activeProducts}</p>
            </div>
          </div>

          <div className="bg-[#09090B] border border-[#2F3336] rounded-3xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 border-b border-[#2F3336] bg-[#08090A]/80">
              <div>
                <h3 className="text-white text-sm font-semibold">商品目录</h3>
                <p className="text-xs text-[#8B949E] mt-1">按商品名称、分类和库存状态快速检索。</p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs text-[#8B949E]">
                <ShoppingBag className="w-4 h-4" />
                {loading ? '正在加载...' : `${availableProducts} 件商品已同步`}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm font-mono">
                <thead className="bg-[#0b0c0f] text-[#8B949E] text-[10px] uppercase tracking-[0.14em]">
                  <tr>
                    <th className="px-4 py-3">商品名称</th>
                    <th className="px-4 py-3">分类</th>
                    <th className="px-4 py-3">价格</th>
                    <th className="px-4 py-3">库存</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2F3336]/50 text-[#d8dade]">
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#8B949E]">加载中，请稍候…</td>
                    </tr>
                  )}
                  {!loading && products.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#8B949E]">暂无商品，请点击“新增商品”开始构建商品中心。</td>
                    </tr>
                  )}
                  {!loading && products.map((product) => (
                    <tr
                      key={product.id}
                      onClick={() => openDetailProduct(product)}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-white">{product.name}</div>
                        <div className="text-[11px] text-[#8B949E] truncate max-w-[240px]">{product.desc || '暂无描述'}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#8B949E]">{product.category || '未分类'}</td>
                      <td className="px-4 py-4 text-sm text-emerald-300">¥{product.price?.toFixed(2) ?? '0.00'}</td>
                      <td className="px-4 py-4 text-sm text-[#8B949E]">{product.inventory ?? product.stock ?? 0}</td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] ${product.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                          {product.isActive ? '已上架' : '已下架'}
                        </span>
                      </td>
                      <td className="px-4 py-4 space-x-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditProduct(product);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#2F3336] px-3 py-2 text-[11px] text-[#8B949E] hover:bg-neutral-900"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> 编辑
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 hover:bg-rose-500/15"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'list' && detailProduct && (
        <div className="bg-[#09090B] border border-[#2F3336] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-3xl bg-[#0b0b0d] w-14 h-14 grid place-items-center text-2xl">
                {detailProduct.image ? detailProduct.image[0] : '📦'}
              </div>
              <div>
                <p className="text-xs text-[#8B949E] uppercase tracking-[0.18em]">商品详情</p>
                <h3 className="text-xl font-bold text-white">{detailProduct.name}</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={closeDetailProduct}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#2F3336] px-3 py-2 text-sm text-[#8B949E] hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4" /> 关闭
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-4">
              <p className="text-xs text-[#8B949E] uppercase tracking-[0.18em]">分类</p>
              <p className="mt-2 text-sm text-white">{detailProduct.category || '未分类'}</p>
            </div>
            <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-4">
              <p className="text-xs text-[#8B949E] uppercase tracking-[0.18em]">品牌</p>
              <p className="mt-2 text-sm text-white">{detailProduct.brand?.name || detailProduct.brandId || '未设置'}</p>
            </div>
            <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-4">
              <p className="text-xs text-[#8B949E] uppercase tracking-[0.18em]">库存 / 价格</p>
              <p className="mt-2 text-sm text-white">{detailProduct.inventory ?? detailProduct.stock ?? 0} 件 • ¥{detailProduct.price?.toFixed(2) ?? '0.00'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-4">
              <p className="text-xs text-[#8B949E] uppercase tracking-[0.18em]">变体数量</p>
              <p className="mt-2 text-sm text-white">{detailProduct.variants?.length ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-4">
              <p className="text-xs text-[#8B949E] uppercase tracking-[0.18em]">图片数量</p>
              <p className="mt-2 text-sm text-white">{detailProduct.imagesMeta?.length ?? 0}</p>
            </div>
            <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-4">
              <p className="text-xs text-[#8B949E] uppercase tracking-[0.18em]">批次记录</p>
              <p className="mt-2 text-sm text-white">{detailProduct.batches?.length ?? 0}</p>
            </div>
          </div>
          {detailProduct.collections && detailProduct.collections.length > 0 && (
            <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-4">
              <p className="text-xs text-[#8B949E] uppercase tracking-[0.18em]">所属集合</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {detailProduct.collections.map((collection) => (
                  <span key={collection.id} className="rounded-full bg-sky-500/10 px-3 py-1 text-[11px] text-sky-300">
                    {collection.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-4">
              <p className="text-xs text-[#8B949E] uppercase tracking-[0.18em]">商品描述</p>
              <p className="mt-3 text-sm text-[#d8dade] min-h-[120px]">{detailProduct.desc || '暂无详细描述'}</p>
            </div>
            <div className="rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs text-[#8B949E] uppercase tracking-[0.18em]">状态</p>
                <p className="mt-2 text-sm text-white">{detailProduct.isActive ? '上架中' : '已下架'}</p>
                <p className="text-xs text-[#8B949E] mt-3">创建于 {new Date(detailProduct.createdAt).toLocaleDateString()}</p>
                <p className="text-xs text-[#8B949E]">更新于 {new Date(detailProduct.updatedAt).toLocaleDateString()}</p>
              </div>
              <button
                type="button"
                onClick={() => openEditProduct(detailProduct)}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
              >
                <Edit3 className="w-4 h-4" /> 编辑商品
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'categories' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#09090B] border border-[#2F3336] rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white text-sm font-semibold">商品分类</h3>
                <p className="text-xs text-[#8B949E] mt-1">当前分类将用于商品结构与店铺导航。</p>
              </div>
              <Folder className="w-4 h-4 text-sky-400" />
            </div>
            {busy ? (
              <div className="text-sm text-[#8B949E]">正在加载分类…</div>
            ) : categories.length === 0 ? (
              <div className="text-sm text-[#8B949E]">未检测到分类。当前版本仅支持读取现有分类。</div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category} className="rounded-2xl border border-[#2F3336] bg-[#0b0b0d] p-4 text-sm text-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-white font-semibold">{category}</p>
                        <p className="text-xs text-[#8B949E] mt-1">{products.filter((p) => p.category === category).length} 件商品</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => renameCategory(category)}
                          className="rounded-xl border border-[#2F3336] px-3 py-2 text-[11px] text-[#8B949E] hover:bg-neutral-900"
                        >重命名</button>
                        <button
                          type="button"
                          onClick={() => deleteCategory(category)}
                          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 hover:bg-rose-500/15"
                        >删除</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-[#09090B] border border-[#2F3336] rounded-3xl p-6">
            <h3 className="text-white text-sm font-semibold">分类与品牌管理</h3>
            <p className="text-xs text-[#8B949E] mt-2">当前分类与品牌来自商品目录，可通过编辑商品实现同步。重命名操作会自动映射到所有相关商品。</p>
            <div className="mt-4 space-y-3 text-sm text-[#d8dade]">
              <div className="flex items-center justify-between rounded-2xl border border-[#2F3336] px-4 py-3">
                <span>当前分类数</span>
                <span className="font-semibold text-white">{categories.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[#2F3336] px-4 py-3">
                <span>当前品牌数</span>
                <span className="font-semibold text-white">{brandList.length}</span>
              </div>
              <div className="rounded-2xl border border-[#2F3336] px-4 py-3 text-[#8B949E]">
                编辑商品时可以更新品牌与分类字段，后续版本会继续补齐独立品牌模型。立即使用“编辑商品”进行同步。
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#09090B] border border-[#2F3336] rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white text-sm font-semibold">品牌清单</h3>
                <p className="text-xs text-[#8B949E] mt-1">品牌标签可用于 AI 选品与商品推荐策略</p>
              </div>
              <Tag className="w-4 h-4 text-sky-400" />
            </div>
            {brandList.length === 0 ? (
              <div className="text-sm text-[#8B949E]">当前没有品牌。请通过“编辑商品”创建品牌标签。</div>
            ) : (
              <div className="space-y-3">
                {brandList.map((brand) => (
                  <div key={brand} className="rounded-2xl border border-[#2F3336] bg-[#0b0b0d] p-4 text-sm text-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{brand}</p>
                        <p className="text-xs text-[#8B949E] mt-1">{products.filter((p) => p.brandId === brand).length} 件商品</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => renameBrand(brand)}
                          className="rounded-xl border border-[#2F3336] px-3 py-2 text-[11px] text-[#8B949E] hover:bg-neutral-900"
                        >重命名</button>
                        <button
                          type="button"
                          onClick={() => deleteBrand(brand)}
                          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 hover:bg-rose-500/15"
                        >删除</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {activeSubTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#09090B] border border-[#2F3336] rounded-3xl p-6">
            <div className="inline-flex items-center gap-2 text-sky-300 text-xs mb-4">
              <Database className="w-4 h-4" /> 库存总览
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-3xl border border-[#2F3336] p-4 text-white">
                <p className="text-[10px] uppercase text-[#8B949E]">库存总量</p>
                <p className="text-3xl font-bold mt-3">{totalStock}</p>
              </div>
              <div className="rounded-3xl border border-[#2F3336] p-4 text-white">
                <p className="text-[10px] uppercase text-[#8B949E]">库存商品数</p>
                <p className="text-3xl font-bold mt-3">{availableProducts}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#09090B] border border-[#2F3336] rounded-3xl p-6 text-sm text-[#8B949E]">
            <h3 className="text-white text-sm font-semibold mb-3">库存提醒</h3>
            <p>在后续版本中，将为您展示安全库存、缺货预警、库存周转和补货建议。</p>
            <div className="mt-6 rounded-3xl border border-[#2F3336] bg-[#0b0b0d] p-4">
              <p className="text-[11px] text-[#8B949E]">变体总数</p>
              <p className="text-2xl font-bold text-white mt-2">{variantCount}</p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'brands' && (
        <BrandPanel tenantId={tenantId} />
      )}

      {activeSubTab === 'collections' && (
        <CollectionPanel
          tenantId={tenantId}
          productOptions={products.map((product) => ({ id: product.id, name: product.name }))}
        />
      )}

      {activeSubTab === 'images' && (
        <div className="space-y-6">
          {detailProduct ? (
            <ImagePanel productId={detailProduct.id} productName={detailProduct.name} />
          ) : (
            <div className="flex flex-col items-center justify-center h-[320px] rounded-3xl border border-dashed border-[#2F3336] bg-[#09090B]/50 px-6 text-center text-sm text-[#8B949E]">
              <div className="mb-3 rounded-full bg-[#1D9BF0]/10 p-4 text-sky-400">
                <Box className="w-6 h-6" />
              </div>
              <h3 className="text-white text-lg font-semibold">请选择一个商品以管理图片库</h3>
              <p className="mt-2 max-w-xl">
                商品图片与主图排序基于具体商品。请先返回商品列表并点击任一商品查看详情，然后切换到图片页继续管理。
              </p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'batches' && (
        <div className="space-y-6">
          {detailProduct ? (
            <BatchPanel
              productId={detailProduct.id}
              productName={detailProduct.name}
              variants={detailProduct.variants ?? []}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[320px] rounded-3xl border border-dashed border-[#2F3336] bg-[#09090B]/50 px-6 text-center text-sm text-[#8B949E]">
              <div className="mb-3 rounded-full bg-[#1D9BF0]/10 p-4 text-sky-400">
                <Box className="w-6 h-6" />
              </div>
              <h3 className="text-white text-lg font-semibold">请选择一个商品以管理批次库存</h3>
              <p className="mt-2 max-w-xl">
                批次库存最终属于具体 SKU 之下。请先打开商品详情，然后切换到批次页继续管理。
              </p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'sku' ? (
        <div className="space-y-6">
          {detailProduct ? (
            <VariantPanel
              productId={detailProduct.id}
              productName={detailProduct.name}
              variants={detailProduct.variants ?? []}
              onCreateVariant={createVariant}
              onUpdateVariant={updateVariant}
              onDeleteVariant={removeVariant}
              onRefresh={refreshProductDetails}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[320px] rounded-3xl border border-dashed border-[#2F3336] bg-[#09090B]/50 px-6 text-center text-sm text-[#8B949E]">
              <div className="mb-3 rounded-full bg-[#1D9BF0]/10 p-4 text-sky-400">
                <Box className="w-6 h-6" />
              </div>
              <h3 className="text-white text-lg font-semibold">请选择一个商品以管理 SKU 变体</h3>
              <p className="mt-2 max-w-xl">
                SKU / 规格层级要基于具体商品。请先返回商品列表并点击任一商品查看详情，然后切换到 SKU 页面继续管理。
              </p>
            </div>
          )}
        </div>
      ) : activeSubTab !== 'list' && activeSubTab !== 'categories' && activeSubTab !== 'inventory' ? (
        <div className="flex flex-col items-center justify-center h-[320px] rounded-3xl border border-dashed border-[#2F3336] bg-[#09090B]/50 text-center text-sm text-[#8B949E]">
          <div className="mb-3 rounded-full bg-[#1D9BF0]/10 p-4 text-sky-400">
            <Box className="w-6 h-6" />
          </div>
          <h3 className="text-white text-lg font-semibold">{activeSubTab === 'suppliers' ? '供应商管理模块' : '采购模块'} 正在建设中</h3>
          <p className="mt-2 max-w-xl">
            {activeSubTab === 'suppliers'
              ? '供应商档案、合作采购与报价审批功能正在接入。'
              : '采购计划与补货建议将在后续版本与供应链引擎整合。'}
          </p>
        </div>
      ) : null}

      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center px-4 py-12 sm:px-6"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-[#2F3336] bg-[#0b0b0d] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h3 className="text-xl font-bold text-white">{formMode === 'create' ? '创建新商品' : '编辑商品'}</h3>
                <p className="text-sm text-[#8B949E] mt-1">在此处录入商品基础信息，后续版本会补充更多成本与采购字段。</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-2xl border border-[#2F3336] px-4 py-2 text-sm text-[#8B949E] hover:bg-white/5"
              >
                关闭
              </button>
            </div>
            <ProductForm
              mode={formMode}
              product={selectedProduct ?? undefined}
              categories={categories.length > 0 ? categories : categoryList}
              onCancel={() => setShowForm(false)}
              onSave={handleSaveProduct}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
