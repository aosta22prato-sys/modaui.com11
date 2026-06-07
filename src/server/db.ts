import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import initSqlJs from 'sql.js';

// --- Interfaces & Types ---

export interface DBUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'Platform Admin' | 'Merchant Owner' | 'Manager' | 'Staff' | 'Customer';
  merchantId?: string;
  verified: boolean;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
  resetToken?: string;
  resetTokenExpires?: string;
  verificationToken?: string;
  createdAt: string;
  profile?: {
    fullName?: string;
    phone?: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    taxNumber?: string;
  };
  customerData?: {
    points: number;
    openingBalance: number;
    creditLimit: number;
    isRoyaltyEligible: boolean;
    customerCode: string;
  };
  metadata?: Record<string, any>;
}

export interface DBSession {
  id: string;
  userId: string;
  expiresAt: string;
}

export interface DBMerchant {
  id: string;
  name: string;
  ownerId: string;
  status: 'active' | 'suspended' | 'pending';
  billingPlan: 'free' | 'growth' | 'enterprise';
  modules?: Record<string, {
    enabled: boolean;
    visible: boolean;
    menuEnabled: boolean;
    permissionsEnabled: boolean;
    aiEnabled: boolean;
    testMode: boolean;
  }>;
  createdAt: string;
}

export interface DBStore {
  id: string;
  merchantId: string;
  name: string;
  domain: string;
  branding: {
    logo?: string;
    colorTheme?: 'classic' | 'warm' | 'emerald' | 'monochrome';
    bannerText?: string;
  };
  createdAt: string;
}

export interface DBProduct {
  id: string;
  storeId: string;
  code?: string;
  barcode?: string;
  name: string;
  note?: string;
  category: string;
  categoryId?: string;
  brandId?: string;
  price: number;
  cost?: number;
  wholesalePrice?: number;
  minPrice?: number;
  inventory: number;
  stockAlert?: number;
  taxNet?: number;
  taxMethod?: string;
  discount?: number;
  discountMethod?: string;
  type?: 'is_single' | 'is_combo' | 'is_variant' | 'is_service';
  unitId?: string;
  unitSaleId?: string;
  unitPurchaseId?: string;
  isActive?: number;
  isFeatured?: number;
  hideFromOnlineStore?: number;
  isPreorder?: number;
  preorderAvailableDate?: string;
  preorderLimit?: number;
  preorderNote?: string;
  isBatchTracked?: number;
  shelfLifeDays?: number;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  packSize?: string;
  manufacturer?: string;
  prescriptionRequired?: number;
  drugSchedule?: string;
  variant: Record<string, any>;
  images: string[];
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface DBOrder {
  id: string;
  merchantId: string;
  userId: string;
  storeId: string;
  items: any[];
  totalPrice: number;
  status: string;
  createdAt: string;
}

export interface DBSupplier {
  id: string;
  merchantId: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  taxNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface DBPurchase {
  id: string;
  merchantId: string;
  purchaseNumber?: string | null;
  items: any[];
  createdAt: string;
}

export interface DBInventoryRecord {
  id: string;
  merchantId: string;
  variantId?: string | null;
  batchId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  onHand: number;
  reserved: number;
  available: number;
  createdAt: string;
  updatedAt?: string;
}

export interface DBInventoryMovement {
  id: string;
  merchantId: string;
  type: string;
  variantId?: string | null;
  batchId?: string | null;
  fromWarehouseId?: string | null;
  fromLocationId?: string | null;
  toWarehouseId?: string | null;
  toLocationId?: string | null;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface DBBusinessTransaction {
  id: string;
  userId: string;
  merchantId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'REFUND' | 'ADJUSTMENT';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  referenceId?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
  createdAt: string;
}

export interface DBCompanyAccount {
  id: string;
  userId: string;
  merchantId: string;
  balance: number;
  currency: string;
  earnings: number;
  referralBalance: number;
  status: 'active' | 'frozen';
  createdAt: string;
}

export interface DBRole { id: string; name: string; permissions: string[]; }
export interface DBStaffPermission { id: string; userId: string; roleId: string; }
export interface DBAuditLog { id: string; userId: string; action: string; metadata: any; createdAt: string; }
export interface DBCampaign { id: string; name: string; status: string; }
export interface DBChannelConnection { id: string; type: string; }
export interface DBWebhookReg { id: string; url: string; events: string[]; }
export interface DBAPIKey { id: string; key: string; userId: string; }

export interface DatabaseSchema {
  users: DBUser[];
  sessions: DBSession[];
  merchants: DBMerchant[];
  stores: DBStore[];
  products: DBProduct[];
  orders: DBOrder[];
  purchases: DBPurchase[];
  inventoryRecords: DBInventoryRecord[];
  inventoryMovements: DBInventoryMovement[];
  suppliers: DBSupplier[];
  companyAccounts: DBCompanyAccount[];
  businessTransactions: DBBusinessTransaction[];
  roles: DBRole[];
  staffPermissions: DBStaffPermission[];
  audit_logs: DBAuditLog[];
  campaigns: DBCampaign[];
  channelConnections: DBChannelConnection[];
  webhookRegistrations: DBWebhookReg[];
  apiKeys: DBAPIKey[];
}

const SQLITE_DB_PATH = (process.env as any).SQLITE_DB_PATH || 'data/modadb.sqlite';
const DB_FILE_PATH = path.resolve(SQLITE_DB_PATH);
const SQLPromise = initSqlJs();

function serialize(value: any): string { return JSON.stringify(value || null); }
function deserialize(value: any, fallback: any): any {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

let sqliteDb: any = null;
let sqliteInitPromise: Promise<void> | null = null;

async function initSqliteDatabase() {
  if (sqliteDb) return;
  const SQL = await SQLPromise;
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const buffer = fs.existsSync(DB_FILE_PATH) ? fs.readFileSync(DB_FILE_PATH) : undefined;
  sqliteDb = new SQL.Database(buffer);

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, email TEXT UNIQUE, passwordHash TEXT, role TEXT, merchantId TEXT, verified INTEGER, twoFactorSecret TEXT, twoFactorEnabled INTEGER, resetToken TEXT, resetTokenExpires TEXT, verificationToken TEXT, createdAt TEXT, profile TEXT, customerData TEXT, metadata TEXT)`,
    `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, userId TEXT, expiresAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS merchants (id TEXT PRIMARY KEY, name TEXT, ownerId TEXT, status TEXT, billingPlan TEXT, modules TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, merchantId TEXT, name TEXT, domain TEXT, branding TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, storeId TEXT, code TEXT, barcode TEXT, name TEXT, note TEXT, category TEXT, categoryId TEXT, brandId TEXT, price REAL, cost REAL, wholesalePrice REAL, minPrice REAL, inventory INTEGER, stockAlert REAL, taxNet REAL, taxMethod TEXT, discount REAL, discountMethod TEXT, type TEXT, unitId TEXT, unitSaleId TEXT, unitPurchaseId TEXT, isActive INTEGER, isFeatured INTEGER, hideFromOnlineStore INTEGER, isPreorder INTEGER, preorderAvailableDate TEXT, preorderLimit INTEGER, preorderNote TEXT, isBatchTracked INTEGER, shelfLifeDays INTEGER, genericName TEXT, strength TEXT, dosageForm TEXT, packSize TEXT, manufacturer TEXT, prescriptionRequired INTEGER, drugSchedule TEXT, variant TEXT, images TEXT, createdAt TEXT, updatedAt TEXT, deletedAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, merchantId TEXT, name TEXT, code TEXT, email TEXT, phone TEXT, country TEXT, city TEXT, address TEXT, taxNumber TEXT, notes TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS inventory_records (id TEXT PRIMARY KEY, merchantId TEXT, variantId TEXT, batchId TEXT, warehouseId TEXT, locationId TEXT, onHand INTEGER, reserved INTEGER, available INTEGER, createdAt TEXT, updatedAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS inventory_movements (id TEXT PRIMARY KEY, merchantId TEXT, type TEXT, variantId TEXT, batchId TEXT, fromWarehouseId TEXT, fromLocationId TEXT, toWarehouseId TEXT, toLocationId TEXT, quantity INTEGER, referenceType TEXT, referenceId TEXT, idempotencyKey TEXT, notes TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS business_transactions (id TEXT PRIMARY KEY, userId TEXT, merchantId TEXT, type TEXT, amount REAL, currency TEXT, status TEXT, description TEXT, referenceId TEXT, metadata TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS company_accounts (id TEXT PRIMARY KEY, userId TEXT, merchantId TEXT, balance REAL, currency TEXT, earnings REAL, referralBalance REAL, status TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, merchantId TEXT, userId TEXT, storeId TEXT, items TEXT, totalPrice REAL, status TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, merchantId TEXT, purchaseNumber TEXT, items TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, userId TEXT, action TEXT, metadata TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT, permissions TEXT)`,
    `CREATE TABLE IF NOT EXISTS staff_permissions (id TEXT PRIMARY KEY, userId TEXT, roleId TEXT)`,
    `CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT, status TEXT)`,
    `CREATE TABLE IF NOT EXISTS channel_connections (id TEXT PRIMARY KEY, type TEXT)`,
    `CREATE TABLE IF NOT EXISTS webhook_registrations (id TEXT PRIMARY KEY, url TEXT, events TEXT)`,
    `CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, key TEXT, userId TEXT)`,
    `CREATE TABLE IF NOT EXISTS brands (id TEXT PRIMARY KEY, storeId TEXT, name TEXT, description TEXT, createdAt TEXT, updatedAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS collections (id TEXT PRIMARY KEY, storeId TEXT, name TEXT, description TEXT, createdAt TEXT, updatedAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS collection_products (collectionId TEXT, productId TEXT, PRIMARY KEY (collectionId, productId))`,
    `CREATE TABLE IF NOT EXISTS held_orders (id TEXT PRIMARY KEY, merchantId TEXT, userId TEXT, customerId TEXT, items TEXT, subtotal REAL, tax REAL, total REAL, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS credit_records (id TEXT PRIMARY KEY, merchantId TEXT, entityType TEXT, entityId TEXT, amount REAL, type TEXT, status TEXT, referenceId TEXT, notes TEXT, createdAt TEXT)`
  ];
  for (const sql of tables) sqliteDb.run(sql);

  // Schema Migrations (Ensure new columns exist)
  try { sqliteDb.run('ALTER TABLE users ADD COLUMN customerData TEXT;'); } catch (e) {}
  try { sqliteDb.run('ALTER TABLE users ADD COLUMN profile TEXT;'); } catch (e) {}
  try { sqliteDb.run('ALTER TABLE business_transactions ADD COLUMN metadata TEXT;'); } catch (e) {}
  try { sqliteDb.run('ALTER TABLE merchants ADD COLUMN modules TEXT;'); } catch (e) {}
}

function wrapSqlJs(db: any): any {
  return new Proxy(db, {
    get(target, prop) {
      if (prop === 'prepare') {
        return (sql: string) => ({
          run: (...params: any[]) => {
            let finalSql = sql;
            for (const p of params) {
              const val = p === null || p === undefined ? 'NULL' : (typeof p === 'string' ? `'${p.replace(/'/g, "''")}'` : p);
              finalSql = finalSql.replace('?', val);
            }
            target.run(finalSql);
            const data = Buffer.from(target.export());
            fs.writeFileSync(DB_FILE_PATH, data);
            return { changes: 1 };
          },
          get: (...params: any[]) => {
            let finalSql = sql;
            for (const p of params) {
              const val = p === null || p === undefined ? 'NULL' : (typeof p === 'string' ? `'${p.replace(/'/g, "''")}'` : p);
              finalSql = finalSql.replace('?', val);
            }
            const res = target.exec(finalSql);
            if (!res.length || !res[0].values.length) return undefined;
            const obj: any = {};
            res[0].columns.forEach((col, i) => obj[col] = res[0].values[0][i]);
            return obj;
          },
          all: (...params: any[]) => {
            let finalSql = sql;
            for (const p of params) {
              const val = p === null || p === undefined ? 'NULL' : (typeof p === 'string' ? `'${p.replace(/'/g, "''")}'` : p);
              finalSql = finalSql.replace('?', val);
            }
            const res = target.exec(finalSql);
            if (!res.length) return [];
            return res[0].values.map(vals => {
              const obj: any = {};
              res[0].columns.forEach((col, i) => obj[col] = vals[i]);
              return obj;
            });
          }
        });
      }
      return Reflect.get(target, prop);
    }
  });
}

export class ModaDB {
  static async init() { if (!sqliteInitPromise) sqliteInitPromise = initSqliteDatabase(); return sqliteInitPromise; }
  static getSqlite() { if (!sqliteDb) throw new Error('DB not initialized'); return wrapSqlJs(sqliteDb); }

  static hashPassword(p: string) { return crypto.createHash('sha256').update(p).digest('hex'); }
  
  static getUserByEmail(email: string): DBUser | undefined {
    const row = this.getSqlite().prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row) return undefined;
    return { ...row, verified: !!row.verified, twoFactorEnabled: !!row.twoFactorEnabled, profile: deserialize(row.profile, {}), customerData: deserialize(row.customerData, undefined), metadata: deserialize(row.metadata, {}) };
  }

  static getUserById(id: string): DBUser | undefined {
    const row = this.getSqlite().prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!row) return undefined;
    return { ...row, verified: !!row.verified, twoFactorEnabled: !!row.twoFactorEnabled, profile: deserialize(row.profile, {}), customerData: deserialize(row.customerData, undefined), metadata: deserialize(row.metadata, {}) };
  }

  static saveUser(u: DBUser) {
    this.getSqlite().prepare(`INSERT OR REPLACE INTO users (id, username, email, passwordHash, role, merchantId, verified, twoFactorSecret, twoFactorEnabled, createdAt, profile, customerData, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(u.id, u.username, u.email, u.passwordHash, u.role, u.merchantId || null, u.verified ? 1 : 0, u.twoFactorSecret || null, u.twoFactorEnabled ? 1 : 0, u.createdAt, serialize(u.profile), serialize(u.customerData), serialize(u.metadata));
  }

  static getSession(id: string): DBSession | undefined {
    return this.getSqlite().prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  }

  static createSession(userId: string) {
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    this.getSqlite().prepare('INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)').run(id, userId, expiresAt);
    return { id, userId, expiresAt };
  }

  static deleteSession(id: string) { this.getSqlite().prepare('DELETE FROM sessions WHERE id = ?').run(id); }

  static getStoreByMerchantId(merchantId: string): DBStore | undefined {
    const row = this.getSqlite().prepare('SELECT * FROM stores WHERE merchantId = ?').get(merchantId);
    if (!row) return undefined;
    return { ...row, branding: deserialize(row.branding, {}) };
  }

  static saveStore(s: DBStore) { this.getSqlite().prepare('INSERT OR REPLACE INTO stores (id, merchantId, name, domain, branding, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(s.id, s.merchantId, s.name, s.domain, serialize(s.branding), s.createdAt); }

  static getProducts(storeId: string): DBProduct[] {
    return this.getSqlite().prepare('SELECT * FROM products WHERE storeId = ?').all(storeId).map(row => ({ ...row, variant: deserialize(row.variant, {}), images: deserialize(row.images, []) }));
  }

  static saveProduct(p: DBProduct) { 
    this.getSqlite().prepare(`INSERT OR REPLACE INTO products (id, storeId, code, name, price, cost, inventory, category, variant, images, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(p.id, p.storeId, p.code || null, p.name, p.price, p.cost || 0, p.inventory, p.category, serialize(p.variant), serialize(p.images), p.createdAt);
  }

  static deleteProduct(id: string) { this.getSqlite().prepare('DELETE FROM products WHERE id = ?').run(id); }

  static saveInventoryMovement(mov: any) {
    const id = mov.id || `mov_${crypto.randomUUID().slice(0, 8)}`;
    this.getSqlite().prepare(`INSERT INTO inventory_movements (id, merchantId, type, variantId, quantity, toWarehouseId, fromWarehouseId, referenceType, referenceId, idempotencyKey, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, mov.merchantId, mov.type, mov.variantId, mov.quantity, mov.toWarehouseId || null, mov.fromWarehouseId || null, mov.referenceType || null, mov.referenceId || null, mov.idempotencyKey || null, mov.notes || null, mov.createdAt || new Date().toISOString());
    if (mov.toWarehouseId) this.adjustInventory(mov.merchantId, mov.variantId, mov.toWarehouseId, mov.quantity);
    if (mov.fromWarehouseId) this.adjustInventory(mov.merchantId, mov.variantId, mov.fromWarehouseId, -mov.quantity);
    return { success: true, id };
  }

  private static adjustInventory(merchantId: string, variantId: string, warehouseId: string, delta: number) {
    const db = this.getSqlite();
    const row = db.prepare('SELECT * FROM inventory_records WHERE merchantId = ? AND variantId = ? AND warehouseId = ?').get(merchantId, variantId, warehouseId);
    if (row) db.prepare('UPDATE inventory_records SET onHand = onHand + ?, available = available + ? WHERE id = ?').run(delta, delta, row.id);
    else db.prepare('INSERT INTO inventory_records (id, merchantId, variantId, warehouseId, onHand, available, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(`rec_${crypto.randomUUID().slice(0, 8)}`, merchantId, variantId, warehouseId, delta, delta, new Date().toISOString());
  }

  static getInventoryRecords(merchantId: string) { return this.getSqlite().prepare('SELECT * FROM inventory_records WHERE merchantId = ?').all(merchantId); }
  static getInventoryMovements(merchantId: string) { return this.getSqlite().prepare('SELECT * FROM inventory_movements WHERE merchantId = ? ORDER BY createdAt DESC').all(merchantId); }

  static getSuppliers(merchantId: string) { return this.getSqlite().prepare('SELECT * FROM suppliers WHERE merchantId = ? ORDER BY name ASC').all(merchantId); }
  static saveSupplier(s: DBSupplier) { this.getSqlite().prepare(`INSERT OR REPLACE INTO suppliers (id, merchantId, name, code, email, phone, country, city, address, taxNumber, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(s.id, s.merchantId, s.name, s.code, s.email || null, s.phone || null, s.country || null, s.city || null, s.address || null, s.taxNumber || null, s.notes || null, s.createdAt || new Date().toISOString()); }
  static deleteSupplier(id: string) { this.getSqlite().prepare('DELETE FROM suppliers WHERE id = ?').run(id); }

  static savePurchase(p: DBPurchase) { this.getSqlite().prepare('INSERT OR REPLACE INTO purchases (id, merchantId, purchaseNumber, items, createdAt) VALUES (?, ?, ?, ?, ?)').run(p.id, p.merchantId, p.purchaseNumber || null, serialize(p.items), p.createdAt); }
  static getPurchaseById(id: string) { 
    const row = this.getSqlite().prepare('SELECT * FROM purchases WHERE id = ?').get(id);
    return row ? { ...row, items: deserialize(row.items, []) } : undefined;
  }

  static getBusinessTransactions(merchantId: string) { return this.getSqlite().prepare('SELECT * FROM business_transactions WHERE merchantId = ? ORDER BY createdAt DESC').all(merchantId).map(row => ({ ...row, metadata: deserialize(row.metadata, {}) })); }
  static getCompanyAccountByMerchant(merchantId: string): DBCompanyAccount | undefined { return this.getSqlite().prepare('SELECT * FROM company_accounts WHERE merchantId = ?').get(merchantId); }

  static getCategories(storeId: string) { return this.getSqlite().prepare('SELECT DISTINCT category as name FROM products WHERE storeId = ?').all(storeId); }
  static getBrands(storeId: string) { return this.getSqlite().prepare('SELECT * FROM brands WHERE storeId = ?').all(storeId); }
  static saveBrand(b: any) { this.getSqlite().prepare('INSERT OR REPLACE INTO brands (id, storeId, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(b.id, b.storeId, b.name, b.description || null, b.createdAt, b.updatedAt); }
  static getBrandById(id: string) { return this.getSqlite().prepare('SELECT * FROM brands WHERE id = ?').get(id); }
  static deleteBrand(id: string) { this.getSqlite().prepare('DELETE FROM brands WHERE id = ?').run(id); }

  static getCollections(storeId: string) { return this.getSqlite().prepare('SELECT * FROM collections WHERE storeId = ?').all(storeId); }
  static getCollectionById(id: string) { return this.getSqlite().prepare('SELECT * FROM collections WHERE id = ?').get(id); }
  static saveCollection(c: any) { this.getSqlite().prepare('INSERT OR REPLACE INTO collections (id, storeId, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(c.id, c.storeId, c.name, c.description || null, c.createdAt, c.updatedAt); }
  static getCollectionProductIds(collectionId: string) { return this.getSqlite().prepare('SELECT productId FROM collection_products WHERE collectionId = ?').all(collectionId).map((r: any) => r.productId); }
  static saveCollectionProduct(collectionId: string, productId: string) { this.getSqlite().prepare('INSERT OR REPLACE INTO collection_products (collectionId, productId) VALUES (?, ?)').run(collectionId, productId); }
  static deleteCollectionProducts(collectionId: string) { this.getSqlite().prepare('DELETE FROM collection_products WHERE collectionId = ?').run(collectionId); }

  static getMerchants() {
    return this.getSqlite().prepare('SELECT * FROM merchants').all().map(m => ({ ...m, modules: deserialize(m.modules, {}) }));
  }

  static getMerchantById(id: string) {
    const row = this.getSqlite().prepare('SELECT * FROM merchants WHERE id = ?').get(id);
    return row ? { ...row, modules: deserialize(row.modules, {}) } : undefined;
  }

  static saveMerchant(m: DBMerchant) {
    this.getSqlite().prepare('INSERT OR REPLACE INTO merchants (id, name, ownerId, status, billingPlan, modules, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(m.id, m.name, m.ownerId, m.status, m.billingPlan, serialize(m.modules), m.createdAt);
  }

  // Held Orders
  static saveHeldOrder(order: any) {
    const db = this.getSqlite();
    db.prepare('INSERT OR REPLACE INTO held_orders (id, merchantId, userId, customerId, items, subtotal, tax, total, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(order.id, order.merchantId, order.userId, order.customerId, serialize(order.items), order.subtotal, order.tax, order.total, order.createdAt);
  }

  static getHeldOrders(merchantId: string) {
    return this.getSqlite().prepare('SELECT * FROM held_orders WHERE merchantId = ?').all(merchantId).map(r => ({
      ...r,
      items: deserialize(r.items, [])
    }));
  }

  static deleteHeldOrder(id: string) {
    this.getSqlite().prepare('DELETE FROM held_orders WHERE id = ?').run(id);
  }

  // Credit Records
  static saveCreditRecord(record: any) {
    const db = this.getSqlite();
    db.prepare('INSERT INTO credit_records (id, merchantId, entityType, entityId, amount, type, status, referenceId, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(record.id || crypto.randomUUID(), record.merchantId, record.entityType, record.entityId, record.amount, record.type, record.status, record.referenceId, record.notes, record.createdAt || new Date().toISOString());
  }

  static getCreditRecords(merchantId: string, entityType?: string, entityId?: string) {
    let sql = 'SELECT * FROM credit_records WHERE merchantId = ?';
    const params = [merchantId];
    if (entityType) { sql += ' AND entityType = ?'; params.push(entityType); }
    if (entityId) { sql += ' AND entityId = ?'; params.push(entityId); }
    return this.getSqlite().prepare(sql).all(...params);
  }

  static log(userId: string, username: string, action: string, category: string, details: string) {
    this.getSqlite().prepare('INSERT INTO audit_logs (id, userId, action, metadata, createdAt) VALUES (?, ?, ?, ?, ?)').run(crypto.randomUUID(), userId, action, serialize({ username, category, details }), new Date().toISOString());
  }

  static read() {
    const db = this.getSqlite();
    return {
      users: db.prepare('SELECT * FROM users').all().map(r => ({ ...r, profile: deserialize(r.profile, {}), customerData: deserialize(r.customerData, null), metadata: deserialize(r.metadata, {}) })),
      products: db.prepare('SELECT * FROM products').all().map(r => ({ ...r, variant: deserialize(r.variant, {}), images: deserialize(r.images, []) })),
      merchants: db.prepare('SELECT * FROM merchants').all().map(m => ({ ...m, modules: deserialize(m.modules, {}) })),
      stores: db.prepare('SELECT * FROM stores').all().map(r => ({ ...r, branding: deserialize(r.branding, {}) })),
      orders: db.prepare('SELECT * FROM orders').all().map(r => ({ ...r, items: deserialize(r.items, []) })),
      inventory_records: db.prepare('SELECT * FROM inventory_records').all(),
      business_transactions: db.prepare('SELECT * FROM business_transactions').all().map(r => ({ ...r, metadata: deserialize(r.metadata, {}) }))
    };
  }
}
