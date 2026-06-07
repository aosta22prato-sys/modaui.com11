// MODAUI Unified Enterprise System Type System
// Aligned with Google Firestore Schema and SaaS Multi-tenant Architecture

export interface SysUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'merchant' | 'auditor' | 'customer';
  vipTier: 'basic' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface TenantConfig {
  tenantId: string;
  merchantName: string;
  industryId: string;
  operatingMode: 'manual' | 'assistance' | 'full_auto';
  selectedPlan: string;
  setupCompleted: boolean;
  onboardingStep: number;
  stripeAccountId?: string;
  walletBalance: number;
  dailyTokenLimit: number;
  dailyTokenConsumed: number;
  createdAt: string;
}

export interface Brand {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Collection {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  productIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt?: string;
  isPrimary?: boolean;
  order?: number;
  createdAt: string;
}

export interface ProductBatch {
  id: string;
  productId: string;
  variantId?: string;
  variantSku?: string;
  batchNumber: string;
  quantity: number;
  receivedAt?: string;
  expiresAt?: string;
  notes?: string;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  merchantId: string;
  name: string;
  code: string;
  capacity: number;
  occupancy: number;
  status: 'active' | 'maintenance' | 'closed';
  location: string;
  contact?: string;
  lastAuditAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StorageLocation {
  id: string;
  warehouseId: string;
  name: string;
  zone: string;
  capacity: number;
  occupied: number;
  palletId?: string;
  status: 'available' | 'reserved' | 'blocked';
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryRecord {
  id: string;
  merchantId: string;
  productId: string;
  variantId?: string;
  batchId?: string;
  sku: string;
  warehouseId: string;
  locationId?: string;
  quantity: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  status: 'on_hand' | 'committed' | 'available' | 'damaged';
  lastUpdatedAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface InventoryMovement {
  id: string;
  merchantId: string;
  type: 'COUNT' | 'ADJUSTMENT' | 'TRANSFER' | 'DAMAGE' | 'PURCHASE' | 'SALE';
  inventoryRecordId?: string;
  variantId?: string;
  batchId?: string;
  sku?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  quantity: number;
  delta: number;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface InventoryTransfer {
  id: string;
  merchantId: string;
  sku: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  scheduledAt: string;
  completedAt?: string;
  notes?: string;
}

export interface InventoryAdjustment {
  id: string;
  merchantId: string;
  sku: string;
  warehouseId: string;
  locationId?: string;
  adjustmentType: 'count' | 'loss' | 'damage' | 'correction';
  quantityDelta: number;
  reference?: string;
  reason?: string;
  adjustedAt: string;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  price?: number;
  inventory?: number;
  isActive?: boolean;
  image?: string;
  createdAt: string;
  updatedAt?: string;
  batches?: ProductBatch[];
}

export interface SPUProduct {
  id: string;
  code?: string;
  barcode?: string;
  name: string;
  desc: string;
  price: number;
  cost?: number;
  wholesalePrice?: number;
  minPrice?: number;
  stock: number;
  inventory?: number;
  stockAlert?: number;
  category: string;
  categoryId?: string;
  brandId?: string;
  brand?: Brand;
  collectionIds?: string[];
  collections?: Collection[];
  type?: 'is_single' | 'is_combo' | 'is_variant' | 'is_service';
  unitId?: string;
  unitSaleId?: string;
  unitPurchaseId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  hideFromOnlineStore?: boolean;
  isPreorder?: boolean;
  preorderAvailableDate?: string;
  preorderLimit?: number;
  preorderNote?: string;
  isBatchTracked?: boolean;
  shelfLifeDays?: number;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  packSize?: string;
  manufacturer?: string;
  prescriptionRequired?: boolean;
  drugSchedule?: string;
  image: string;
  images?: string[];
  sales: number;
  rating: string;
  note?: string;
  specs: {
    sizes: string[];
    labels: string;
  };
  variant?: Record<string, any>;
  variants?: ProductVariant[];
  batches?: ProductBatch[];
  imagesMeta?: ProductImage[];
  vectorMatched?: boolean;
}

export interface CustomerOrder {
  id: string;
  time: string; // HH:mm:ss for day-charts
  location: string; // Table number, shipping address, or room seat
  desc: string; // e.g., "亚麻黑袍 x 1, 纯白打底 x 2"
  price: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'refunded' | 'cancelled';
  type: 'takeout' | 'dine_in' | 'delivery';
  customerName: string;
  phone: string;
  tracking: string; // Logistic express tracking number (SF Air express tracker format target)
}

export interface BillingTransaction {
  id: string;
  orderId?: string;
  amount: number;
  clientName: string;
  time: string; // YYYY-MM-DD HH:mm:ss
  method: 'Stripe' | 'Alipay' | 'WeChatPay' | 'PayPal';
  type: 'order_payment' | 'saas_subscription' | 'api_overage';
  status: 'pending' | 'settled' | 'refunded';
  tokenConsumed: number;
  description: string;
}

export interface RAGKnowledgeChunk {
  id: string;
  title: string;
  content: string;
  category: 'industry' | 'product' | 'marketing' | 'corporate';
  tokenCount: number;
  vectorSimScore?: number;
  createdAt: string;
}

export interface SysAuditLog {
  id: string;
  timestamp: string;
  tenantId: string;
  username: string;
  role: string;
  component: string;
  action: string;
  details: string;
  severity: 'info' | 'warn' | 'error' | 'security';
}

export interface SystemCronJob {
  id: string;
  name: string;
  cronExpr: string;
  task: string;
  priority: 'URGENT' | 'NORMAL' | 'DEFERRED';
  assignee: string; // Agent name, e.g., "Soren (运营综合)"
  status: 'idle' | 'running' | 'paused';
  failureCount: number;
  lastRun: string;
}

// === FINANCE & WALLET MODULE TYPES ===

export interface CurrencyInfo {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rate: number;
  status: boolean;
}

export interface PaymentLinkInfo {
  id: string;
  amount: number;
  currency: string;
  description: string;
  url: string;
  status: 'active' | 'inactive';
}

export interface VirtualCardInfo {
  id: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardHolder: string;
  balance: number;
  currency: string;
  status: 'active' | 'blocked';
}

export interface P2POfferInfo {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  currency: string;
  rate: number;
  paymentMethod: string;
}

export interface WalletOverview {
  balance: number;
  currency: string;
  earnings: number;
  referralBalance: number;
  recentTransactions: BillingTransaction[];
}

