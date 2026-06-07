/**
 * MODAUI Universal API Service Layer
 * This service abstracts all data operations, allowing the system to switch from 
 * Firebase to a custom backend database seamlessly.
 */

export interface Tenant {
  id: string;
  name: string;
  industry: string;
  plan: string;
  status: string;
  specialistCount: number;
  billingCycle: string;
  creator: string;
  createdAtTime: string;
  tokenBalance: number;
  spendAmount: number;
  depositTotal: number;
  features: string[];
  plugins: string[];
  industryModules: string[];
  agentLimit: number;
  geminiQuota: number;
  storageLimit: string;
  isStoreOnline?: boolean;
  customDomainName?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  name: string;
  action: string;
  role: string;
  system: string;
  clientIp: string;
  time: string;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: string;
  corp?: string;
  displayName?: string;
  tenantId?: string;
  bgLogs?: string;
}

// ============================================
// Mock Database (In-memory storage for Demo)
// ============================================

let mockDb: any = {
  tenants: {
    'T-001': {
      id: 'T-001',
      name: '米兰时装旗舰店',
      industryId: 'fashion',
      industry: '服装快反',
      plan: '企业尊享版',
      status: '运行中',
      isStoreOnline: true,
      specialistCount: 6,
      billingCycle: '2026-06',
      creator: 'jack@modaui.com',
      createdAtTime: '09:15',
      tokenBalance: 850000,
      spendAmount: 12400,
      depositTotal: 50000,
      features: ['designer', 'selection', 'marketing', 'operation', 'financial', 'customer'],
      plugins: ['customer_chat', 'stripe_billing', 'sf_cargo'],
      industryModules: ['multi_size', 'virtual_makeup'],
      agentLimit: 12,
      geminiQuota: 2000000,
      storageLimit: '100GB',
      billing_logs: {},
      industries: {
        fashion: {
          products: {},
          orders: {},
          coupons: {},
          categories: {},
          metrics: {
            operating: { sales: 12840, orders: 42 }
          }
        }
      }
    }
  },
  audit_logs: {},
  users: {
    'admin_001': {
      uid: 'admin_001',
      email: 'admin@modaui.com',
      displayName: 'System Admin',
      role: 'founder',
      tenantId: 'T-001'
    }
  }
};

// ============================================
// API Service Implementation
// ============================================

class ApiService {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private currentUser: any = null;

  private getSessionId() {
    return localStorage.getItem('sessionId');
  }

  private async fetchApi(path: string, options: any = {}) {
    const sessionId = this.getSessionId();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': sessionId || '',
      ...options.headers
    };

    const response = await fetch(path, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem('sessionId');
      this.currentUser = null;
    }

    return response.json();
  }

  /**
   * Helper to notify listeners of changes
   */
  private notify(path: string, data: any) {
    const subs = this.listeners.get(path);
    if (subs) {
      subs.forEach(cb => cb(data));
    }
  }

  /**
   * Real-time subscription (Replaces Firebase onSnapshot)
   */
  subscribe(path: string, callback: (data: any) => void) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path)!.add(callback);

    // Initial data push
    const data = this.resolvePath(path);
    setTimeout(() => callback(data), 0);

    return () => {
      this.listeners.get(path)?.delete(callback);
    };
  }

  /**
   * Resolve a path string (e.g. "tenants/T-001/billing_logs") to mockDb data
   */
  private resolvePath(path: string): any {
    const parts = path.split('/').filter(Boolean);
    let current = mockDb;
    for (const part of parts) {
      if (!current || typeof current !== 'object') return null;
      current = current[part];
    }
    
    // If it's a collection (object of objects), return as array
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      const keys = Object.keys(current);
      if (keys.length > 0 && typeof current[keys[0]] === 'object') {
        return keys.map(k => ({ id: k, ...current[k] }));
      }
    }
    return current;
  }

  /**
   * Get a single document
   */
  async getDoc(path: string): Promise<any> {
    return this.resolvePath(path);
  }

  /**
   * Set or Update a document
   */
  async setDoc(path: string, data: any, options: { merge?: boolean } = {}) {
    console.log(`[API Set] ${path}`, data);
    const parts = path.split('/').filter(Boolean);
    let current = mockDb;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }

    const lastKey = parts[parts.length - 1];
    if (options.merge) {
      current[lastKey] = { ...current[lastKey], ...data };
    } else {
      current[lastKey] = data;
    }

    this.notify(path, current[lastKey]);
    
    // Also notify parent if it's a collection
    const parentPath = parts.slice(0, -1).join('/');
    if (parentPath) {
      this.notify(parentPath, this.resolvePath(parentPath));
    }
  }

  /**
   * Delete a document
   */
  async deleteDoc(path: string) {
    const parts = path.split('/').filter(Boolean);
    let current = mockDb;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) return;
      current = current[parts[i]];
    }
    delete current[parts[parts.length - 1]];
    
    const parentPath = parts.slice(0, -1).join('/');
    this.notify(parentPath, this.resolvePath(parentPath));
  }

  // --- Specialized Methods ---

  async updateTenant(id: string, data: any) {
    await this.setDoc(`tenants/${id}`, data, { merge: true });
  }

  async getTenants(): Promise<Tenant[]> {
    const res = await this.fetchApi('/api/merchants');
    return res.merchants || [];
  }

  async getCurrentUser() {
    if (this.currentUser) return this.currentUser;
    const sessionId = this.getSessionId();
    if (!sessionId) return null;

    try {
      const res = await this.fetchApi('/api/auth/me', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      });
      if (res.success) {
        this.currentUser = res.user;
        return res.user;
      }
    } catch (e) {
      console.error('Failed to get current user:', e);
    }
    return null;
  }

  async login(email: string, password: string) {
    const res = await this.fetchApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.success) {
      localStorage.setItem('sessionId', res.sessionId);
      this.currentUser = res.user;
    }
    return res;
  }

  async register(data: any) {
    const res = await this.fetchApi('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.success) {
      localStorage.setItem('sessionId', res.sessionId);
      this.currentUser = res.user;
    }
    return res;
  }

  async logout() {
    const sessionId = this.getSessionId();
    if (sessionId) {
      await this.fetchApi('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      });
    }
    localStorage.removeItem('sessionId');
    this.currentUser = null;
    console.log('[API Auth] User logged out');
  }

  async updateProfile(data: any) {
    const res = await this.fetchApi('/api/auth/profile/update', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.success) {
      this.currentUser = res.user;
    }
    return res;
  }

  async requestPasswordReset(email: string) {
    return this.fetchApi('/api/auth/password/reset-request', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.fetchApi('/api/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }

  async requestEmailVerification() {
    return this.fetchApi('/api/auth/email/verify-request', {
      method: 'POST'
    });
  }

  async verifyEmail(code: string) {
    return this.fetchApi('/api/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  async setup2FA() {
    return this.fetchApi('/api/auth/2fa/setup', {
      method: 'POST'
    });
  }

  async verify2FA(code: string) {
    return this.fetchApi('/api/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  async getMembers(merchantId: string) {
    return this.fetchApi(`/api/merchants/${merchantId}/members`);
  }

  async addMember(merchantId: string, data: any) {
    return this.fetchApi(`/api/merchants/${merchantId}/members`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteMember(merchantId: string, memberId: string) {
    return this.fetchApi(`/api/merchants/${merchantId}/members/${memberId}`, {
      method: 'DELETE'
    });
  }

  async updateMemberStatus(merchantId: string, memberId: string, status: string) {
    return this.fetchApi(`/api/merchants/${merchantId}/members/${memberId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // --- Store Management ---
  async getStore(merchantId: string) {
    return this.fetchApi(`/api/stores/${merchantId}`);
  }

  async updateStore(merchantId: string, data: any) {
    return this.fetchApi(`/api/stores/${merchantId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // --- Product Management ---
  async getProducts(merchantId: string) {
    return this.fetchApi(`/api/products?merchantId=${merchantId}`);
  }

  async createProduct(merchantId: string, data: any) {
    return this.fetchApi('/api/products', {
      method: 'POST',
      body: JSON.stringify({ ...data, merchantId })
    });
  }

  async updateProduct(productId: string, data: any) {
    return this.fetchApi(`/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteProduct(productId: string) {
    return this.fetchApi(`/api/products/${productId}`, {
      method: 'DELETE'
    });
  }

  async getCategories(merchantId: string) {
    return this.fetchApi(`/api/categories?merchantId=${merchantId}`);
  }

  async getBrands(merchantId: string) {
    return this.fetchApi(`/api/brands?merchantId=${merchantId}`);
  }

  async createBrand(merchantId: string, data: { name: string; description?: string }) {
    return this.fetchApi('/api/brands', {
      method: 'POST',
      body: JSON.stringify({ ...data, merchantId })
    });
  }

  async updateBrand(brandId: string, data: { name?: string; description?: string }) {
    return this.fetchApi(`/api/brands/${brandId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteBrand(brandId: string) {
    return this.fetchApi(`/api/brands/${brandId}`, {
      method: 'DELETE'
    });
  }

  async getCollections(merchantId: string) {
    return this.fetchApi(`/api/collections?merchantId=${merchantId}`);
  }

  async createCollection(merchantId: string, data: { name: string; description?: string; productIds?: string[] }) {
    return this.fetchApi('/api/collections', {
      method: 'POST',
      body: JSON.stringify({ ...data, merchantId })
    });
  }

  async updateCollection(collectionId: string, data: { name?: string; description?: string; productIds?: string[] }) {
    return this.fetchApi(`/api/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteCollection(collectionId: string) {
    return this.fetchApi(`/api/collections/${collectionId}`, {
      method: 'DELETE'
    });
  }

  async getProductDetails(productId: string) {
    return this.fetchApi(`/api/product-details/${productId}`);
  }

  async getProductVariants(productId: string) {
    return this.fetchApi(`/api/product-variants?productId=${productId}`);
  }

  async createProductVariant(data: any) {
    return this.fetchApi('/api/product-variants', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateProductVariant(variantId: string, data: any) {
    return this.fetchApi(`/api/product-variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteProductVariant(variantId: string) {
    return this.fetchApi(`/api/product-variants/${variantId}`, {
      method: 'DELETE'
    });
  }

  async getProductImages(productId: string) {
    return this.fetchApi(`/api/product-images?productId=${productId}`);
  }

  async createProductImage(data: any) {
    return this.fetchApi('/api/product-images', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteProductImage(imageId: string) {
    return this.fetchApi(`/api/product-images/${imageId}`, {
      method: 'DELETE'
    });
  }

  async getProductBatches(productId: string) {
    return this.fetchApi(`/api/product-batches?productId=${productId}`);
  }

  async createProductBatch(data: any) {
    return this.fetchApi('/api/product-batches', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateProductBatch(batchId: string, data: any) {
    return this.fetchApi(`/api/product-batches/${batchId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteProductBatch(batchId: string) {
    return this.fetchApi(`/api/product-batches/${batchId}`, {
      method: 'DELETE'
    });
  }

  async getWarehouses(merchantId: string) {
    return this.fetchApi(`/api/inventory/warehouses?merchantId=${merchantId}`);
  }

  async createWarehouse(data: any) {
    return this.fetchApi('/api/inventory/warehouses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateWarehouse(warehouseId: string, data: any) {
    return this.fetchApi(`/api/inventory/warehouses/${warehouseId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteWarehouse(warehouseId: string) {
    return this.fetchApi(`/api/inventory/warehouses/${warehouseId}`, {
      method: 'DELETE'
    });
  }

  async getLocations(warehouseId: string) {
    return this.fetchApi(`/api/inventory/locations?warehouseId=${warehouseId}`);
  }

  async getInventoryRecords(merchantId: string) {
    return this.fetchApi(`/api/inventory/records?merchantId=${merchantId}`);
  }

  async getInventory(merchantId: string) {
    return this.fetchApi(`/api/inventory?merchantId=${merchantId}`);
  }

  async getInventoryByVariant(merchantId: string, variantId: string) {
    return this.fetchApi(`/api/inventory?merchantId=${merchantId}&variantId=${variantId}`);
  }

  async getInventoryByBatch(merchantId: string, batchId: string) {
    return this.fetchApi(`/api/inventory?merchantId=${merchantId}&batchId=${batchId}`);
  }

  async transferInventory(data: any) {
    return this.fetchApi('/api/inventory/transfers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async adjustInventory(data: any) {
    return this.fetchApi('/api/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async countInventory(data: any) {
    return this.fetchApi('/api/inventory/counts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createInventoryMovement(data: any) {
    return this.fetchApi('/api/inventory/movements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getInventoryTransfers(merchantId: string) {
    return this.fetchApi(`/api/inventory/transfers?merchantId=${merchantId}`);
  }

  // --- Cart System ---
  async getCart() {
    return this.fetchApi('/api/cart');
  }

  async syncCart(data: { items: any[], coupon?: string, discount: number }) {
    return this.fetchApi('/api/cart/sync', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async clearCart() {
    return this.fetchApi('/api/cart/clear', {
      method: 'POST'
    });
  }

  // --- Order System ---
  async getOrders(merchantId: string) {
    return this.fetchApi(`/api/orders?merchantId=${merchantId}`);
  }

  async createOrder(data: { merchantId: string, storeId: string, items: any[], totalPrice: number }) {
    return this.fetchApi('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateOrderStatus(orderId: string, data: { status?: string, shipmentTracking?: any, cancellationReason?: string, refundReason?: string }) {
    return this.fetchApi(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // --- Payment System ---
  async paymentCallback(paymentId: string, data: { status: string, transactionId?: string }) {
    return this.fetchApi(`/api/payments/${paymentId}/callback`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Finance System ---
  async getFinanceReport(merchantId: string) {
    return this.fetchApi(`/api/finance/report?merchantId=${merchantId}`);
  }

  async createMerchant(data: { name: string, industryId: string }) {
    return this.fetchApi('/api/merchants', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateMerchant(id: string, data: any) {
    return this.fetchApi(`/api/merchants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async getMerchant(id: string) {
    return this.fetchApi(`/api/merchants/${id}`);
  }
}

export const apiService = new ApiService();
