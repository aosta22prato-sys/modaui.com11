# Phase 3 — Product Center Migration

## 目标
将 `script` 中的商品能力完全迁移到 `MODAUI` 的 Product Center。

## 范围
### 迁移模型
- `Product`
- `ProductVariant`
- `Brand`
- `Category`
- `Collection`
- `ProductImage`
- `ProductBatch`

### 迁移表
- `products`
- `product_variants`
- `brands`
- `categories`
- `collections`
- `product_images`
- `product_batches`

### 迁移控制器
- `ProductsController`
- `BrandsController`

### 未来 AI
- `AI Designer`
- `AI Product Manager`

## 执行步骤
1. 建立 `src/modules/product-center` 或 `src/components/product-center` 目录结构。
2. 定义 MODAUI Product Center 的核心域模型和 API 适配层。
3. 从 `script/app/Models` 中提取 `Product`、`ProductVariant`、`Brand`、`Category` 的字段和业务关系。
4. 将 `ProductsController` 中的商品 CRUD、分类管理、批量上架逻辑映射为 MODAUI 后端服务接口。
5. 将 `BrandsController` 中品牌管理逻辑吸收到 MODAUI Finance/Product 服务层或独立模块。
6. 检查 `product_batches` 与商品入库、库存联动的关联逻辑，确保迁移后仍然可用。
7. 尽量保留业务规则：商品上架条件、SKU 变体维护、分类层级、图片管理。
8. 废弃 Stocky 前端相关显示层，只保留能力层。

## 风险点
- `ProductBatch` 与仓库/库存之间的跨中心关联需要在 Inventory Center 同步完成后检查。
- `Category` 与 `Collection` 的命名冲突需与 MODAUI 现有商品结构统一。

## 下一步
- 评估 `script/app/Http/Controllers/ProductsController.php` 的主要方法，列出可迁移 API。 
- 在 `src` 中建立 Product Center 的接口目录和初始 service 层。
