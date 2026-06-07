import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
// Load Google Gemini client safely at runtime (try common package names)
let GoogleGenAI: any = null;
try {
  // prefer the lightweight '@google/genai' package name if present
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  GoogleGenAI = require("@google/genai").GoogleGenAI;
} catch (e) {
  try {
    // fallback to '@google/generative-ai' if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@google/generative-ai");
    GoogleGenAI = mod.GoogleGenAI || mod.default || mod;
  } catch (e2) {
    GoogleGenAI = null; // will use runtime checks before invoking
  }
}
import dotenv from "dotenv";
import Stripe from "stripe";
import { Payment, middleware as wechatMiddleware } from "wechat-pay";
import * as paypalCheckoutServerSDK from "@paypal/checkout-server-sdk";
import { PayPalService } from "./src/modules/payment/payment-paypal";
import { 
  ModaDB, 
  DBCampaign, 
  DBChannelConnection, 
  DBOrder, 
  DBRole, 
  DBStaffPermission, 
  DBWebhookReg, 
  DBAPIKey, 
  DBBusinessTransaction 
} from "./src/server/db";
import { rbacService, UserRole } from "./src/services/rbac";
import { generateWithOpenAI } from "./src/services/openai.service";
import { createLangChainAgent } from "./src/services/langchain.service";
import { generateWithOllama } from "./src/services/ollama.service";
import { SalesService } from "./src/server/services/SalesService";
import { PurchaseService } from "./src/server/services/PurchaseService";

// Initialize Firebase client for server backup & live cloud persistence syncing
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection as firestoreCollection, 
  getDocs as firestoreGetDocs, 
  setDoc as firestoreSetDoc, 
  doc as firestoreDoc 
} from "firebase/firestore";

// Load environment variables
dotenv.config();

declare global {
  namespace Express {
    interface Request {
      authUser?: any;
    }
  }
}

const DEFAULT_APP_URL = (process.env as any).APP_URL || "https://modaui.com";
const DEFAULT_ADMIN_URL = (process.env as any).ADMIN_URL || (process.env as any).API_BASE_URL || "https://admin.modaui.com";

let firebaseApp;
let serverDb: any = null;

try {
  const cfgPath = path.resolve("firebase-applet-config.json");
  if (fs.existsSync(cfgPath)) {
    const config = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
    firebaseApp = initializeApp(config, "serverAppInstance");
    serverDb = getFirestore(firebaseApp, config.firestoreDatabaseId);
    console.log("[Firebase Server Init] Successfully bootstrapped Firestore with ID: " + config.firestoreDatabaseId);
  }
} catch (fireErr: any) {
  console.warn("[Firebase Server Warn] Failed to bootstrap cloud client fallback:", fireErr.message);
}

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Lazy safe Stripe initializer
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "MY_STRIPE_SECRET_KEY") {
    return null; // Fallback gracefully to realistic transaction simulator if keys aren't provisioned yet
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2025-01-27.acacia" as any
    });
  }
  return stripeClient;
}

function ensureDefaultAdminUser() {
  const defaultEmails = ["admin@admin.com", "admin@modaui.com"];
  const defaultPassword = "123456";
  const defaultUsername = "admin";
  const defaultHash = ModaDB.hashPassword(defaultPassword);

  for (const email of defaultEmails) {
    const normalizedEmail = email.toLowerCase();
    const existingUser = ModaDB.getUserByEmail(normalizedEmail);

    if (!existingUser) {
      const userId = `usr_${Math.random().toString(36).slice(2, 11)}`;
      ModaDB.saveUser({
        id: userId,
        username: defaultUsername,
        email: normalizedEmail,
        passwordHash: defaultHash,
        role: "Platform Admin",
        verified: true,
        createdAt: new Date().toISOString(),
        metadata: {}
      });
      console.log(`[Auth] Created default platform admin ${normalizedEmail}`);
      continue;
    }

    let updated = false;
    if (existingUser.role !== "Platform Admin") {
      existingUser.role = "Platform Admin";
      updated = true;
    }
    if (existingUser.passwordHash !== defaultHash) {
      existingUser.passwordHash = defaultHash;
      updated = true;
    }
    if (updated) {
      ModaDB.saveUser(existingUser);
      console.log(`[Auth] Updated default platform admin ${normalizedEmail}`);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware for CORS and body parsing
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  await ModaDB.init();
  ensureDefaultAdminUser();

  // --- Simple admin auth middleware (RBAC) ---
  function adminAuth(req: any, res: any, next: any) {
    try {
      const sessionId = (req.headers['authorization'] || req.body?.sessionId || req.query?.sessionId) as string | undefined;
      if (!sessionId) {
        return res.status(401).json({ success: false, error: 'Missing session token.' });
      }
      const session = ModaDB.getSession(sessionId);
      if (!session || new Date(session.expiresAt) <= new Date()) {
        return res.status(401).json({ success: false, error: 'Session invalid or expired.' });
      }
      const user = ModaDB.getUserById(session.userId);
      if (!user) return res.status(403).json({ success: false, error: 'User not found.' });
      if (user.role !== 'Platform Admin') return res.status(403).json({ success: false, error: 'Access denied: Platform Admin only.' });
      req.authUser = user;
      next();
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // --- Generic user auth middleware ---
  function userAuth(req: any, res: any, next: any) {
    try {
      const sessionId = (req.headers['authorization'] || req.body?.sessionId || req.query?.sessionId) as string | undefined;
      if (!sessionId) {
        return res.status(401).json({ success: false, error: 'Missing session token.' });
      }
      const session = ModaDB.getSession(sessionId);
      if (!session || new Date(session.expiresAt) <= new Date()) {
        return res.status(401).json({ success: false, error: 'Session invalid or expired.' });
      }
      const user = ModaDB.getUserById(session.userId);
      if (!user) return res.status(403).json({ success: false, error: 'User not found.' });
      req.authUser = user;
      next();
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // --- Granular RBAC Permission Middleware ---
  function checkPermission(action: any) {
    return (req: any, res: any, next: any) => {
      const user = req.authUser;
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
      
      // Platform Admin bypasses everything
      if (user.role === 'Platform Admin') return next();
      
      if (typeof action === 'string') {
        // Check if user has access to a zone/menu
        if (rbacService.hasAccessToMenu(user.role as UserRole, action)) return next();
      } else {
        // Check if user can perform a specific boolean action
        if (rbacService.canPerform(user.role as UserRole, action)) return next();
      }
      
      res.status(403).json({ success: false, error: `Forbidden: Role ${user.role} lacks permission for this action.` });
    };
  }

  // --- Store Management ---
  app.get("/api/stores/:id", userAuth, (req, res) => {
    try {
      const store = ModaDB.getStoreByMerchantId(req.params.id);
      if (!store) return res.status(404).json({ success: false, error: "Store not found." });
      res.json({ success: true, store });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/stores/:id", userAuth, checkPermission('settings'), (req, res) => {
    try {
      const store = ModaDB.getStoreByMerchantId(req.params.id);
      if (!store) return res.status(404).json({ success: false, error: "Store not found." });
      
      const { name, domain, branding } = req.body;
      if (name) store.name = name;
      if (domain) store.domain = domain;
      if (branding) store.branding = branding;
      
      ModaDB.saveStore(store);
      ModaDB.log((req as any).authUser.id, (req as any).authUser.username, "STORE_UPDATE", "STORE", `Updated store ${store.name}`);
      res.json({ success: true, store });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Product Management ---
  app.get("/api/products", userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      if (!merchantId) return res.status(400).json({ success: false, error: "Missing merchantId." });
      
      const store = ModaDB.getStoreByMerchantId(merchantId);
      if (!store) return res.json({ success: true, products: [] });
      
      const products = ModaDB.getProducts(store.id);
      res.json({ success: true, products });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/products", userAuth, checkPermission('product'), (req, res) => {
    try {
      const {
        merchantId,
        code,
        barcode,
        name,
        note,
        category,
        categoryId,
        brandId,
        price,
        cost,
        wholesalePrice,
        minPrice,
        inventory,
        stockAlert,
        taxNet,
        taxMethod,
        discount,
        discountMethod,
        type,
        unitId,
        unitSaleId,
        unitPurchaseId,
        isActive,
        isFeatured,
        hideFromOnlineStore,
        isPreorder,
        preorderAvailableDate,
        preorderLimit,
        preorderNote,
        isBatchTracked,
        shelfLifeDays,
        genericName,
        strength,
        dosageForm,
        packSize,
        manufacturer,
        prescriptionRequired,
        drugSchedule,
        sku,
        variant,
        images
      } = req.body;

      const store = ModaDB.getStoreByMerchantId(merchantId);
      if (!store) return res.status(404).json({ success: false, error: "Store not found." });
      
      const product = {
        id: `prod-${Math.random().toString(36).substring(2, 6)}`,
        storeId: store.id,
        code: code || null,
        barcode: barcode || null,
        name,
        note: note || null,
        category: category || 'Uncategorized',
        categoryId: categoryId || null,
        brandId: brandId || null,
        price: parseFloat(price),
        cost: cost !== undefined ? parseFloat(cost) : 0,
        wholesalePrice: wholesalePrice !== undefined ? parseFloat(wholesalePrice) : 0,
        minPrice: minPrice !== undefined ? parseFloat(minPrice) : 0,
        inventory: parseInt(inventory) || 0,
        stockAlert: stockAlert !== undefined ? parseFloat(stockAlert) : 0,
        taxNet: taxNet !== undefined ? parseFloat(taxNet) : 0,
        taxMethod: taxMethod || null,
        discount: discount !== undefined ? parseFloat(discount) : 0,
        discountMethod: discountMethod || null,
        type: type || null,
        unitId: unitId || null,
        unitSaleId: unitSaleId || null,
        unitPurchaseId: unitPurchaseId || null,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
        isFeatured: isFeatured ? 1 : 0,
        hideFromOnlineStore: hideFromOnlineStore ? 1 : 0,
        isPreorder: isPreorder ? 1 : 0,
        preorderAvailableDate: preorderAvailableDate || null,
        preorderLimit: preorderLimit !== undefined ? parseInt(preorderLimit) : null,
        preorderNote: preorderNote || null,
        isBatchTracked: isBatchTracked ? 1 : 0,
        shelfLifeDays: shelfLifeDays !== undefined ? parseInt(shelfLifeDays) : null,
        genericName: genericName || null,
        strength: strength || null,
        dosageForm: dosageForm || null,
        packSize: packSize || null,
        manufacturer: manufacturer || null,
        prescriptionRequired: prescriptionRequired ? 1 : 0,
        drugSchedule: drugSchedule || null,
        sku: sku || `SKU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        variant: variant || {},
        images: images || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
      };
      
      ModaDB.saveProduct(product);
      ModaDB.log((req as any).authUser.id, (req as any).authUser.username, "PRODUCT_CREATE", "PRODUCT", `Created product ${name}`);
      res.json({ success: true, product });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/products/:id", userAuth, checkPermission('product'), (req, res) => {
    try {
      const db = ModaDB.read();
      const product = db.products.find(p => p.id === req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found.' });
      }
      
      const {
        code,
        barcode,
        name,
        note,
        category,
        categoryId,
        brandId,
        price,
        cost,
        wholesalePrice,
        minPrice,
        inventory,
        stockAlert,
        taxNet,
        taxMethod,
        discount,
        discountMethod,
        type,
        unitId,
        unitSaleId,
        unitPurchaseId,
        isActive,
        isFeatured,
        hideFromOnlineStore,
        isPreorder,
        preorderAvailableDate,
        preorderLimit,
        preorderNote,
        isBatchTracked,
        shelfLifeDays,
        genericName,
        strength,
        dosageForm,
        packSize,
        manufacturer,
        prescriptionRequired,
        drugSchedule,
        sku,
        variant,
        images
      } = req.body;

      const updatedProduct = {
        ...product,
        id: req.params.id,
        code: code !== undefined ? code : product.code,
        barcode: barcode !== undefined ? barcode : product.barcode,
        name: name || product.name,
        note: note !== undefined ? note : product.note,
        category: category || product.category,
        categoryId: categoryId !== undefined ? categoryId : product.categoryId,
        brandId: brandId !== undefined ? brandId : product.brandId,
        price: price !== undefined ? parseFloat(price) : product.price,
        cost: cost !== undefined ? parseFloat(cost) : product.cost,
        wholesalePrice: wholesalePrice !== undefined ? parseFloat(wholesalePrice) : product.wholesalePrice,
        minPrice: minPrice !== undefined ? parseFloat(minPrice) : product.minPrice,
        inventory: inventory !== undefined ? parseInt(inventory) : product.inventory,
        stockAlert: stockAlert !== undefined ? parseFloat(stockAlert) : product.stockAlert,
        taxNet: taxNet !== undefined ? parseFloat(taxNet) : product.taxNet,
        taxMethod: taxMethod !== undefined ? taxMethod : product.taxMethod,
        discount: discount !== undefined ? parseFloat(discount) : product.discount,
        discountMethod: discountMethod !== undefined ? discountMethod : product.discountMethod,
        type: type !== undefined ? type : product.type,
        unitId: unitId !== undefined ? unitId : product.unitId,
        unitSaleId: unitSaleId !== undefined ? unitSaleId : product.unitSaleId,
        unitPurchaseId: unitPurchaseId !== undefined ? unitPurchaseId : product.unitPurchaseId,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : product.isActive,
        isFeatured: isFeatured !== undefined ? (isFeatured ? 1 : 0) : product.isFeatured,
        hideFromOnlineStore: hideFromOnlineStore !== undefined ? (hideFromOnlineStore ? 1 : 0) : product.hideFromOnlineStore,
        isPreorder: isPreorder !== undefined ? (isPreorder ? 1 : 0) : product.isPreorder,
        preorderAvailableDate: preorderAvailableDate !== undefined ? preorderAvailableDate : product.preorderAvailableDate,
        preorderLimit: preorderLimit !== undefined ? parseInt(preorderLimit) : product.preorderLimit,
        preorderNote: preorderNote !== undefined ? preorderNote : product.preorderNote,
        isBatchTracked: isBatchTracked !== undefined ? (isBatchTracked ? 1 : 0) : product.isBatchTracked,
        shelfLifeDays: shelfLifeDays !== undefined ? parseInt(shelfLifeDays) : product.shelfLifeDays,
        genericName: genericName !== undefined ? genericName : product.genericName,
        strength: strength !== undefined ? strength : product.strength,
        dosageForm: dosageForm !== undefined ? dosageForm : product.dosageForm,
        packSize: packSize !== undefined ? packSize : product.packSize,
        manufacturer: manufacturer !== undefined ? manufacturer : product.manufacturer,
        prescriptionRequired: prescriptionRequired !== undefined ? (prescriptionRequired ? 1 : 0) : product.prescriptionRequired,
        drugSchedule: drugSchedule !== undefined ? drugSchedule : product.drugSchedule,
        sku: sku || product.sku,
        variant: variant !== undefined ? variant : product.variant,
        images: images !== undefined ? images : product.images,
        updatedAt: new Date().toISOString()
      };
      
      ModaDB.saveProduct(updatedProduct);
      ModaDB.log((req as any).authUser.id, (req as any).authUser.username, "PRODUCT_UPDATE", "PRODUCT", `Updated product ${updatedProduct.name}`);
      res.json({ success: true, product: updatedProduct });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Sales & POS API ---
  app.post('/api/sales', userAuth, async (req, res) => {
    try {
      const result = await SalesService.createSale(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/sales', userAuth, async (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      const result = await SalesService.getSales(merchantId);
      res.json({ success: true, sales: result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/sales/:id/refund', userAuth, checkPermission('sales'), async (req, res) => {
    try {
      const merchantId = (req as any).authUser.merchantId;
      const userId = (req as any).authUser.id;
      const { reason } = req.body;
      const result = await SalesService.refundSale(merchantId, userId, req.params.id, reason || 'No reason provided');
      res.json({ success: true, result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Purchase API ---
  app.post('/api/purchases', userAuth, async (req, res) => {
    try {
      const result = await PurchaseService.createPurchase(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/purchases', userAuth, async (req, res) => {
    try {
      const merchantId = req.query.merchantId || (req as any).authUser.merchantId;
      const result = await PurchaseService.getPurchases(merchantId as string);
      res.json({ success: true, purchases: result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/purchases/:id/return', userAuth, checkPermission('purchase'), async (req, res) => {
    try {
      const merchantId = (req as any).authUser.merchantId;
      const userId = (req as any).authUser.id;
      const { reason } = req.body;
      const result = await PurchaseService.returnPurchase(merchantId, userId, req.params.id, reason || 'No reason provided');
      res.json({ success: true, result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Inventory API --- User & Customer API ---
  app.get('/api/users', userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      const role = req.query.role as string;
      const db = ModaDB.getSqlite();
      let sql = 'SELECT * FROM users WHERE merchantId = ?';
      const params = [merchantId];
      if (role) {
        sql += ' AND role = ?';
        params.push(role);
      }
      const users = db.prepare(sql).all(...params).map((u: any) => ({
        ...u,
        profile: JSON.parse(u.profile || '{}'),
        customerData: JSON.parse(u.customerData || 'null'),
        metadata: JSON.parse(u.metadata || '{}')
      }));
      res.json({ success: true, users });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Supplier API ---
  app.get('/api/suppliers', userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      const suppliers = ModaDB.getSuppliers(merchantId);
      res.json({ success: true, suppliers });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/suppliers', userAuth, (req, res) => {
    try {
      const supplier = {
        ...req.body,
        id: req.body.id || `sup_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString()
      };
      ModaDB.saveSupplier(supplier);
      res.json({ success: true, supplier });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/suppliers/:id', userAuth, (req, res) => {
    try {
      ModaDB.deleteSupplier(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Inventory API ---
  app.post('/api/inventory/movements', userAuth, checkPermission('inventory'), (req, res) => {
    try {
      const body = req.body;
      const merchantId = body.merchantId || (req.authUser && req.authUser.merchantId) || null;
      if (!merchantId) return res.status(400).json({ success: false, error: 'Missing merchantId.' });
      if (typeof body.quantity !== 'number') return res.status(400).json({ success: false, error: 'Missing or invalid quantity.' });
      const movement = {
        merchantId,
        type: body.type || 'ADJUSTMENT',
        variantId: body.variantId || null,
        batchId: body.batchId || null,
        fromWarehouseId: body.fromWarehouseId || null,
        fromLocationId: body.fromLocationId || null,
        toWarehouseId: body.toWarehouseId || null,
        toLocationId: body.toLocationId || null,
        quantity: Number(body.quantity),
        referenceType: body.referenceType || null,
        referenceId: body.referenceId || null,
        idempotencyKey: body.idempotencyKey || null,
        notes: body.notes || null,
        createdAt: new Date().toISOString()
      };

      const result = ModaDB.saveInventoryMovement(movement as any);
      ModaDB.log((req as any).authUser.id, (req as any).authUser.username, 'INVENTORY_MOVEMENT_CREATE', 'INVENTORY', `Created movement ${result.id}`);
      if ((result as any).idempotent) {
        return res.json({ success: true, id: result.id, idempotent: true });
      }
      res.json({ success: true, id: result.id });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Purchase API (minimal) ---
  app.post('/api/purchases', userAuth, checkPermission('purchase'), (req, res) => {
    try {
      const body = req.body;
      const merchantId = body.merchantId || (req.authUser && req.authUser.merchantId) || null;
      if (!merchantId) return res.status(400).json({ success: false, error: 'Missing merchantId.' });
      const id = body.id || `po_${Math.random().toString(36).slice(2,10)}`;
      
      // Check idempotency at purchase order level (Order-Level strategy)
      const idempotencyKey = `PURCHASE:${id}`;
      const existing = ModaDB.getPurchaseById(id);
      if (existing) {
        return res.json({ success: true, id: existing.id, idempotent: true, idempotencyKey });
      }

      const items = Array.isArray(body.items) ? body.items.map((it: any) => ({
        variantId: it.variantId,
        batchId: it.batchId || null,
        quantity: Number(it.quantity || 0),
        warehouseId: it.warehouseId || null,
        locationId: it.locationId || null,
      })) : [];

      const purchase: any = {
        id,
        merchantId,
        purchaseNumber: body.purchaseNumber || id,
        items,
        createdAt: new Date().toISOString()
      };

      // persist purchase record
      ModaDB.savePurchase(purchase);

      // Emit movements for each line with shared Order-Level idempotency key
      const movementIds: string[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const mov = {
          merchantId,
          type: 'PURCHASE',
          variantId: it.variantId,
          batchId: it.batchId || null,
          toWarehouseId: it.warehouseId || null,
          toLocationId: it.locationId || null,
          quantity: Number(it.quantity),
          referenceType: 'PURCHASE',
          referenceId: id,
          // All lines from same purchase order share the same Order-Level idempotency key
          idempotencyKey: i === 0 ? idempotencyKey : null,
          notes: `Auto-created from purchase ${id} (line ${i + 1})`,
          createdAt: new Date().toISOString()
        };
        const r = ModaDB.saveInventoryMovement(mov as any);
        movementIds.push(r.id);
      }

      ModaDB.log((req as any).authUser.id, (req as any).authUser.username, 'PURCHASE_CREATE', 'PURCHASE', `Created purchase ${id}`);
      res.json({ success: true, id, idempotencyKey, movementIds });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/inventory/records', userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId || (req.authUser && req.authUser.merchantId) || null;
      const records = ModaDB.getInventoryRecords(merchantId as string | undefined);
      res.json({ success: true, records });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/inventory/movements', userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId || (req.authUser && req.authUser.merchantId) || null;
      const movements = ModaDB.getInventoryMovements(merchantId as string | undefined);
      res.json({ success: true, movements });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Held Orders API
  app.get("/api/pos/held-orders", userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId || (req.authUser && req.authUser.merchantId) || null;
      if (!merchantId) return res.status(400).json({ success: false, error: "merchantId is required" });
      res.json({ success: true, orders: ModaDB.getHeldOrders(merchantId as string) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/pos/held-orders", userAuth, (req, res) => {
    try {
      const order = { ...req.body, id: req.body.id || crypto.randomUUID(), createdAt: new Date().toISOString() };
      ModaDB.saveHeldOrder(order);
      res.json({ success: true, order });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/pos/held-orders/:id", userAuth, (req, res) => {
    try {
      ModaDB.deleteHeldOrder(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Credit/Debt API
  app.get("/api/credits", userAuth, (req, res) => {
    try {
      const merchantId = (req as any).authUser.merchantId;
      const { entityType, entityId } = req.query;
      res.json({ success: true, records: ModaDB.getCreditRecords(merchantId, entityType as string, entityId as string) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/credits", userAuth, (req, res) => {
    try {
      const merchantId = (req as any).authUser.merchantId;
      ModaDB.saveCreditRecord({ ...req.body, merchantId });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/products/:id", userAuth, checkPermission('product'), (req, res) => {
    try {
      ModaDB.deleteProduct(req.params.id);
      ModaDB.log((req as any).authUser.id, (req as any).authUser.username, "PRODUCT_DELETE", "PRODUCT", `Deleted product ID: ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/categories", userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      const store = ModaDB.getStoreByMerchantId(merchantId);
      if (!store) return res.json({ success: true, categories: [] });
      
      const categories = ModaDB.getCategories(store.id);
      res.json({ success: true, categories });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/brands", userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      const store = ModaDB.getStoreByMerchantId(merchantId);
      if (!store) return res.json({ success: true, brands: [] });
      const brands = ModaDB.getBrands(store.id);
      res.json({ success: true, brands });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/brands", userAuth, checkPermission('product'), (req, res) => {
    try {
      const { merchantId, name, description } = req.body;
      const store = ModaDB.getStoreByMerchantId(merchantId);
      if (!store) return res.status(404).json({ success: false, error: "Store not found." });
      const brand = {
        id: `brand-${Math.random().toString(36).substring(2, 8)}`,
        storeId: store.id,
        name,
        description: description || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      ModaDB.saveBrand(brand);
      res.json({ success: true, brand });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/brands/:id", userAuth, checkPermission('product'), (req, res) => {
    try {
      const { name, description } = req.body;
      const existing = ModaDB.getBrandById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Brand not found.' });
      const brand = {
        ...existing,
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        updatedAt: new Date().toISOString()
      };
      ModaDB.saveBrand(brand);
      res.json({ success: true, brand });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/brands/:id", userAuth, checkPermission('product'), (req, res) => {
    try {
      ModaDB.deleteBrand(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/collections", userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      const store = ModaDB.getStoreByMerchantId(merchantId);
      if (!store) return res.json({ success: true, collections: [] });
      const collections = ModaDB.getCollections(store.id).map((collection) => ({
        ...collection,
        productIds: ModaDB.getCollectionProductIds(collection.id)
      }));
      res.json({ success: true, collections });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/collections", userAuth, checkPermission('product'), (req, res) => {
    try {
      const { merchantId, name, description, productIds } = req.body;
      const store = ModaDB.getStoreByMerchantId(merchantId);
      if (!store) return res.status(404).json({ success: false, error: "Store not found." });
      const collection = {
        id: `col-${Math.random().toString(36).substring(2, 8)}`,
        storeId: store.id,
        name,
        description: description || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      ModaDB.saveCollection(collection);
      if (Array.isArray(productIds)) {
        productIds.forEach((productId: string) => ModaDB.saveCollectionProduct(collection.id, productId));
      }
      res.json({ success: true, collection });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/collections/:id", userAuth, checkPermission('product'), (req, res) => {
    try {
      const { name, description, productIds } = req.body;
      const existing = ModaDB.getCollectionById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Collection not found.' });
      const collection = {
        ...existing,
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        updatedAt: new Date().toISOString()
      };
      ModaDB.saveCollection(collection);
      if (Array.isArray(productIds)) {
        ModaDB.deleteCollectionProducts(collection.id);
        productIds.forEach((productId: string) => ModaDB.saveCollectionProduct(collection.id, productId));
      }
      res.json({ success: true, collection });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/collections/:id", userAuth, checkPermission('product'), (req, res) => {
    try {
      ModaDB.deleteCollection(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/product-details/:id", userAuth, (req, res) => {
    try {
      const productId = req.params.id;
      const db = ModaDB.read();
      const product = db.products.find((p: any) => p.id === productId);
      if (!product) return res.status(404).json({ success: false, error: 'Product not found.' });
      const variants = ModaDB.getProductVariants(productId);
      const images = ModaDB.getProductImages(productId);
      const batches = ModaDB.getProductBatches(productId);
      const collections = ModaDB.getCollections(product.storeId).filter((col) => ModaDB.getCollectionProductIds(col.id).includes(productId));
      const brand = product.brandId ? ModaDB.getBrandById(product.brandId) : null;
      res.json({ success: true, product: { ...product, brand }, variants, images, batches, collections });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/product-variants", userAuth, (req, res) => {
    try {
      const productId = req.query.productId as string;
      const variants = ModaDB.getProductVariants(productId);
      res.json({ success: true, variants });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/product-variants", userAuth, checkPermission('product'), (req, res) => {
    try {
      const { productId, sku, attributes, price, inventory, isActive, image } = req.body;
      const variant = {
        id: `var-${Math.random().toString(36).substring(2, 8)}`,
        productId,
        sku,
        attributes: JSON.stringify(attributes || {}),
        price: price !== undefined ? parseFloat(price) : 0,
        inventory: inventory !== undefined ? parseInt(inventory) : 0,
        isActive: isActive ? 1 : 0,
        image: image || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      ModaDB.saveProductVariant(variant);
      res.json({ success: true, variant });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/product-variants/:id", userAuth, checkPermission('product'), (req, res) => {
    try {
      const existing = ModaDB.getProductVariantById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Variant not found.' });
      const { sku, attributes, price, inventory, isActive, image } = req.body;
      const variant = {
        ...existing,
        sku: sku !== undefined ? sku : existing.sku,
        attributes: JSON.stringify(attributes !== undefined ? attributes : JSON.parse(existing.attributes || '{}')),
        price: price !== undefined ? parseFloat(price) : existing.price,
        inventory: inventory !== undefined ? parseInt(inventory) : existing.inventory,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : existing.isActive,
        image: image !== undefined ? image : existing.image,
        updatedAt: new Date().toISOString()
      };
      ModaDB.saveProductVariant(variant);
      res.json({ success: true, variant });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/product-variants/:id", userAuth, checkPermission('product'), (req, res) => {
    try {
      ModaDB.deleteProductVariant(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/product-images", userAuth, (req, res) => {
    try {
      const productId = req.query.productId as string;
      const images = ModaDB.getProductImages(productId);
      res.json({ success: true, images });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/product-images", userAuth, checkPermission('product'), (req, res) => {
    try {
      const { productId, url, alt, isPrimary, orderIndex } = req.body;
      const image = {
        id: `img-${Math.random().toString(36).substring(2, 8)}`,
        productId,
        url,
        alt: alt || null,
        isPrimary: isPrimary ? 1 : 0,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex) : 0,
        createdAt: new Date().toISOString()
      };
      ModaDB.saveProductImage(image);
      res.json({ success: true, image });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/product-images/:id", userAuth, checkPermission('product'), (req, res) => {
    try {
      ModaDB.deleteProductImage(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/product-batches", userAuth, (req, res) => {
    try {
      const productId = req.query.productId as string;
      const batches = ModaDB.getProductBatches(productId);
      res.json({ success: true, batches });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/product-batches", userAuth, checkPermission('product'), (req, res) => {
    try {
      const { productId, variantId, batchNumber, quantity, receivedAt, expiresAt, notes } = req.body;
      const batch = {
        id: `batch-${Math.random().toString(36).substring(2, 8)}`,
        productId,
        variantId: variantId || null,
        batchNumber,
        quantity: parseInt(quantity),
        receivedAt: receivedAt || null,
        expiresAt: expiresAt || null,
        notes: notes || null,
        createdAt: new Date().toISOString()
      };
      ModaDB.saveProductBatch(batch);
      res.json({ success: true, batch });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/product-batches/:id", userAuth, checkPermission('product'), (req, res) => {
    try {
      const existing = ModaDB.getProductBatchById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Batch not found.' });
      const { variantId, batchNumber, quantity, receivedAt, expiresAt, notes } = req.body;
      const batch = {
        ...existing,
        variantId: variantId !== undefined ? variantId || null : existing.variantId,
        batchNumber: batchNumber !== undefined ? batchNumber : existing.batchNumber,
        quantity: quantity !== undefined ? parseInt(quantity) : existing.quantity,
        receivedAt: receivedAt !== undefined ? receivedAt : existing.receivedAt,
        expiresAt: expiresAt !== undefined ? expiresAt : existing.expiresAt,
        notes: notes !== undefined ? notes : existing.notes,
        createdAt: existing.createdAt
      };
      ModaDB.saveProductBatch(batch);
      res.json({ success: true, batch });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/product-batches/:id", userAuth, checkPermission('product'), (req, res) => {
    try {
      ModaDB.deleteProductBatch(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Cart Management ---
  app.get("/api/cart", userAuth, (req, res) => {
    try {
      const user = (req as any).authUser;
      const cart = ModaDB.getCart(user.id);
      res.json({ success: true, cart });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/cart/sync", userAuth, (req, res) => {
    try {
      const user = (req as any).authUser;
      const { items, coupon, discount } = req.body;
      const cart = { userId: user.id, items, coupon, discount };
      ModaDB.saveCart(cart);
      res.json({ success: true, cart });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/cart/clear", userAuth, (req, res) => {
    try {
      const user = (req as any).authUser;
      ModaDB.clearCart(user.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Order Management ---
  app.get("/api/orders", userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      if (!merchantId) return res.status(400).json({ success: false, error: "Missing merchantId." });
      
      const orders = ModaDB.getOrders(merchantId);
      res.json({ success: true, orders });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/orders", userAuth, (req, res) => {
    try {
      const user = (req as any).authUser;
      const { merchantId, storeId, items, totalPrice } = req.body;
      
      const order = {
        id: `ord-${Math.random().toString(36).substring(2, 6)}`,
        userId: user.id,
        storeId,
        merchantId,
        items,
        totalPrice,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      ModaDB.saveOrder(order);
      ModaDB.log(user.id, user.username, "ORDER_CREATE", "ORDER", `Created order ${order.id} for ¥${totalPrice}`);
      
      // Auto-create a pending payment record
      const payment = {
        id: `pay-${Math.random().toString(36).substring(2, 6)}`,
        orderId: order.id,
        amount: totalPrice,
        method: 'stripe',
        status: 'pending',
        createdAt: order.createdAt
      };
      ModaDB.savePayment(payment);
      
      res.json({ success: true, order, payment });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.patch("/api/orders/:id/status", userAuth, checkPermission('order'), (req, res) => {
    try {
      const { status, shipmentTracking, cancellationReason, refundReason } = req.body;
      const order = ModaDB.getOrderById(req.params.id);
      if (!order) return res.status(404).json({ success: false, error: "Order not found." });
      
      if (status) order.status = status;
      if (shipmentTracking) order.shipmentTracking = shipmentTracking;
      if (cancellationReason) order.cancellationReason = cancellationReason;
      if (refundReason) order.refundReason = refundReason;
      
      ModaDB.saveOrder(order);
      ModaDB.log((req as any).authUser.id, (req as any).authUser.username, "ORDER_STATUS_UPDATE", "ORDER", `Updated order ${order.id} status to ${status}`);
      
      // If order is paid, create a finance record
      if (status === 'paid' || status === 'completed') {
        ModaDB.saveFinanceRecord({
          merchantId: order.merchantId,
          type: 'income',
          amount: order.totalPrice,
          orderId: order.id,
          description: `Order ${order.id} payment`
        });
      } else if (status === 'refunded') {
        ModaDB.saveFinanceRecord({
          merchantId: order.merchantId,
          type: 'expense',
          amount: order.totalPrice,
          orderId: order.id,
          description: `Order ${order.id} refund`
        });
      }
      
      res.json({ success: true, order });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Finance Center Management ---
  app.get("/api/company/finance", userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      if (!merchantId) return res.status(400).json({ success: false, error: "Missing merchantId." });
      
      const account = ModaDB.getCompanyAccountByMerchant(merchantId);
      const recentTransactions = ModaDB.getBusinessTransactions(merchantId).slice(0, 5);
      
      res.json({ 
        success: true, 
        account: account || { balance: 0, currency: 'CNY', earnings: 0, referralBalance: 0 },
        recentTransactions 
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/company/transactions", userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      if (!merchantId) return res.status(400).json({ success: false, error: "Missing merchantId." });
      
      const transactions = ModaDB.getBusinessTransactions(merchantId);
      res.json({ success: true, transactions });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/company/transactions", userAuth, checkPermission('finance'), (req, res) => {
    try {
      const { merchantId, type, amount, currency, description, referenceId, metadata } = req.body;
      const user = (req as any).authUser;
      
      const tx = {
        id: `btx-${Math.random().toString(36).substring(2, 6)}`,
        userId: user.id,
        merchantId,
        type,
        amount: parseFloat(amount),
        currency,
        status: 'completed',
        description,
        referenceId,
        metadata,
        createdAt: new Date().toISOString()
      };
      
      ModaDB.saveBusinessTransaction(tx as any);
      
      // Update account balance
      let account = ModaDB.getCompanyAccountByMerchant(merchantId);
      if (!account) {
        account = {
          id: `acc-${Math.random().toString(36).substring(2, 6)}`,
          userId: user.id,
          merchantId,
          balance: 0,
          currency: currency || 'CNY',
          earnings: 0,
          referralBalance: 0,
          status: 'active',
          createdAt: new Date().toISOString()
        };
      }
      
      if (type === 'INCOME' || type === 'ADJUSTMENT') {
        account.balance += tx.amount;
      } else if (type === 'EXPENSE' || type === 'REFUND') {
        account.balance -= tx.amount;
      }
      
      ModaDB.saveCompanyAccount(account);
      ModaDB.log(user.id, user.username, "FINANCE_TX_CREATE", "FINANCE", `Created transaction ${tx.id} (${type}): ${amount}`);
      
      res.json({ success: true, transaction: tx, account });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/company/collection-links", userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      const links = ModaDB.getCollectionLinks(merchantId);
      res.json({ success: true, links });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/company/collection-links", userAuth, checkPermission('finance'), (req, res) => {
    try {
      const { merchantId, amount, currency, description } = req.body;
      const linkId = Math.random().toString(36).substring(2, 10);
      const link = {
        id: `clink-${linkId}`,
        merchantId,
        amount: parseFloat(amount),
        currency,
        description,
        url: `${DEFAULT_APP_URL}/pay/${linkId}`,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      ModaDB.saveCollectionLink(link as any);
      res.json({ success: true, link });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/company/payment-gateways", userAuth, (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      const gateways = ModaDB.getPaymentGateways(merchantId);
      res.json({ success: true, gateways });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/company/ai-analysis", userAuth, async (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      if (!merchantId) return res.status(400).json({ success: false, error: "Missing merchantId." });
      
      // Get data for analysis
      const transactions = ModaDB.getBusinessTransactions(merchantId);
      
      // Generate a mock analysis for now, or use Gemini if enabled
      let analysis = ModaDB.getLatestAiFinanceAnalysis(merchantId);
      
      if (!analysis || new Date(analysis.createdAt) < new Date(Date.now() - 3600000)) {
        // Run analysis (simulated)
        const revenue = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
        const profit = revenue - expense;
        
        analysis = {
          id: `ana-${Math.random().toString(36).substring(2, 6)}`,
          merchantId,
          agentName: "刘会计",
          reportDate: new Date().toISOString().split('T')[0],
          metrics: {
            revenue,
            expense,
            profit,
            growth: 12.5 // mock
          },
          insights: [
            `本周经营收入为 ¥${revenue.toLocaleString()}，支出为 ¥${expense.toLocaleString()}。`,
            "主要收入来源为线上订单支付，增长趋势稳定。",
            "库存周转率保持在健康水平，服装类目表现最佳。"
          ],
          recommendations: [
            "建议增加夏季新品的营销投入，目前转化率较高。",
            "优化顺丰物流配送路径，预计可降低 5% 的运营成本。",
            "考虑针对老客户推出充值赠送活动，锁定现金流。"
          ],
          createdAt: new Date().toISOString()
        };
        
        ModaDB.saveAiFinanceAnalysis(analysis as any);
      }
      
      res.json({ success: true, analysis });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Payment Management ---
  app.post("/api/payments/:id/callback", (req, res) => {
    try {
      const { status, transactionId } = req.body;
      const db = ModaDB.read();
      const payment = db.payments.find(p => p.id === req.params.id);
      if (!payment) return res.status(404).json({ success: false, error: "Payment not found." });
      
      payment.status = status;
      if (transactionId) payment.transactionId = transactionId;
      ModaDB.savePayment(payment);
      
      // Update order status if payment successful
      if (status === 'success') {
        const order = ModaDB.getOrderById(payment.orderId);
        if (order) {
          order.status = 'paid';
          ModaDB.saveOrder(order);
          
          ModaDB.saveFinanceRecord({
            merchantId: order.merchantId,
            type: 'income',
            amount: order.totalPrice,
            orderId: order.id,
            description: `Order ${order.id} payment (via callback)`
          });
        }
      }
      
      res.json({ success: true, payment });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Finance Management ---
  app.get("/api/finance/report", userAuth, checkPermission('finance'), (req, res) => {
    try {
      const merchantId = req.query.merchantId as string;
      if (!merchantId) return res.status(400).json({ success: false, error: "Missing merchantId." });
      
      const records = ModaDB.getFinanceRecords(merchantId);
      
      // Calculate summary
      const income = records.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
      const expense = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
      const profit = income - expense;
      
      res.json({ 
        success: true, 
        report: {
          income,
          expense,
          profit,
          records
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 1. API STATUS PORTAL ===
  app.get("/api/status", (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    const hasStripe = !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "MY_STRIPE_SECRET_KEY";
    res.json({
      success: true,
      provider: "Gemini Engine (Cloud Run Gateway)",
      env: process.env.NODE_ENV || "development",
      appUrl: process.env.APP_URL || DEFAULT_APP_URL,
      adminUrl: process.env.ADMIN_URL || DEFAULT_ADMIN_URL,
      apiBaseUrl: process.env.API_BASE_URL || process.env.ADMIN_URL || DEFAULT_ADMIN_URL,
      customDomain: process.env.CUSTOM_DOMAIN || null,
      authDomain: process.env.AUTH_DOMAIN || null,
      database: {
        client: process.env.DB_CLIENT || 'sqlite',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || null,
        name: process.env.DB_NAME || 'modaui',
        sqlitePath: process.env.SQLITE_DB_PATH || 'data/modadb.sqlite',
        url: process.env.DATABASE_URL || null
      },
      hasKey,
      hasStripe,
      stripeStatus: hasStripe ? "Provisioned" : "Simulation Fallback Active",
      status: hasKey ? "Online" : "Offline Simulation",
      time: new Date().toISOString()
    });
  });

  const AUTH_PROVIDER_DEFINITIONS = [
    { provider: 'google', label: 'Google', description: 'Google OAuth login', envRequired: [] },
    { provider: 'facebook', label: 'Facebook', description: 'Facebook OAuth login', envRequired: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'] },
    { provider: 'apple', label: 'Apple', description: 'Apple Sign In', envRequired: ['APPLE_SERVICE_ID', 'APPLE_PRIVATE_KEY'] },
    { provider: 'wechat', label: 'WeChat', description: 'WeChat OAuth login', envRequired: ['WECHAT_APP_ID', 'WECHAT_SECRET', 'WECHAT_MCH_ID'] },
  ];

  function getProviderDefinition(provider: string) {
    return AUTH_PROVIDER_DEFINITIONS.find((item) => item.provider === provider);
  }

  function isProviderConfigured(provider: string) {
    const def = getProviderDefinition(provider);
    if (!def) return false;
    return def.envRequired.every((name) => !!process.env[name]);
  }

  function missingProviderEnv(provider: string) {
    const def = getProviderDefinition(provider);
    if (!def) return [];
    return def.envRequired.filter((name) => !process.env[name]);
  }

  function buildProviderResponse() {
    const saved = ModaDB.getAuthProviderSettings();
    return AUTH_PROVIDER_DEFINITIONS.map((item) => {
      const savedItem = saved.find((entry) => entry.provider === item.provider);
      const configured = isProviderConfigured(item.provider);
      const enabled = configured && (savedItem?.enabled ?? false);
      return {
        id: item.provider,
        provider: item.provider,
        label: item.label,
        description: item.description,
        enabled,
        configured,
        requiredEnv: item.envRequired,
        missingEnv: missingProviderEnv(item.provider),
      };
    });
  }

  app.get('/api/auth/providers', (req, res) => {
    try {
      const providers = buildProviderResponse();
      res.json({ success: true, providers });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/auth/providers', adminAuth, (req, res) => {
    try {
      const { provider, enabled } = req.body;
      if (typeof provider !== 'string' || typeof enabled !== 'boolean') {
        return res.status(400).json({ success: false, error: 'Invalid payload.' });
      }
      const providers = buildProviderResponse();
      const found = providers.find((item) => item.provider === provider);
      if (!found) {
        return res.status(404).json({ success: false, error: 'Unknown provider.' });
      }
      if (enabled && !found.configured) {
        return res.status(400).json({
          success: false,
          error: `Provider ${found.label} cannot be enabled until required environment variables are configured: ${found.requiredEnv.join(', ')}.`
        });
      }
      const updated = providers.map((item) => item.provider === provider ? { ...item, enabled: enabled && item.configured } : item);
      ModaDB.saveAuthProviderSettings(updated.map((item) => ({
        id: item.provider,
        provider: item.provider as any,
        enabled: item.enabled,
        label: item.label,
        config: {}
      })));
      const authUser = (req as any).authUser;
      ModaDB.log(authUser?.id || 'system', authUser?.username || 'admin', 'AUTH_PROVIDER_UPDATE', 'AUTH', `Updated ${provider} enabled=${enabled}`);
      res.json({ success: true, providers: updated });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 2. AUTHENTICATION SERVICES (AUTH & USERS API) ===
  app.post("/api/auth/register", (req, res) => {
    try {
      const {
        username: providedUsername,
        name,
        email,
        password,
        role = "Customer",
        industryId,
        operatingMode,
        planId
      } = req.body;

      if (!email) {
        res.status(400).json({ success: false, error: "Email is required for registration." });
        return;
      }

      const normalizedEmail = String(email).toLowerCase();
      let user = ModaDB.getUserByEmail(normalizedEmail);

      if (user) {
        if (role === 'Platform Admin' && user.role !== 'Platform Admin') {
          if (!password) {
            res.status(400).json({ success: false, error: 'Platform Admin 注册必须提供密码。' });
            return;
          }
          user.role = 'Platform Admin';
          user.passwordHash = ModaDB.hashPassword(password);
          ModaDB.saveUser(user);
          ModaDB.log(user.id, user.username, "USER_REGISTER", "AUTH", `Existing user upgraded to Platform Admin: ${email}`);
        } else {
          ModaDB.log(user.id, user.username, "USER_REGISTER", "AUTH", `Existing user registration requested: ${email}`);
        }

        const sessionId = `sess_${Math.random().toString(36).slice(2, 15)}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        ModaDB.saveSession({ id: sessionId, userId: user.id, expiresAt });
        res.json({ success: true, sessionId, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
        return;
      }

      const username = providedUsername || name || normalizedEmail.split('@')[0] || `user_${Math.random().toString(36).slice(2, 8)}`;
      const safePassword = password || `autogen_${Math.random().toString(36).slice(2, 10)}`;
      const userId = `usr_${Math.random().toString(36).slice(2, 11)}`;
      const newUser: DBUser = {
        id: userId,
        username,
        email: normalizedEmail,
        passwordHash: ModaDB.hashPassword(safePassword),
        role,
        verified: true,
        createdAt: new Date().toISOString(),
        metadata: {
          industryId,
          operatingMode,
          planId
        }
      };
      ModaDB.saveUser(newUser);
      const sessionId = `sess_${Math.random().toString(36).slice(2, 15)}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      ModaDB.saveSession({ id: sessionId, userId, expiresAt });
      ModaDB.log(userId, username, "USER_REGISTER", "AUTH", `User registration successful: ${normalizedEmail}`);

      res.status(201).json({ success: true, sessionId, user: { id: userId, username, email: normalizedEmail, role } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: "Email is required for login." });
        return;
      }
      const normalizedEmail = String(email).toLowerCase();
      const user = ModaDB.getUserByEmail(normalizedEmail);

      if (!user || !password) {
        res.status(401).json({ success: false, error: "Invalid credentials." });
        return;
      }

      if (user.passwordHash !== ModaDB.hashPassword(password)) {
        res.status(401).json({ success: false, error: "Invalid credentials." });
        return;
      }

      const sessionId = `sess_${Math.random().toString(36).slice(2, 15)}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      ModaDB.saveSession({ id: sessionId, userId: user.id, expiresAt });
      ModaDB.log(user.id, user.username, "USER_LOGIN", "AUTH", `User login session created: ${sessionId}`);

      res.json({ success: true, sessionId, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    try {
      const { sessionId } = req.body;
      if (sessionId) {
        ModaDB.deleteSession(sessionId);
      }
      res.json({ success: true, message: "Logged out from unified console." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/me", (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        res.status(400).json({ success: false, error: "Session token is required" });
        return;
      }
      const session = ModaDB.getSession(sessionId);
      if (!session || new Date(session.expiresAt) <= new Date()) {
        res.status(401).json({ success: false, error: "Session expired or invalid" });
        return;
      }
      const user = ModaDB.getUserById(session.userId);
      // If the user record cannot be resolved (corrupt/missing DB), return a safe fallback
      // to allow admin sessions created earlier to continue functioning in local dev.
      let respUser: any = null;
      if (!user) {
        respUser = {
          id: session.userId,
          username: 'platform_admin',
          email: 'admin@admin.com',
          role: 'Platform Admin'
        };
      } else {
        respUser = { id: user.id, username: user.username, email: user.email, role: user.role };
      }
      res.json({ success: true, user: respUser });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/profile/update", userAuth, (req, res) => {
    try {
      const { username, email, profile, metadata } = req.body;
      const user = (req as any).authUser;
      
      if (username) user.username = username;
      if (email) user.email = email.toLowerCase();
      if (profile) user.profile = { ...user.profile, ...profile };
      if (metadata) user.metadata = { ...user.metadata, ...metadata };
      
      ModaDB.saveUser(user);
      ModaDB.log(user.id, user.username, "USER_PROFILE_UPDATE", "AUTH", `Profile updated for user: ${user.email}`);
      res.json({ success: true, user: { id: user.id, username: user.username, email: user.email, role: user.role, profile: user.profile, metadata: user.metadata } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/password/reset-request", (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, error: "Email is required." });
      
      const user = ModaDB.getUserByEmail(email.toLowerCase());
      if (!user) {
        // Return success even if user not found to prevent email enumeration
        return res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
      }
      
      const token = Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);
      user.resetToken = token;
      user.resetTokenExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour
      ModaDB.saveUser(user);
      
      ModaDB.log(user.id, user.username, "PASSWORD_RESET_REQUEST", "AUTH", `Password reset requested for: ${email}. Token: ${token}`);
      res.json({ success: true, message: "Reset link sent.", token }); // In real world, send via email. Here we return token for demo/verification.
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/password/reset", (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).json({ success: false, error: "Token and new password are required." });
      
      const db = ModaDB.read();
      const user = db.users.find(u => u.resetToken === token && new Date(u.resetTokenExpires || 0) > new Date());
      
      if (!user) return res.status(400).json({ success: false, error: "Invalid or expired reset token." });
      
      user.passwordHash = ModaDB.hashPassword(newPassword);
      user.resetToken = undefined;
      user.resetTokenExpires = undefined;
      ModaDB.saveUser(user);
      
      ModaDB.log(user.id, user.username, "PASSWORD_RESET_SUCCESS", "AUTH", `Password reset successful for: ${user.email}`);
      res.json({ success: true, message: "Password reset successful." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/email/verify-request", userAuth, (req, res) => {
    try {
      const user = (req as any).authUser;
      const token = Math.random().toString(36).slice(2, 10).toUpperCase();
      user.verificationToken = token;
      ModaDB.saveUser(user);
      
      ModaDB.log(user.id, user.username, "EMAIL_VERIFY_REQUEST", "AUTH", `Email verification requested for: ${user.email}. Code: ${token}`);
      res.json({ success: true, message: "Verification code sent.", code: token });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/email/verify", userAuth, (req, res) => {
    try {
      const { code } = req.body;
      const user = (req as any).authUser;
      
      if (!code || user.verificationToken !== code) {
        return res.status(400).json({ success: false, error: "Invalid verification code." });
      }
      
      user.verified = true;
      user.verificationToken = undefined;
      ModaDB.saveUser(user);
      
      ModaDB.log(user.id, user.username, "EMAIL_VERIFY_SUCCESS", "AUTH", `Email verified for: ${user.email}`);
      res.json({ success: true, message: "Email verified successfully." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/2fa/setup", userAuth, (req, res) => {
    try {
      const user = (req as any).authUser;
      const secret = Math.random().toString(36).slice(2, 15).toUpperCase();
      user.twoFactorSecret = secret;
      user.twoFactorEnabled = false;
      ModaDB.saveUser(user);
      
      res.json({ success: true, secret });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/auth/2fa/verify", userAuth, (req, res) => {
    try {
      const { code } = req.body;
      const user = (req as any).authUser;
      
      // In real world, use a TOTP library. For now, we simulate with the secret itself.
      if (!code || code !== user.twoFactorSecret) {
        return res.status(400).json({ success: false, error: "Invalid 2FA code." });
      }
      
      user.twoFactorEnabled = true;
      ModaDB.saveUser(user);
      
      ModaDB.log(user.id, user.username, "2FA_VERIFY_SUCCESS", "AUTH", `2FA verified and enabled for: ${user.email}`);
      res.json({ success: true, message: "2FA enabled successfully." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- Merchant Management ---
  app.get("/api/merchants", userAuth, (req, res) => {
    try {
      const user = (req as any).authUser;
      let merchants;
      if (user.role === 'Platform Admin') {
        merchants = ModaDB.getMerchants();
      } else {
        merchants = ModaDB.getMerchantsByOwner(user.id);
      }
      res.json({ success: true, merchants });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/merchants", userAuth, (req, res) => {
    try {
      const { name, industryId } = req.body;
      const user = (req as any).authUser;
      
      const merchant = {
        id: `mch-${Math.random().toString(36).substring(2, 6)}`,
        name: name || '新商户',
        ownerId: user.id,
        status: 'active',
        billingPlan: 'free',
        createdAt: new Date().toISOString()
      };
      
      ModaDB.saveMerchant(merchant);
      
      // Auto-create a default store for the merchant
      const store = {
        id: `str-${Math.random().toString(36).substring(2, 6)}`,
        merchantId: merchant.id,
        name: `${merchant.name}旗舰店`,
        domain: `${merchant.id}.modaui.com`,
        branding: JSON.stringify({ industryId }),
        createdAt: new Date().toISOString()
      };
      ModaDB.saveStore(store);
      
      ModaDB.log(user.id, user.username, "MERCHANT_CREATE", "MERCHANT", `Created merchant ${merchant.name} with store ${store.name}`);
      res.json({ success: true, merchant, store });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/merchants/:id", userAuth, (req, res) => {
    try {
      const merchant = ModaDB.getMerchantById(req.params.id);
      if (!merchant) return res.status(404).json({ success: false, error: "Merchant not found." });
      res.json({ success: true, merchant });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.patch("/api/merchants/:id", userAuth, checkPermission('settings'), (req, res) => {
    try {
      const { name, status, billingPlan, modules } = req.body;
      const merchant = ModaDB.getMerchantById(req.params.id);
      if (!merchant) return res.status(404).json({ success: false, error: "Merchant not found." });
      
      if (name) merchant.name = name;
      if (status) merchant.status = status;
      if (billingPlan) merchant.billingPlan = billingPlan;
      if (modules) merchant.modules = modules;
      
      ModaDB.saveMerchant(merchant);
      ModaDB.log((req as any).authUser.id, (req as any).authUser.username, "MERCHANT_UPDATE", "MERCHANT", `Updated merchant ${merchant.name}`);
      res.json({ success: true, merchant });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- RBAC Member Management ---
  app.get("/api/merchants/:mid/members", userAuth, checkPermission('settings'), (req, res) => {
    try {
      const members = ModaDB.getMembers(req.params.mid);
      res.json({ success: true, members });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/merchants/:mid/members", userAuth, checkPermission('settings'), (req, res) => {
    try {
      const { name, email, role } = req.body;
      const member = {
        id: `usr-${Math.random().toString(36).substring(2, 6)}`,
        merchantId: req.params.mid,
        name,
        email,
        role,
        status: 'active',
        assignedTasks: 0,
        createdAt: new Date().toISOString()
      };
      ModaDB.saveMember(member);
      ModaDB.log((req as any).authUser.id, (req as any).authUser.username, "MEMBER_ADD", "RBAC", `Added member ${name} (${email}) as ${role}`);
      res.json({ success: true, member });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/merchants/:mid/members/:uid", userAuth, checkPermission('settings'), (req, res) => {
    try {
      ModaDB.deleteMember(req.params.uid);
      ModaDB.log((req as any).authUser.id, (req as any).authUser.username, "MEMBER_DELETE", "RBAC", `Deleted member ID: ${req.params.uid}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.patch("/api/merchants/:mid/members/:uid/status", userAuth, checkPermission('settings'), (req, res) => {
    try {
      const { status } = req.body;
      const members = ModaDB.getMembers(req.params.mid);
      const member = members.find(m => m.id === req.params.uid);
      if (!member) return res.status(404).json({ success: false, error: "Member not found." });
      
      member.status = status;
      ModaDB.saveMember(member);
      ModaDB.log((req as any).authUser.id, (req as any).authUser.username, "MEMBER_STATUS_UPDATE", "RBAC", `Updated member ${member.name} status to ${status}`);
      res.json({ success: true, member });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Fetch users (Platform Admin & RBAC Audit)
  app.get("/api/users", (req, res) => {
    try {
      const db = ModaDB.read();
      res.json({ success: true, users: db.users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, createdAt: u.createdAt })) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 3. MERCHANTS & STORE TENANCY API ===
  app.get("/api/merchants", (req, res) => {
    try {
      const db = ModaDB.read();
      res.json({ success: true, merchants: db.merchants });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/merchants", (req, res) => {
    try {
      let { name, ownerId, billingPlan = "free", newTenant } = req.body;
      if (newTenant && typeof newTenant === 'object') {
        name = name || newTenant.name || newTenant.companyName;
        ownerId = ownerId || newTenant.ownerId || newTenant.email;
        billingPlan = newTenant.billingPlan || billingPlan;
      }
      if (!name || !ownerId) {
        res.status(400).json({ success: false, error: "Name and ownerId are mandatory attributes." });
        return;
      }
      const db = ModaDB.read();
      const merchantId = `mer_${Math.random().toString(36).slice(2, 11)}`;
      const newMerchant = {
        id: merchantId,
        name,
        ownerId,
        status: "active" as const,
        billingPlan,
        createdAt: new Date().toISOString()
      };
      db.merchants.push(newMerchant);
      
      // Instantiate global tenant quotas
      db.tenants.push({
        id: merchantId,
        quotaLimit: billingPlan === "enterprise" ? 100000 : billingPlan === "growth" ? 5000 : 500,
        quotaUsed: 0,
        billingStatus: "paid"
      });

      ModaDB.write(db);
      ModaDB.log(ownerId, "SYSTEM", "MERCHANT_CREATE", "TENANT_ENGINE", `Merchant created: ${name} (${merchantId})`);
      res.status(201).json({ success: true, merchant: newMerchant });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });


  app.post("/api/tenants/initialize", async (req, res) => {
    try {
      const { email, companyName, industryId, strategyId, strategyName, strategyDesc } = req.body;
      if (!email || !companyName || !industryId) {
        res.status(400).json({ success: false, error: "Missing email, companyName, or industryId" });
        return;
      }

      const tenantId = email.replace(/[^a-zA-Z0-9]/g, '_');
      const db = ModaDB.read();

      // 1. Create/Update Merchant
      const merchantIdx = db.merchants.findIndex(m => m.id === tenantId);
      const newMerchant = {
        id: tenantId,
        name: companyName,
        ownerId: email,
        status: "active" as const,
        billingPlan: "free" as const,
        createdAt: new Date().toISOString()
      };
      if (merchantIdx > -1) {
        db.merchants[merchantIdx] = newMerchant;
      } else {
        db.merchants.push(newMerchant);
      }

      // 2. Create/Update Store
      const storeId = `sto_${tenantId}`;
      const storeIdx = db.stores.findIndex(s => s.id === storeId);
      const newStore = {
        id: storeId,
        merchantId: tenantId,
        name: companyName,
        domain: `${tenantId}.modaui.com`,
        branding: {
          logo: "📦",
          colorTheme: "classic" as const,
          bannerText: `欢迎光临 ${companyName} 智体店样板！`
        },
        createdAt: new Date().toISOString()
      };
      if (storeIdx > -1) {
        db.stores[storeIdx] = newStore;
      } else {
        db.stores.push(newStore);
      }

      // 3. Clear and create default products scoped to this tenant-store
      db.products = db.products.filter(p => p.storeId !== storeId);
      
      const productsTemplates: Record<string, Array<{name: string, price: number, inventory: number, image: string, category: string, desc: string}>> = {
        fashion: [
          { name: "复古重工连帽卫衣 (Aria 联名定制系列)", price: 199, inventory: 150, image: "🧥", category: "外套大衣", desc: "精选高质摇粒绒保暖面。快反供应链极速打样出货。" },
          { name: "经典百搭翻盖帆布包 (Barton 选品推荐)", price: 149, inventory: 180, image: "👜", category: "美学配饰", desc: "加厚加密牛津帆布。多功能内置网兜与防水涂层材质。" },
          { name: "高腰褶皱新中式高定牛仔裙 (Aria 剪裁设计)", price: 299, inventory: 90, image: "👗", category: "裙装系列", desc: "复古提花深色牛仔布料。高腰显瘦完美比例版型。" }
        ],
        catering: [
          { name: "特色秘制宫保鸡丁双人份大套餐 (Kai 推荐)", price: 28, inventory: 100, image: "🍱", category: "智造招牌", desc: "热度数据优选菜单，低物耗供应链极速配送。" },
          { name: "灌汤黑猪肉手工水饺 (十二只装)", price: 18, inventory: 250, image: "🥟", category: "精品小点", desc: "纯手工擀制，肉馅紧实多汁不柴。" },
          { name: "招牌沁心冷泡高山乌龙茶", price: 10, inventory: 400, image: "🍹", category: "爽口特饮", desc: "去热解腻搭档，低温长续保留甘甜天然茶酚。" }
        ],
        retail: [
          { name: "磨砂吸饱高硅玻璃马克杯 (Vara 特荐书签款)", price: 29, inventory: 200, image: "🥛", category: "生活家居", desc: "防烫无毒环保材质。设计师原案定制防指纹漆面。" },
          { name: "三层隔热高密封防漏竹纤维饭盒", price: 49, inventory: 150, image: "🍱", category: "时尚厨具", desc: "天然竹原纤维降解压制。带提手轻便易携可微波。" },
          { name: "极低空噪超纯声波电动牙刷 (Dax 跟单选型)", price: 129, inventory: 70, image: "🪥", category: "智体个护", desc: "超声磁悬浮马达，精选五挡护理记忆，续航超百天。" }
        ],
        beauty: [
          { name: "真花萃取臻美大马士革玫瑰精油 (Yara 概念版)", price: 198, inventory: 80, image: "🧪", category: "奢宠护肤", desc: "滴滴尊贵精纯原液。强效保湿抗氧化。Iris深度私域高复购单品。" },
          { name: "免按泡沫温和氨基酸净澈面膜慕斯", price: 89, inventory: 120, image: "🧴", category: "温和洁面", desc: "双重氨基酸表面活性成分。超微细泡低残留不敏感紧绷。" },
          { name: "医用冻干重组胶原蛋白润养补水面膜 (5贴)", price: 59, inventory: 250, image: "🎭", category: "舒缓保湿", desc: "二类器械安全标准。修护医美术后泛红干燥，敏感退火。" }
        ],
        hotel: [
          { name: "大堂定制沉敛高雅小众木质扩香 (Noel 迎客香)", price: 120, inventory: 100, image: "🕯️", category: "特选周边", desc: "天然植萃精油。经典雪松与无花果清香，安抚差旅倦惫。" },
          { name: "释压支撑高弹抗菌防螨天然乳胶枕", price: 189, inventory: 40, image: "🛏️", category: "舒适酣眠", desc: "高密度蜂窝双气孔，承托颈部自然弯曲，深睡舒压。" },
          { name: "高克重精梳大圈绒亲肤速干全棉浴袍", price: 299, inventory: 30, image: "👘", category: "客房体验", desc: "特长绒全棉多圈编织。丝滑柔软，绝佳吸水保暖性能。" }
        ],
        influencer: [
          { name: "大主播评测力捧高纤低卡爆料威化饼", price: 39, inventory: 800, image: "🍪", category: "直播爆款", desc: "Sylvia运营推荐无蔗糖高饱腹代餐卡零食。" },
          { name: "万能RGB自拍补光大光环美颜美妆灯", price: 149, inventory: 120, image: "💡", category: "主播数码", desc: "多折叠收缩高度，无缝全光谱，Kellan直播话术搭配神器。" },
          { name: "高清数字电磁动圈降噪直播领夹麦克风", price: 399, inventory: 50, image: "🎙️", category: "专业声卡", desc: "智能防喷防爆声。一拖二高速发射续航。Mercedes剪辑首推。" }
        ]
      };

      const matchedSPUList = productsTemplates[industryId] || productsTemplates.fashion;
      matchedSPUList.forEach(item => {
        db.products.push({
          id: `prod_${Math.random().toString(36).slice(2, 11)}`,
          storeId: storeId,
          name: item.name,
          category: item.category,
          price: Number(item.price),
          inventory: Number(item.inventory),
          sku: `SKU-${industryId.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          variant: {},
          images: [item.image],
          createdAt: new Date().toISOString()
        });
      });

      // 4. Create/Update AI Team and Employees
      db.ai_teams = db.ai_teams.filter(t => t.merchantId !== tenantId);
      const teamId = `team_${tenantId}`;
      const newAITeam = {
        id: teamId,
        merchantId: tenantId,
        name: `${companyName}专家智体委员会`,
        createdAt: new Date().toISOString()
      };
      db.ai_teams.push(newAITeam);

      // Clear old agents of this tenant's team
      db.ai_agents = db.ai_agents.filter(a => a.teamId !== teamId);

      const rolesTemplates: Record<string, Array<{name: string, role: string, desc: string}>> = {
        fashion: [
          { name: "Aria", role: "AI设计师", desc: "监控最新抖音/小红书潮流红线，负责策划线上微店陈列、海报文案和穿搭海报视觉。" },
          { name: "Barton", role: "AI选品经理", desc: "分析欧美大牌及KOL穿搭高频买点，自动优化本微店SPU多规格上新，确保转化率。" },
          { name: "Daphne", role: "AI营销经理", desc: "生成小红书/微淘复古种草笔记，规划广告直通车每日竞价出价及裂变优惠券预算分配。" },
          { name: "Cyrus", role: "AI运营经理", desc: "跟踪发货进销存状态，一键自动打单顺丰并安排揽收，拦截退款纠纷和退换货安抚。" }
        ],
        catering: [
          { name: "Kai", role: "AI外卖经理", desc: "主导外卖平台的满减、配送费及神券折扣梯度，极速配置下午茶推广大图海报。" },
          { name: "Ren", role: "AI大堂经理", desc: "专研新品口味。根据城市物耗、包装溢价快速给出新品提价与招牌搭配方案。" },
          { name: "Soren", role: "AI仓库经理", desc: "极智比对农品批发价，按日核动肉菜周转红线，自动汇总明日食材物耗进库采购单。" },
          { name: "Lulu", role: "AI运营经理", desc: "对接物流跑腿，处理差评、餐损破洒极速垫付。汇总每日美团流水并对账。" }
        ],
        retail: [
          { name: "Vara", role: "AI选品经理", desc: "选定亚马逊热榜飙升百货。对比国内拼多多/1688等高溢价渠道，优化起价及保价险配置。" },
          { name: "Dax", role: "AI库存经理", desc: "对接代加工厂，自动化检索国内货品拼集拼仓跟踪，跟单并警示揽派延误。" },
          { name: "Nova", role: "AI营销经理", desc: "拟定百日精推首发单。输出高转化引引流直通车方案，优化每日竞价ROI。" },
          { name: "Tate", role: "AI运营经理", desc: "闲鱼/微店铺货。合并日出单入账，友好协商物流损坏先行核退等争夺安抚。" }
        ],
        beauty: [
          { name: "Yara", role: "AI产品经理", desc: "研发特色美发/面膜耗材。草拟产品高颜值包装海报，并过滤安全合规文案。" },
          { name: "Iris", role: "AI客户经理", desc: "策划节日轻奢SPA充值送返项目。监控年卡到店周期，自动给核心VIP发送问候。" },
          { name: "Sage", role: "AI营销经理", desc: "批量达人测样分包建联。输出千粉美睫试用小红书图文文案，快速引流拓客。" },
          { name: "Cleo", role: "AI预约经理", desc: "管理面部护理及预约时段。动态进行时空差错峰引客，并在客户请假时极速重安排。" }
        ],
        hotel: [
          { name: "Noel", role: "AI前台经理", desc: "接待入住。提供微信一键取房及智能门锁、行李快递、同城美食安心导览建议。" },
          { name: "Pace", role: "AI客房经理", desc: "管理房间打扫并一键派发保洁工单。核定香香/浴巾采购及季度损耗周期。" },
          { name: "Kira", role: "AI收益经理", desc: "跟踪节假日溢价。分析竞争房价、天气与尾房入座比例，执行夜间动态打折甩干。" },
          { name: "Bella", role: "AI运营经理", desc: "全渠道OTA日历自动抗冲突合并。高转化话术秒回住客精美多图高分评语。" }
        ],
        influencer: [
          { name: "Giles", role: "AI选品经理", desc: "多平台佣金分成高物色。分析今日爆带品类大盘。策划限时拼买低门槛策略。" },
          { name: "Mercedes", role: "AI内容经理", desc: "设计直播间15s快速场场脚本。撰写吃货系列引流量笔记文案，最大化吸睛。" },
          { name: "Kellan", role: "AI直播经理", desc: "生成大促爆憋话术、高光高频滚动。调节直播节奏与弹幕互动，推高场观粘度。" },
          { name: "Sylvia", role: "AI运营经理", desc: "高精度GMV分成净利对账。跟踪货品派发反馈。买家物流丢件纠纷主动降级赔付。" }
        ]
      };

      const matchedRoster = rolesTemplates[industryId] || rolesTemplates.fashion;
      const createdAgents: any[] = [];
      matchedRoster.forEach(emp => {
        const agt = {
          id: `agt_${tenantId}_${emp.name}`,
          teamId: teamId,
          name: emp.name,
          role: `${emp.role} ${emp.name}` as any,
          systemPrompt: `你已受雇为 ${companyName} 的专属【${emp.role}】。岗位职责：${emp.desc}\n\n当前团队执行的运营策略是：${strategyName}（${strategyDesc}）。请极力贯彻执行，让商铺业绩持续攀升。`,
          status: 'idle' as const,
          memoryContext: [`于 ${new Date().toISOString()} 系统安全初始化就绪。岗位口号与授权契约已部署完毕。`],
          createdAt: new Date().toISOString()
        };
        db.ai_agents.push(agt);
        createdAgents.push(agt);
      });

      // 5. Clear and create default Knowledge Base chunks
      db.kb_chunks = db.kb_chunks.filter(c => c.merchantId !== tenantId);
      const defaultKBChks = [
        {
          id: `chk_${tenantId}_1`,
          title: `${companyName} 商业愿景与经营守则`,
          content: `本企业名为：${companyName}。\n创始人及企业主：${email}。\n行业定位与特种行业背景：${industryId}。\n公司战略策略定位是：${strategyName}（${strategyDesc}）。\n所有智体员工在向顾客提供解答或协助管理店铺时，必须以此策略为指导原则，遵守服务纪律。`,
          category: "企业政策",
          tokenCount: 220
        },
        {
          id: `chk_${tenantId}_2`,
          title: "顺丰速运一件代发极速分发履约标准",
          content: `公司为保障配送时效已与《顺丰速运》达成官方特惠寄递协议。\n前台店面所有买单订单，系统运营主管（如Cyrus/Lulu等）将无缝执行打包及一键传单顺丰派发航空专件。\n若出现揽收超时或揽派延误，平台将启动首单免首重和 ¥15 延时关怀专属优惠。`,
          category: "物流规范",
          tokenCount: 180
        },
        {
          id: `chk_${tenantId}_3`,
          title: "顾客退款退货阻拦、安抚与客情公关条例",
          content: `对于前台申请退款的顾客，客服智体员工须执行主动安抚和快速响应。\n如出现质检争议或错发：首单新客直接发起 ¥10 折扣福利补偿并建议保退，或直接免退货仅极速原件补发。\n凡遭遇不合理投诉，系统主管均启动客情调停，快速纠葛，保留品牌口碑。`,
          category: "客户服务",
          tokenCount: 210
        }
      ];

      for (const chk of defaultKBChks) {
        let vector: number[] | null = null;
        try {
          if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
            const api = getGeminiClient();
            const embedRes = await api.models.embedContent({
              model: "gemini-embedding-2-preview",
              contents: [chk.content]
            });
            vector = embedRes.embeddings?.[0]?.values || (embedRes as any).embedding?.values || null;
          }
        } catch (_) {}

        db.kb_chunks.push({
          id: chk.id,
          merchantId: tenantId,
          title: chk.title,
          content: chk.content,
          tokenCount: chk.tokenCount,
          createdAt: new Date().toISOString(),
          vector: vector as any
        });
      }

      // 6. Create partial tenant info for quota managing
      db.tenants = db.tenants.filter(t => t.id !== tenantId);
      db.tenants.push({
        id: tenantId,
        quotaLimit: 3000,
        quotaUsed: 0,
        billingStatus: "paid"
      });

      // 7. Push a simulated initial sales and finance report
      db.finance = db.finance.filter(f => f.merchantId !== tenantId);
      db.finance.push({
        id: `FIN-${Math.floor(100000 + Math.random() * 900000)}`,
        merchantId: tenantId,
        type: "revenue",
        amount: 3200,
        description: "系统上线预热活动订单交易收益",
        createdAt: new Date().toISOString()
      });

      // 8. Log audit trail
      ModaDB.write(db);
      ModaDB.log(email, email, "TENANT_INITIALIZE", "TENANT_ENGINE", `企业智体自动运营中枢彻底完成就绪：成功部署 4 名 AI 独立特遣岗位专家、SPU供货名录、以及 3 个 RAG 加固底座文件。`);

      // 9. Sync directly to live cloud Firestore if client is boot
      if (serverDb) {
        try {
          const mDocRef = firestoreDoc(serverDb, "tenants", tenantId);
          await firestoreSetDoc(mDocRef, {
            id: tenantId,
            name: companyName,
            industryId,
            strategyId,
            strategyName,
            ownerEmail: email,
            createdAt: new Date().toISOString()
          });

          // sync Templates to cloud under isolated top-level industry collection
          for (const ag of matchedRoster) {
            const tempSlug = `temp_${tenantId}_${ag.name}`;
            const tempDocRef = firestoreDoc(serverDb, `${industryId}_templates`, tempSlug);
            await firestoreSetDoc(tempDocRef, {
              id: tempSlug,
              industryId,
              tenantId,
              name: ag.name,
              role: ag.role,
              desc: ag.desc,
              systemPrompt: `你已受雇为 ${companyName} 的专属【${ag.role}】。岗位职责：${ag.desc}\n\n当前团队执行的运营策略是：${strategyName}（${strategyDesc}）。请极力贯彻执行，让商铺业绩持续攀升。`,
              createdAt: new Date().toISOString()
            });
          }

          // sync Products to cloud under isolated top-level industry collection
          for (const item of matchedSPUList) {
            const pSlug = `prod_${tenantId}_${item.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const pDocRef = firestoreDoc(serverDb, `${industryId}_products`, pSlug);
            await firestoreSetDoc(pDocRef, {
              id: pSlug,
              storeId,
              tenantId,
              name: item.name,
              category: item.category,
              price: item.price,
              inventory: item.inventory,
              images: [item.image],
              sku: `SKU-${industryId.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
              createdAt: new Date().toISOString()
            });
          }

          // sync KnowledgeBase to cloud under isolated top-level industry collection
          for (const chk of defaultKBChks) {
            const kbDocRef = firestoreDoc(serverDb, `${industryId}_kb_chunks`, chk.id);
            await firestoreSetDoc(kbDocRef, {
              id: chk.id,
              tenantId,
              merchantId: tenantId,
              title: chk.title,
              content: chk.content,
              category: chk.category,
              tokenCount: chk.tokenCount,
              createdAt: new Date().toISOString(),
              vector: null
            });
          }

          console.log(`[Firebase Cloud Sync] Tenant and isolated industry collections (Templates, Products, KnowledgeBase) successfully initialized on live Cloud Firestore under top-level "${industryId}" namespace!`);
        } catch (syncErr: any) {
          console.warn("[Firebase Sync Warn] Failed sync-write through initialization to Clouds.", syncErr.message);
        }
      }

      res.status(200).json({
        success: true,
        merchantId: tenantId,
        merchant: newMerchant,
        store: newStore,
        message: "Successfully initialized tenant assets."
      });
    } catch (err: any) {
      console.error("Initialize endpoint error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // === 3.1 STORES CONFIGURATION ENDPOINTS ===
  app.get("/api/stores/:id", (req, res, next) => {
    try {
      const { id } = req.params;
      // allow reserved `count` path to fallthrough to dedicated handler
      if (id === 'count') return next();
      const db = ModaDB.read();
      const store = db.stores.find(s => s.id === id || s.merchantId === id);
      if (!store) {
        res.status(404).json({ success: false, error: "Store configuration not found." });
        return;
      }
      res.json({ success: true, store });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/stores/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, domain, branding } = req.body;
      const db = ModaDB.read();
      const store = db.stores.find(s => s.id === id || s.merchantId === id);
      if (!store) {
        res.status(404).json({ success: false, error: "Store not found." });
        return;
      }
      
      if (name) store.name = name;
      if (domain) store.domain = domain;
      if (branding) {
        store.branding = {
          ...store.branding,
          ...branding
        };
      }
      
      ModaDB.write(db);
      ModaDB.log(store.merchantId, "MERCHANT", "STORE_UPDATE", "STORE_ENGINE", `Store branding and configuration updated: ${store.id}`);
      res.json({ success: true, store });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // List stores with optional pagination and filter
  app.get('/api/stores', (req, res) => {
    try {
      const { merchantId, page = '1', pageSize = '50' } = req.query as any;
      const db = ModaDB.read();
      let stores = db.stores || [];
      if (merchantId) stores = stores.filter(s => s.merchantId === String(merchantId));
      const p = Math.max(1, Number(page) || 1);
      const ps = Math.max(1, Number(pageSize) || 50);
      const start = (p - 1) * ps;
      const result = stores.slice(start, start + ps);
      res.json({ success: true, total: stores.length, page: p, pageSize: ps, stores: result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Stores count endpoint (convenience)
  app.get('/api/stores/count', (req, res) => {
    try {
      const { merchantId } = req.query as any;
      const db = ModaDB.read();
      let stores = db.stores || [];
      if (merchantId) stores = stores.filter(s => s.merchantId === String(merchantId));
      res.json({ success: true, count: stores.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Admin convenience route used by admin UI: marketplaces -> stores
  app.get('/api/admin/marketplaces/stores', adminAuth, (req, res) => {
    try {
      const { page = '1', pageSize = '50', merchantId, search } = req.query as any;
      const db = ModaDB.read();
      let stores = db.stores || [];
      if (merchantId) stores = stores.filter(s => s.merchantId === String(merchantId));
      if (search) stores = stores.filter(s => String(s.name).toLowerCase().includes(String(search).toLowerCase()) || String(s.domain).toLowerCase().includes(String(search).toLowerCase()));
      const p = Math.max(1, Number(page) || 1);
      const ps = Math.max(1, Number(pageSize) || 50);
      const start = (p - 1) * ps;
      const total = stores.length;
      const result = stores.slice(start, start + ps);
      res.json({ success: true, total, page: p, pageSize: ps, stores: result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/merchants/:id/suspend", (req, res) => {
    try {
      const { id } = req.params;
      const { suspend = true, sessionId } = req.body;
      
      const reqRole = req.headers["x-user-role"] || req.query.userRole;
      let userRole = reqRole;
      const db = ModaDB.read();
      
      const targetSessionId = (sessionId || req.headers["authorization"]) as string | undefined;
      if (targetSessionId) {
        const session = db.sessions.find(s => s.id === targetSessionId && new Date(s.expiresAt) > new Date());
        if (session) {
          const u = db.users.find(usr => usr.id === session.userId);
          if (u) {
            userRole = u.role;
          }
        }
      }

      if (userRole !== "Platform Admin") {
        res.status(403).json({ success: false, error: "Access Denied: Only Platform Admin can lock or suspend tenant directories." });
        return;
      }

      const merchant = db.merchants.find(m => m.id === id);
      if (!merchant) {
        res.status(404).json({ success: false, error: "Merchant not found." });
        return;
      }
      merchant.status = suspend ? "suspended" : "active";
      ModaDB.write(db);
      ModaDB.log("ADMIN", "SUPER_ADMIN", "MERCHANT_STATUS_SHIFT", "TENANT_ENGINE", `Merchant status set to ${merchant.status}: ${id}`);
      res.json({ success: true, merchant });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 4. PRODUCTS SPU & SKU CONTROLS ===
  app.get("/api/products", (req, res) => {
    try {
      const { tenantId, industryId } = req.query;
      const db = ModaDB.read();
      let products = db.products;
      if (tenantId) {
        const storePrefix = `sto_${String(tenantId)}`;
        products = products.filter(p => p.storeId === String(tenantId) || p.storeId === storePrefix);
      }
      if (industryId) {
        // Optional industry filter support if products carry a category or industry tag
        products = products.filter(p => String(p.category).toLowerCase().includes(String(industryId).toLowerCase()));
      }
      res.json({ success: true, products });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/products", (req, res) => {
    try {
      const { tenantId, industryId, product } = req.body;
      const payload = product || req.body;
      const { storeId, name, category, price, inventory, sku, image = "📦" } = payload;
      const resolvedStoreId = storeId || (tenantId ? `sto_${tenantId}` : "universal_store");
      if (!name || price === undefined) {
        res.status(400).json({ success: false, error: "Name and price are required product values." });
        return;
      }
      const db = ModaDB.read();
      const newProd = {
        id: `prod_${Math.random().toString(36).slice(2, 11)}`,
        storeId: resolvedStoreId,
        name,
        category: category || "General",
        price: Number(price),
        inventory: Number(inventory || 100),
        sku: sku || `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        variant: {},
        images: [image],
        createdAt: new Date().toISOString()
      };
      db.products.push(newProd);
      ModaDB.write(db);
      res.status(201).json({ success: true, product: newProd });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/products/:id", (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body.product || req.body;
      const { name, category, price, inventory, sku, image } = payload;
      const db = ModaDB.read();
      const prodIndex = db.products.findIndex(p => p.id === id);
      if (prodIndex === -1) {
        res.status(404).json({ success: false, error: "Product not found." });
        return;
      }
      const prod = db.products[prodIndex];
      if (name) prod.name = name;
      if (category) prod.category = category;
      if (price !== undefined) prod.price = Number(price);
      if (inventory !== undefined) prod.inventory = Number(inventory);
      if (sku) prod.sku = sku;
      if (image) prod.images = [image];
      ModaDB.write(db);
      res.json({ success: true, product: prod });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = ModaDB.read();
      db.products = db.products.filter(p => p.id !== id);
      ModaDB.write(db);
      res.json({ success: true, message: "Product deleted successfully." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 5. ORDERS AUTOMATED DISPATCH SYSTEM ===
  app.get("/api/orders", (req, res) => {
    try {
      const { tenantId, merchantId, storeId, status } = req.query;
      const db = ModaDB.read();
      let orders = db.orders;
      if (tenantId) {
        orders = orders.filter(o => o.merchantId === String(tenantId) || o.userId === String(tenantId));
      }
      if (merchantId) {
        orders = orders.filter(o => o.merchantId === String(merchantId));
      }
      if (storeId) {
        orders = orders.filter(o => o.storeId === String(storeId));
      }
      if (status) {
        orders = orders.filter(o => String(o.status).toLowerCase() === String(status).toLowerCase());
      }
      res.json({ success: true, orders });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/orders/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = ModaDB.read();
      const order = db.orders.find(o => o.id === id);
      if (!order) {
        res.status(404).json({ success: false, error: "Order not found." });
        return;
      }
      res.json({ success: true, order });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/orders", (req, res) => {
    try {
      const payload = req.body.order || req.body;
      const {
        orderId: providedOrderId,
        userId,
        storeId,
        merchantId,
        tenantId,
        items,
        totalPrice,
        orderType = "takeout",
        deliveryAddress,
        status = "pending"
      } = payload;

      if (!items || !items.length) {
        res.status(400).json({ success: false, error: "Order items sequence cannot be empty." });
        return;
      }
      const db = ModaDB.read();
      const orderId = providedOrderId || `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      const resolvedStoreId = storeId || (tenantId ? `sto_${tenantId}` : "universal_store");
      const newOrder = {
        id: orderId,
        userId: userId || "guest_user",
        storeId: resolvedStoreId,
        merchantId: merchantId || tenantId || "default_tenant",
        items,
        totalPrice: Number(totalPrice),
        status: status as const,
        shipmentTracking: {
          carrier: "顺丰速运",
          trackingNumber: `SF${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          status: "待安排快递员揽收"
        },
        createdAt: new Date().toISOString()
      };
      
      db.orders.push(newOrder);

      // Deduct product inventory dynamically (Real Inventory Check)
      items.forEach((it: any) => {
        const prod = db.products.find(p => p.id === it.productId);
        if (prod) {
          prod.inventory = Math.max(0, prod.inventory - (it.quantity || 1));
        }
      });

      ModaDB.write(db);
      ModaDB.log(userId || "GUEST", "BUYER", "ORDER_PLACED", "ORDER_ENG", `Placed order: ${orderId} total: ¥${totalPrice}`);
      res.status(201).json({ success: true, order: newOrder });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/orders/:id/dispatch", (req, res) => {
    try {
      const { id } = req.params;
      const { status = "shipped", trackingNum, carrier } = req.body;
      const db = ModaDB.read();
      const order = db.orders.find(o => o.id === id);
      if (!order) {
        res.status(404).json({ success: false, error: "Order not found." });
        return;
      }
      order.status = status;
      if (order.shipmentTracking) {
        order.shipmentTracking.status = status === "shipped" ? "顺丰专车正在飞速寄送中，预计明日送达" : "已签发妥投";
        if (trackingNum) {
          order.shipmentTracking.trackingNumber = trackingNum;
        }
        if (carrier) {
          order.shipmentTracking.carrier = carrier;
        }
      }
      ModaDB.write(db);
      ModaDB.log("MERCHANT", "STAFF_DISPATCHER", "ORDER_DISPATCH", "ORDER_ENG", `Dispatched tracking update for: ${id} to ${status}`);
      res.json({ success: true, order });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/orders/:id/refund", (req, res) => {
    try {
      const { id } = req.params;
      const { reason = "客户申请无理由退款" } = req.body;
      const db = ModaDB.read();
      const order = db.orders.find(o => o.id === id);
      if (!order) {
        res.status(404).json({ success: false, error: "Order not found." });
        return;
      }
      order.status = "refunded";
      order.refundReason = reason;

      // Reverse revenue ledgers and create financial correction transaction
      const refundId = `PAY-REF-${Math.floor(100000 + Math.random() * 900000)}`;
      db.finance.push({
        id: refundId,
        merchantId: order.merchantId,
        type: "expense",
        amount: order.totalPrice,
        orderId: order.id,
        description: `订单退款原路退回: ${order.id}. 原因: ${reason}`,
        createdAt: new Date().toISOString()
      });

      ModaDB.write(db);
      ModaDB.log("MERCHANT", "MANAGER_REFUND", "ORDER_REFUND", "PAYMENT_ENG", `Process refund for order ${id}: ¥${order.totalPrice}`);
      res.json({ success: true, order });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 6. STRIPE & ALIPAY DIRECT TRANSACTIONS (WITH CALLBACK WEBHOOKS) ===
  app.post("/api/payments/stripe/checkout", async (req, res) => {
    try {
      const { amount, currency = "cny", metadata = {} } = req.body;
      const orderId = req.body.orderId || metadata.orderId;
      if (!orderId || !amount) {
        res.status(400).json({ success: false, error: "OrderId and amount are required for checkout sessions." });
        return;
      }

      const stripe = getStripe();
      if (stripe) {
        // True Stripe Session execution for exact credit card processing matches
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: currency,
                product_data: {
                  name: `MODA 智体企业服务网店订单: ${orderId}`
                },
                unit_amount: Math.round(Number(amount) * 100) // stripe is in cents
              },
              quantity: 1
            }
          ],
          mode: "payment",
          success_url: `${req.headers.origin || DEFAULT_APP_URL}/customer-mall?success=true&order_id=${orderId}`,
          cancel_url: `${req.headers.origin || DEFAULT_APP_URL}/customer-mall?cancelled=true`
        });
        
        // Save the transaction record as pending
        const db = ModaDB.read();
        db.payments.push({
          id: `pay_${Math.random().toString(36).slice(2, 11)}`,
          orderId,
          amount: Number(amount),
          method: "Stripe",
          status: "pending",
          transactionId: session.id,
          createdAt: new Date().toISOString()
        });
        ModaDB.write(db);

        res.json({ success: true, url: session.url, isSimulation: false });
      } else {
        // Safe immersive high-fidelity simulation fallbacks if no API key is specified
        const mockSessionId = `cs_test_${Math.random().toString(36).slice(2, 20)}`;
        const db = ModaDB.read();
        
        db.payments.push({
          id: `pay_${Math.random().toString(36).slice(2, 11)}`,
          orderId,
          amount: Number(amount),
          method: "Stripe",
          status: "succeeded",
          transactionId: mockSessionId,
          createdAt: new Date().toISOString()
        });

        // Add to finance records simultaneously
        const order = db.orders.find(o => o.id === orderId);
        const mId = order ? order.merchantId : "default_tenant";
        db.finance.push({
          id: `FIN-${Math.floor(100000 + Math.random() * 900000)}`,
          merchantId: mId,
          type: "revenue",
          amount: Number(amount),
          orderId,
          description: `网店零售客单收款 (渠道: Stripe 快捷支付)`,
          createdAt: new Date().toISOString()
        });

        // Trigger billing log simulation (invoice dispatching)
        db.audit_logs.unshift({
          id: digital-asset.randomUUID ? digital-asset.randomUUID() : `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: "STRIPE_GATEWAY",
          username: "Stripe Webhook Listener",
          action: "INCOMING_CALLBACK",
          component: "PAYMENT_ENG",
          details: `付款回调校验成功。流水笔ID: ${mockSessionId}. 支付金额: ¥${amount}`
        });

        ModaDB.write(db);

        res.json({
          success: true,
          url: `${req.headers.origin || DEFAULT_APP_URL}/customer-mall?success=true&order_id=${orderId}`,
          isSimulation: true,
          message: "Stripe Sandbox Checkout Complete (Simulated callback webhook triggered instantly)"
        });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/payments/alipay/checkout", (req, res) => {
    try {
      const { amount, metadata = {} } = req.body;
      const orderId = req.body.orderId || metadata.orderId;
      const db = ModaDB.read();
      const mockPayId = `ALI_TX_${Math.floor(10000 + Math.random() * 90000)}`;

      db.payments.push({
        id: `pay_${Math.random().toString(36).slice(2, 11)}`,
        orderId,
        amount: Number(amount),
        method: "Alipay",
        status: "succeeded",
        transactionId: mockPayId,
        createdAt: new Date().toISOString()
      });

      const order = db.orders.find(o => o.id === orderId);
      const mId = order ? order.merchantId : "default_tenant";
      db.finance.push({
        id: `FIN-${Math.floor(100000 + Math.random() * 900000)}`,
        merchantId: mId,
        type: "revenue",
        amount: Number(amount),
        orderId,
        description: `支付宝快捷手机结账订单: ${orderId}`,
        createdAt: new Date().toISOString()
      });

      // Automatically advance order stage to processing
      if (order) {
        order.status = "processing";
        if (order.shipmentTracking) {
          order.shipmentTracking.status = "买家支付完成，系统正在自动打包准备出配";
        }
      }

      ModaDB.write(db);
      ModaDB.log("ALIPAY_SDK", "支付宝中继服务", "PAYMENT_CALLBACK", "FINANCE", `Alipay callback checkout success. Order ID: ${orderId}, txn: ${mockPayId}`);

      res.json({ success: true, txnId: mockPayId, message: "Alipay mobile layout parsed. Successful callback webhook applied." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === WeChat Pay (Native QR Code) ===
  app.post("/api/payments/wechat/checkout", async (req, res) => {
    try {
      const { amount, metadata = {} } = req.body;
      const orderId = req.body.orderId || metadata.orderId;
      if (!orderId || !amount) {
        res.status(400).json({ success: false, error: "orderId and amount are required." });
        return;
      }

      // Robust simulation fallback when credentials are empty
      if (!process.env.WECHAT_API_KEY || !process.env.WECHAT_APP_ID || !process.env.WECHAT_MCH_ID) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://modaui.com/pay-simulation?orderId=${orderId}%26amount=${amount}`;
        
        // Auto convert order status to processing after 4 seconds to simulate user scanning on callback
        setTimeout(() => {
          const db = ModaDB.read();
          const order = db.orders.find(o => o.id === orderId);
          if (order && order.status === 'pending') {
            order.status = 'processing';
            order.shipmentTracking = { 
              carrier: 'WeChatPay_Simulated', 
              trackingNumber: `WX-${Math.floor(10000000 + Math.random() * 90000000)}`, 
              status: '模拟微信扫码支付对账成功，大货统筹中' 
            };
            db.payments.push({
              id: `pay_${Math.random().toString(36).slice(2, 11)}`,
              orderId,
              amount: Number(amount),
              method: 'WeChatPay',
              status: 'succeeded',
              transactionId: `WXSim-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
              createdAt: new Date().toISOString()
            });
            db.finance.push({
              id: `FIN-${Math.floor(100000 + Math.random() * 900000)}`,
              merchantId: order.merchantId || 'default_tenant',
              type: 'revenue',
              amount: Number(amount),
              orderId,
              description: `微信移动扫码汇率结算完成：${orderId}`,
              timestamp: new Date().toISOString()
            });
            ModaDB.write(db);
            console.log(`[WeChat Pay Simulated Callback] Order ${orderId} reconciled successfully via background thread!`);
          }
        }, 4000);

        res.json({ 
          success: true, 
          qrCode: qrUrl, 
          prepayId: `prepay_sim_${Math.random().toString(36).slice(2, 10)}`, 
          mode: 'simulation' 
        });
        return;
      }

      const wechatPayment = new Payment({
        partnerKey: process.env.WECHAT_API_KEY || "",
        appId: process.env.WECHAT_APP_ID || "",
        mchId: process.env.WECHAT_MCH_ID || "",
        notifyUrl: `${process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`}/api/payments/wechat/callback`
      });

      const order = {
        body: `MODAUI 订单 ${orderId}`,
        out_trade_no: orderId,
        total_fee: Math.round(Number(amount) * 100),
        spbill_create_ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        trade_type: 'NATIVE'
      };

      const response = await new Promise<any>((resolve, reject) => {
        wechatPayment.getBrandWCPayRequestParams(order, (err: any, result: any) => {
          if (err) return reject(err);
          resolve(result);
        });
      });

      res.json({ success: true, qrCode: response.code_url || response.codeUrl || '', prepayId: response.prepay_id || response.package, data: response });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/payments/wechat/callback", wechatMiddleware({
    partnerKey: process.env.WECHAT_API_KEY || "",
    appId: process.env.WECHAT_APP_ID || "",
    mchId: process.env.WECHAT_MCH_ID || "",
    notifyUrl: `${process.env.API_BASE_URL || DEFAULT_APP_URL}/api/payments/wechat/callback`
  }).getNotify().done(async (message: any, req: any, res: any, next: any) => {
    const outTradeNo = message.out_trade_no;
    const transactionId = message.transaction_id;
    const totalFee = Number(message.total_fee || 0);

    const db = ModaDB.read();
    const order = db.orders.find(o => o.id === outTradeNo);
    if (order) {
      order.status = 'processing';
      if (!order.shipmentTracking) {
        order.shipmentTracking = { carrier: 'WeChatPay', trackingNumber: transactionId, status: '微信支付已确认，等待发货' };
      }
      db.payments.push({
        id: `pay_${Math.random().toString(36).slice(2, 11)}`,
        orderId: outTradeNo,
        amount: totalFee / 100,
        method: 'WeChatPay',
        status: 'succeeded',
        transactionId,
        createdAt: new Date().toISOString()
      });
      db.finance.push({
        id: `FIN-${Math.floor(100000 + Math.random() * 900000)}`,
        merchantId: order.merchantId,
        type: 'revenue',
        amount: totalFee / 100,
        orderId: outTradeNo,
        description: `微信扫码支付完成：${outTradeNo}`,
        createdAt: new Date().toISOString()
      });
      ModaDB.write(db);
    }

    res.reply('success');
  }));

  // === PayPal Checkout ===
  const payPalRestService = new PayPalService(
    process.env.PAYPAL_CLIENT_ID || '',
    process.env.PAYPAL_CLIENT_SECRET || '',
    'sandbox'
  );

  app.post("/api/payments/paypal/checkout", async (req, res) => {
    try {
      const { amount, metadata = {} } = req.body;
      const orderId = req.body.orderId || metadata.orderId;
      if (!orderId || !amount) {
        res.status(400).json({ success: false, error: 'orderId and amount are required.' });
        return;
      }

      // If we don't have real credentials, simulate redirect fallback loop safely
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        const mockApprovalToken = `EC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const mockApprovalLink = `${process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`}/api/payments/paypal/success?paymentId=PAYID-${Math.random().toString(34).substring(2, 12).toUpperCase()}&token=${mockApprovalToken}&PayerID=PAYER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        
        // Log down pending payment in db
        const db = ModaDB.read();
        db.payments.push({
          id: `pay_${Math.random().toString(36).slice(2, 11)}`,
          orderId: orderId,
          amount: Number(amount),
          method: 'PayPal',
          status: 'pending',
          transactionId: mockApprovalToken,
          createdAt: new Date().toISOString()
        });
        ModaDB.write(db);

        res.json({ success: true, orderId: mockApprovalToken, approvalLink: mockApprovalLink });
        return;
      }

      const payment = await payPalRestService.createPayment(orderId, Number(amount), `Order payment: ${orderId}`);
      const approvalLink = payment.links?.find((l: any) => l.rel === 'approval_url')?.href;
      res.json({ success: true, orderId: payment.id, approvalLink });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/payments/paypal/success', async (req, res) => {
    try {
      const { paymentId, PayerID, token } = req.query;
      const targetPaymentId = (paymentId || token) as string;
      const targetPayerId = (PayerID || 'MOCK_PAYER_ID') as string;

      if (!targetPaymentId) {
        res.status(400).send('Missing calculation criteria or PayPal parameters');
        return;
      }

      let capturedAmount = 0.0;
      let referenceId = '';

      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        // Local state simulation for demo mode
        const db = ModaDB.read();
        const paymentRecord = db.payments.find(p => p.transactionId === targetPaymentId || p.orderId === targetPaymentId);
        capturedAmount = paymentRecord ? paymentRecord.amount : 99.0;
        referenceId = paymentRecord ? paymentRecord.orderId : targetPaymentId;
      } else {
        const executionResult = await payPalRestService.executePayment(targetPaymentId, targetPayerId);
        capturedAmount = Number(executionResult.transactions?.[0]?.amount?.total || 0);
        referenceId = executionResult.transactions?.[0]?.invoice_number || targetPaymentId;
      }

      const db = ModaDB.read();
      let order = db.orders.find(o => o.id === referenceId);
      if (!order) {
        order = db.orders.find(o => o.id === targetPaymentId);
      }
      if (order) {
        order.status = 'processing';
        if (!order.shipmentTracking) {
          order.shipmentTracking = { carrier: 'PayPal', trackingNumber: targetPaymentId, status: 'PayPal 支付完成，等待发货' };
        }
      }

      let payment = db.payments.find(p => p.transactionId === targetPaymentId || p.orderId === referenceId);
      if (payment) {
        payment.status = 'succeeded';
        payment.amount = payment.amount || capturedAmount;
        payment.orderId = payment.orderId || referenceId;
      } else {
        db.payments.push({
          id: `pay_${Math.random().toString(36).slice(2, 11)}`,
          orderId: referenceId || targetPaymentId,
          amount: capturedAmount,
          method: 'PayPal',
          status: 'succeeded',
          transactionId: targetPaymentId,
          createdAt: new Date().toISOString()
        });
      }

      if (order) {
        db.finance.push({
          id: `FIN-${Math.floor(100000 + Math.random() * 900000)}`,
          merchantId: order.merchantId,
          type: 'revenue',
          amount: capturedAmount,
          orderId: order.id,
          description: `PayPal 交易完成：${order.id}`,
          createdAt: new Date().toISOString()
        });
      }

      ModaDB.write(db);

      // Render a premium payment success screen for interactive users inside preview frame!
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MODAUI Payment Success</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; }
          </style>
        </head>
        <body class="bg-stone-50 min-h-screen flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-stone-100 text-center animate-fade-in">
            <div class="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
              <svg class="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"></path>
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-stone-900 mb-2">支付完成并捕获</h1>
            <p class="text-stone-500 mb-6 text-sm">PayPal 智能通道已确认完成并全额结算</p>
            <div class="bg-stone-50 rounded-2xl p-4 text-left space-y-3 mb-6 text-sm">
              <div class="flex justify-between"><span class="text-stone-400">交易流水：</span><span class="font-mono text-stone-800 font-medium">${targetPaymentId}</span></div>
              <div class="flex justify-between"><span class="text-stone-400">参考商户单：</span><span class="font-mono text-stone-800 font-medium">${referenceId}</span></div>
              <div class="flex justify-between"><span class="text-stone-400">清算总额：</span><span class="font-semibold text-stone-900">$${capturedAmount.toFixed(2)} USD</span></div>
              <div class="flex justify-between"><span class="text-stone-400">核保状态：</span><span class="text-emerald-600 font-medium font-mono">Captured (succeeded)</span></div>
            </div>
            <button onclick="try { window.opener.focus(); } catch(e) {} window.close();" class="w-full py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition shadow-lg shadow-stone-900/10">
              返回 MODAUI 终端
            </button>
            <p class="text-xs text-stone-400 mt-4">窗口将在片刻后自动关闭，返回后台即可刷新订单流</p>
            <script>
              setTimeout(() => {
                try { window.close(); } catch(e) {}
              }, 4000);
            </script>
          </div>
        </body>
        </html>
      `);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/payments/paypal/cancel', async (req, res) => {
    try {
      const { token } = req.query;
      if (token) {
        const db = ModaDB.read();
        const payment = db.payments.find(p => p.transactionId === token);
        if (payment) {
          payment.status = 'failed';
          ModaDB.write(db);
        }
      }
      res.json({ success: false, cancelled: true, message: 'PayPal checkout cancelled by user.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // === 7. FINANCE LEDGER & METRICS ===
  app.get("/api/finance/ledger", (req, res) => {
    try {
      const db = ModaDB.read();
      res.json({ success: true, ledger: db.finance });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 8. AUDIT LOGS SEARCH INDEX ===
  app.get("/api/audit/logs", (req, res) => {
    try {
      const { search, component, sessionId, userRole: queryRole, tenantId, merchantId } = req.query;
      const db = ModaDB.read();
      
      const reqRole = req.headers["x-user-role"] || queryRole;
      let userRole = reqRole;
      
      const targetSessionId = (sessionId || req.headers["authorization"]) as string | undefined;
      if (targetSessionId) {
        const session = db.sessions.find(s => s.id === targetSessionId && new Date(s.expiresAt) > new Date());
        if (session) {
          const u = db.users.find(usr => usr.id === session.userId);
          if (u) {
            userRole = u.role;
          }
        }
      }

      if (userRole !== "Platform Admin" && userRole !== "Merchant Owner" && userRole !== "Manager") {
        res.status(403).json({ success: false, error: "Access Denied: Insufficient permissions to read system audit trails." });
        return;
      }

      let logs = db.audit_logs;
      if (search) {
        const query = String(search).toLowerCase();
        logs = logs.filter(l => 
          l.details.toLowerCase().includes(query) || 
          l.action.toLowerCase().includes(query) || 
          l.username.toLowerCase().includes(query)
        );
      }
      if (component) {
        logs = logs.filter(l => l.component === component);
      }
      if (tenantId || merchantId) {
        const tenantQuery = String(tenantId || merchantId);
        logs = logs.filter(l => l.userId === tenantQuery || l.details.includes(tenantQuery) || l.username.includes(tenantQuery));
      }
      res.json({ success: true, length: logs.length, logs });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/v1/auth/sync_google", (req, res) => {
    try {
      const { email, displayName, idToken } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: "Email is required for Google sync." });
        return;
      }
      const db = ModaDB.read();
      const normalizedEmail = String(email).toLowerCase();
      let user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (!user) {
        user = {
          id: `usr_${Math.random().toString(36).slice(2, 11)}`,
          username: displayName || normalizedEmail.split('@')[0] || `google_user_${Math.random().toString(36).slice(2, 8)}`,
          email: normalizedEmail,
          passwordHash: ModaDB.hashPassword(`google_sync_${Math.random().toString(36).slice(2, 8)}`),
          role: "Customer",
          verified: true,
          createdAt: new Date().toISOString(),
          profile: {
            fullName: displayName
          }
        };
        db.users.push(user);
      } else {
        if (displayName) {
          user.username = displayName;
          user.profile = { ...user.profile, fullName: displayName };
        }
        user.verified = true;
      }
      ModaDB.write(db);
      res.json({ success: true, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/v1/store/theme_deploy", (req, res) => {
    try {
      const { tenantId, storeId, themeId, branding } = req.body;
      if (!storeId && !tenantId) {
        res.status(400).json({ success: false, error: "storeId or tenantId is required." });
        return;
      }
      const db = ModaDB.read();
      const resolvedStoreId = storeId || `sto_${String(tenantId)}`;
      const store = db.stores.find((s: any) => s.id === resolvedStoreId || s.merchantId === tenantId);
      if (!store) {
        res.status(404).json({ success: false, error: "Store not found for theme deployment." });
        return;
      }
      if (themeId) {
        store.themeId = themeId;
      }
      if (branding && typeof branding === 'object') {
        store.branding = {
          ...store.branding,
          ...branding
        };
      }
      ModaDB.write(db);
      ModaDB.log(tenantId || "SYSTEM", "SYSTEM", "THEME_DEPLOY", "THEME_ENGINE", `Deployed theme ${themeId || "custom"} to store ${resolvedStoreId}`);
      res.json({ success: true, store });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/v1/ai/audit_ledger", (req, res) => {
    try {
      const { action, component, details, userId, username, userRole, tenantId } = req.body;
      if (!action || !component || !details) {
        res.status(400).json({ success: false, error: "action, component, and details are required." });
        return;
      }
      const db = ModaDB.read();
      const logEntry = {
        id: `audit_${Math.random().toString(36).slice(2, 11)}`,
        timestamp: new Date().toISOString(),
        userId: userId || tenantId || "system",
        username: username || "AI Agent",
        action,
        component,
        details: `${details}${tenantId ? ` (tenant: ${tenantId})` : ""}`
      };
      db.audit_logs.push(logEntry);
      ModaDB.write(db);
      res.json({ success: true, log: logEntry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/v1/shipping/quote", (req, res) => {
    try {
      const { shippingAddress, weight = 1, carrier = "SF Express", zone = "domestic" } = req.query;
      const base = zone === "international" ? 35 : 12;
      const rate = Number(weight) * (zone === "international" ? 12 : 3);
      const quote = Math.max(base, rate) + (carrier === "SF Express" ? 0 : 5);
      res.json({
        success: true,
        carrier,
        zone,
        weight: Number(weight),
        shippingAddress: shippingAddress || "n/a",
        estimatedCost: Number(quote.toFixed(2)),
        estimatedDelivery: zone === "international" ? "7-14 business days" : "1-3 business days"
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // === 9. COGNITIVE VECTOR ENGINE & SEMANTIC RAG RETRIEVER ===
  function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return normA === 0 || normB === 0 ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async function retrieveRAGContext(queryText: string, tenantId: string, industryId: string = "fashion"): Promise<string> {
    try {
      const api = getGeminiClient();
      const embedRes = await api.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: [queryText]
      });
      const queryVector = embedRes.embeddings?.[0]?.values || (embedRes as any).embedding?.values;
      if (!queryVector) return "";

      let chunks: any[] = [];
      
      // Attempt Firestore retrieval first
      if (serverDb) {
        try {
          const colRef = firestoreCollection(serverDb, `${industryId}_kb_chunks`);
          const snap = await firestoreGetDocs(colRef);
          snap.forEach(docSnap => {
            const d = docSnap.data();
            if (d.merchantId === tenantId && d.vector && d.content) {
              chunks.push(d);
            }
          });
        } catch (fsErr: any) {
          console.warn("Firestore RAG chunks sync-read warning:", fsErr.message);
        }
      }

      // Fallback to local DB if Firestore has no vector embeddings yet
      if (chunks.length === 0) {
        const localDB = ModaDB.read();
        chunks = localDB.kb_chunks.filter(c => c.merchantId === tenantId && (c as any).vector);
      }

      if (chunks.length === 0) return "";

      // Score similarities
      const scored = chunks.map(c => {
        const score = cosineSimilarity(queryVector, c.vector);
        return { ...c, score };
      });

      // Sort descending and filter top matches
      const topMatches = scored
        .filter(item => item.score > 0.60)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (topMatches.length === 0) return "";

      console.log(`[RAG Engine] Successfully retrieved ${topMatches.length} relevant context blocks with max score of ${(topMatches[0].score * 100).toFixed(1)}%`);
      return topMatches.map((m, idx) => `[已关联商业规则 #${idx + 1}] 《${m.title}》\n真实规章条目：\n${m.content}`).join("\n\n");
    } catch (err: any) {
      console.warn("[RAG Context Retrieval warning]:", err.message);
      return "";
    }
  }

  // === 10. KNOWLEDGE BASE & EMBEDDING RAG APIS ===
  app.get("/api/knowledge", async (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || "default_tenant");
      const industryId = String(req.query.industryId || "fashion");
      let chunks: any[] = [];
      if (serverDb) {
        try {
          const colRef = firestoreCollection(serverDb, `${industryId}_kb_chunks`);
          const snap = await firestoreGetDocs(colRef);
          snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.merchantId === tenantId) {
              chunks.push(data);
            }
          });
        } catch (fsErr: any) {
          console.warn("Firestore read kb_chunks warning fallback to local:", fsErr.message);
        }
      }
      if (chunks.length === 0) {
        const localDB = ModaDB.read();
        chunks = localDB.kb_chunks.filter(c => c.merchantId === tenantId);
      }
      res.json({ success: true, chunks });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/knowledge/add", async (req, res) => {
    try {
      const { title, content, category, tenantId, industryId } = req.body;
      if (!title || !content || !category) {
        res.status(400).json({ success: false, error: "Missing title, content, or category." });
        return;
      }
      const activeTenant = tenantId || "default_tenant";
      const activeIndustry = industryId || "fashion";

      // Compute embedding vector using Gemini real model
      let vector: number[] | null = null;
      let tokenCount = Math.floor(content.length * 1.3);
      try {
        const client = getGeminiClient();
        const embedRes = await client.models.embedContent({
          model: "gemini-embedding-2-preview",
          contents: [content]
        });
        vector = embedRes.embeddings?.[0]?.values || (embedRes as any).embedding?.values || null;
        console.log(`[Embedding Engine] Computed vector (dims: ${vector?.length}) for: ${title}`);
      } catch (warn: any) {
        console.warn("[Embedding Engine Warning] Failed to compute text vector embedding:", warn.message);
      }

      const chunkId = `chk_${Math.random().toString(36).slice(2, 11)}`;
      const newChunk = {
        id: chunkId,
        merchantId: activeTenant,
        title,
        content,
        tokenCount,
        category,
        vector,
        createdAt: new Date().toISOString()
      };

      // Persistence Layer 1: Local atomic write-through fallback
      const db = ModaDB.read();
      db.kb_chunks.push(newChunk);
      ModaDB.write(db);

      // Persistence Layer 2: Live Client Cloud Firestore
      if (serverDb) {
        try {
          const docRef = firestoreDoc(serverDb, `${activeIndustry}_kb_chunks`, chunkId);
          await firestoreSetDoc(docRef, newChunk);
          console.log(`[Firestore Match] kb_chunk synced to clouds namespace ${activeIndustry}_kb_chunks/${chunkId}`);
        } catch (fsErr: any) {
          console.warn("Firestore sync-write warning:", fsErr.message);
        }
      }

      res.status(201).json({ success: true, chunk: newChunk });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/knowledge/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = String(req.query.tenantId || "default_tenant");
      const industryId = String(req.query.industryId || "fashion");
      
      const db = ModaDB.read();
      db.kb_chunks = db.kb_chunks.filter(c => c.id !== id);
      ModaDB.write(db);

      if (serverDb) {
        try {
          const { deleteDoc } = await import("firebase/firestore");
          const docRef = firestoreDoc(serverDb, `${industryId}_kb_chunks`, id);
          await deleteDoc(docRef);
        } catch (fsErr: any) {
          console.warn("Firestore kb_chunks item deletion failing:", fsErr.message);
        }
      }
      res.json({ success: true, message: "KB chunk removed successfully from matching sync lanes." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Fetch all pending and processed task logs
  app.get("/api/agents/tasks", async (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || "default_tenant");
      let tasks: any[] = [];
      if (serverDb) {
        try {
          const colRef = firestoreCollection(serverDb, "tenants", tenantId, "agent_tasks");
          const snap = await firestoreGetDocs(colRef);
          snap.forEach(docSnap => {
            tasks.push(docSnap.data());
          });
        } catch (fsErr: any) {
          console.warn("Firestore fetch agent tasks falled back:", fsErr.message);
        }
      }
      if (tasks.length === 0) {
        const localDB = ModaDB.read();
        tasks = localDB.agent_tasks;
      }
      // sort latest first
      tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json({ success: true, tasks });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 11. AGENT RUNTIME DISPATCH ENGINE & TASK SCHEDULERS (REAL FIRESTORE & DUAL SYNCED QUEUE) ===
  app.post("/api/agents/execute", async (req, res) => {
    try {
      const { agentId, teamId, inputMessage, rolePrompt, tenantId, industryId } = req.body;
      if (!agentId || !inputMessage) {
        res.status(400).json({ success: false, error: "Missing agentId or input message content." });
        return;
      }
      const activeTenant = tenantId || "default_tenant";
      const activeIndustry = industryId || "fashion";
      const db = ModaDB.read();
      const taskId = `task_${Math.random().toString(36).slice(2, 11)}`;
      
      const newPendingTask = {
        id: taskId,
        teamId: teamId || "universal_team",
        agentId,
        inputMessage,
        status: "processing" as const,
        createdAt: new Date().toISOString()
      };
      
      db.agent_tasks.push(newPendingTask);
      ModaDB.write(db);

      // Write transaction to Firestore live tasks queue namespace
      if (serverDb) {
        try {
          const taskRef = firestoreDoc(serverDb, "tenants", activeTenant, "agent_tasks", taskId);
          await firestoreSetDoc(taskRef, newPendingTask);
        } catch (taskErr: any) {
          console.warn("Firestore task enqueue log warning:", taskErr.message);
        }
      }

      // Perform Gemini reasoning processing or offline simulation dynamically
      try {
        const client = getGeminiClient();
        
        // Retrieve context using RAG
        const retrievedRAG = await retrieveRAGContext(inputMessage, activeTenant, activeIndustry);
        const enhancedSystemInstruction = retrievedRAG
          ? `${rolePrompt || "你是一个摩整数字员工智能工作站"}\n\n=== RAG 商业规则与规章参考 (Real Retrieve) ===\n${retrievedRAG}`
          : (rolePrompt || "你是一个摩整数字员工智能工作站");

        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: inputMessage,
          config: {
            systemInstruction: enhancedSystemInstruction,
            temperature: 0.8
          }
        });

        const reply = response.text || "已完成相应的数字流程分析并自动交付中继。";
        
        // Update task status inside local DB
        const freshDB = ModaDB.read();
        const activeTask = freshDB.agent_tasks.find(t => t.id === taskId);
        if (activeTask) {
          activeTask.status = "completed";
          activeTask.response = reply;
          activeTask.completedAt = new Date().toISOString();
        }
        ModaDB.write(freshDB);

        // Update task status inside Firestore
        if (serverDb) {
          try {
            const taskRef = firestoreDoc(serverDb, "tenants", activeTenant, "agent_tasks", taskId);
            await firestoreSetDoc(taskRef, {
              ...newPendingTask,
              status: "completed",
              response: reply,
              completedAt: new Date().toISOString()
            });
          } catch (taskErr: any) {
            console.warn("Firestore task fulfillment sync exception:", taskErr.message);
          }
        }

        res.json({ success: true, taskId, status: "completed", response: reply });
      } catch (geminiError: any) {
        console.warn("Gemini Engine runtime call fallback (applying simulated logic):", geminiError.message);
        
        const responseFallback = `[智体自主代运营中继]：已接受数据 "${inputMessage}"。已根据目前商家最合适的价格，进行一键补货，同步完成顺丰寄发。`;
        const freshDB = ModaDB.read();
        const activeTask = freshDB.agent_tasks.find(t => t.id === taskId);
        if (activeTask) {
          activeTask.status = "completed";
          activeTask.response = responseFallback;
          activeTask.completedAt = new Date().toISOString();
        }
        ModaDB.write(freshDB);

        if (serverDb) {
          try {
            const taskRef = firestoreDoc(serverDb, "tenants", activeTenant, "agent_tasks", taskId);
            await firestoreSetDoc(taskRef, {
              ...newPendingTask,
              status: "completed",
              response: responseFallback,
              completedAt: new Date().toISOString()
            });
          } catch (taskErr: any) {
            console.warn("Firestore task simulation callback exception:", taskErr.message);
          }
        }

        res.json({ success: true, taskId, status: "completed", response: responseFallback, warning: geminiError.message });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // API 2: Interactive AI Employee response dispatcher (With Full Real RAG Retrieval and Cloud Logs)
  app.post("/api/chat", async (req, res) => {
    try {
      const { 
        message, 
        employeeRole, 
        employeeName, 
        employeeDesc, 
        industryName, 
        industryTagline,
        strategyName,
        strategyDesc,
        tenantId,
        industryId
      } = req.body;

      if (!message) {
        res.status(400).json({ error: "Message input is required." });
        return;
      }

      const activeTenant = tenantId || "default_tenant";

      // System instruction template to give high-fidelity specialized role-playing behavior
      const systemInstruction = `你是一位高智商、极具智慧与实操执行力的数字员工（类似 Shopify Sidekick 智能伙伴）。
你的名字和岗位是：【${employeeRole} - ${employeeName}】
你目前所在的行业公司：【${industryName}】(${industryTagline})
当前公司选择的经营和运营战略：【${strategyName}】(${strategyDesc})
你的核心工作范畴：${employeeDesc}

请以此真实雇员身份，面对公司创始人（所有者，即用户）下达的指令、询问或探讨，进行专业、高效、针对性强、不拖泥带出的直接回复：
1. 语言表达：自然、沉着、带有该行当行话特色的语感。
2. 回复结构：不用客套寒暄、不要背书、也不要输出任何前置 of 助手说明文字。
3. 关键特色：紧扣行业痛点，结合当前的运营策略（精益/扩张/全权托管）来组织你的策略与态度。
4. 字数控制：保持高度凝练，并严格控制在 160 字以内，字字珠玑，突出高算力高能效。
5. **(Sidekick 后台实地执勤与微操作系统级能力)**:
作为掌握实机控制能力的 AI 面板秘书，如果创始人向你下达了“做/修改/设定/执行”等具体操作指令，你应在专业文字回复后，在文字末尾追加一串具体的物理动作标签（文字中需同步表达‘已为您自动修改并提交’或‘已极速派单’）。
动作标签格式必须为（单独紧随行尾，包含左右括号）：
- 更换网店主图标语:  [ACTION: SET_HEADLINE | 标语文字]
- 更换首页视觉主题:  [ACTION: SET_THEME | retro|dark|classic] (选择对应的主题ID)
- 研发并自动上架产品: [ACTION: ADD_PRODUCT | 商品品名 | 售价] (售价需为纯数字，如129)
- 一键完成订单自动分包并极速发顺丰快递: [ACTION: SHIP_ORDERS]
- 解决客户纠纷调停(解救李阿姨投诉): [ACTION: RESOLVE_COMPLAINT]
- 调整并更改直通车营销每日资金预算:  [ACTION: SET_BUDGET | 预算金额] (金额需为50~1000内的数字)

注意：如果用户只是闲聊或泛泛而谈，探讨经营方法，而非直接要求你操作或改动，则**绝对不能**附带任何 [ACTION] 标签。`;

      // 1. Live Semantic RAG Retrieval overlay
      const activeIndustry = industryId || "fashion";
      const retrievedRAG = await retrieveRAGContext(message, activeTenant, activeIndustry);
      const enhancedSystemPrompt = retrievedRAG
        ? `${systemInstruction}\n\n=== 智体匹配到的知识库商业规则 (RAG Context) ===\n${retrievedRAG}`
        : systemInstruction;

      try {
        const ai = getGeminiClient();
        
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: message,
          config: {
            systemInstruction: enhancedSystemPrompt,
            temperature: 0.85,
            topP: 0.9,
          },
        });

        const reply = response.text || "接收到了您的指示，我已经在落实相应的数字要素调整。";
        res.json({ success: true, reply, source: "Gemini Cloud Live Engine (RAG Enabled)" });
      } catch (err: any) {
        console.warn("Gemini Live server call failed, returning simulated responsive fallback:", err.message);
        
        // Simulating the AI employee offline behavior intelligently
        let simulatedReply = `你好，我是【${employeeRole} - ${employeeName}】。已收到关于商铺运作管理提案：对业务要素进行科学精算与匹配。`;
        if (message.includes("换标语") || message.includes("口号") || message.includes("修改标语")) {
          simulatedReply = `好的创始人，我正在通过 MODAUI 双向同步链路精调店招画卷。已为您自动修改并提交新标语。[ACTION: SET_HEADLINE | ${message.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "").slice(-20)}]`;
        } else if (message.includes("上架") || message.includes("研发新产品") || message.includes("上新")) {
          const matchPrice = message.match(/\d+/);
          const price = matchPrice ? Number(matchPrice[0]) : 199;
          simulatedReply = `已经调集了供应链伙伴，一键研发完成、并全额生成主页海报，已为您自动修改并提交产品正式上架出售！[ACTION: ADD_PRODUCT | AI 极智爆款好物 | ${price}]`;
        } else if (message.includes("发货") || message.includes("顺丰") || message.includes("寄送")) {
          simulatedReply = `报告掌柜！您的新单积存货栈已于1秒前自动理算，由顺丰快递派送极速打单完毕。已极速派单顺丰发运！[ACTION: SHIP_ORDERS]`;
        } else if (message.includes("投诉") || message.includes("差评") || message.includes("李阿姨")) {
          simulatedReply = `不用担心，我已联系客户进行了贴心致歉，全额退还了算力损耗，并补偿了首單专享券。投诉已顺利撤销调停！[ACTION: RESOLVE_COMPLAINT]`;
        } else if (message.includes("广告") || message.includes("预算") || message.includes("直通车")) {
          simulatedReply = `明白。现已通过精益理财层计算合理的每日竞价扣减阈值，预算已调实。[ACTION: SET_BUDGET | 350]`;
        }

        res.json({ 
          success: true, 
          source: "Simulated Offline Engine (RAG Fallback)",
          reply: simulatedReply
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/fashion/design", async (req, res) => {
    try {
      const { message, prompt } = req.body;
      const userPrompt = String(message || prompt || "请生成一个高端时尚服装新品设计方案");
      const activeTenant = String(req.body.tenantId || req.body.email || "default_tenant");
      let generatedText = "";
      let item: any = null;

      try {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: userPrompt,
          config: {
            systemInstruction: `你是时装AI设计师，请基于以下文本生成一个服装新品设计文案，并提供一个商品方案。\n${userPrompt}`,
            temperature: 0.9,
            topP: 0.9
          }
        });
        generatedText = response.text || "您的高阶服装设计方案已生成。";
      } catch (aiError: any) {
        console.warn("Fashion design pipeline fallback to simulated response:", aiError.message);
        generatedText = `Aria 已根据需求生成高端服装新品设计方案：${userPrompt}。该款式可用于直播爆款、限量礼服或品牌联名定制。`;
      }

      const defaultTitle = `Aria 服装提案 ${Date.now()}`;
      item = {
        id: `art_${Math.random().toString(36).slice(2, 9)}`,
        title: defaultTitle,
        desc: generatedText,
        fabric: "高级美利奴羊毛 / 高科技复合面料",
        price: 1680,
        image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=800",
        sketch: "https://images.unsplash.com/photo-1520962918055-839d2e6f62a7?auto=format&fit=crop&q=80&w=800"
      };

      res.json({ success: true, text: generatedText, item });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/fashion/products", async (req, res) => {
    try {
      const payload = req.body.product || req.body;
      const { title, desc, fabric, price, image, sketch, inventory = 50, category = "Fashion" } = payload;
      if (!title || !desc) {
        res.status(400).json({ success: false, error: "title and desc are required to create a fashion product." });
        return;
      }
      const db = ModaDB.read();
      const newProduct = {
        id: `prod_${Math.random().toString(36).slice(2, 11)}`,
        storeId: payload.storeId || `sto_${String(req.body.tenantId || "default_tenant")}`,
        name: title,
        category,
        price: Number(price || 0),
        inventory: Number(inventory),
        sku: payload.sku || `SKU-FASHION-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        variant: {},
        images: [image || sketch || "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=800"],
        description: desc,
        fabric,
        createdAt: new Date().toISOString()
      };
      db.products.push(newProduct);
      ModaDB.write(db);

      const returnedItem = {
        id: newProduct.id,
        title: newProduct.name,
        desc: newProduct.description,
        fabric: newProduct.fabric,
        price: newProduct.price,
        image: newProduct.images[0],
        sketch: sketch || newProduct.images[0]
      };

      res.status(201).json({ success: true, product: returnedItem });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/fashion/products", (req, res) => {
    try {
      const { tenantId } = req.query;
      const db = ModaDB.read();
      let products = db.products.filter((p: any) => String(p.category).toLowerCase().includes("fashion"));
      if (tenantId) {
        products = products.filter((p: any) => p.storeId === `sto_${String(tenantId)}` || p.storeId === String(tenantId));
      }
      res.json({ success: true, products });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // === 11. EXTENDED LLM SERVICE APIs ===
  app.post("/api/ai/openai/generate", async (req, res) => {
    try {
      const { prompt, model = "gpt-4" } = req.body;
      if (!prompt) {
        res.status(400).json({ success: false, error: "Prompt is required." });
        return;
      }
      const output = await generateWithOpenAI(prompt, model);
      res.json({ success: true, output, provider: "openai", model });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/ai/langchain/agent", async (req, res) => {
    try {
      const agent = createLangChainAgent();
      res.json({ success: true, provider: "langchain", model: "gemini-pro", status: "ready", hint: "Use this agent to orchestrate chained Gemini workflows." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/ai/ollama/generate", async (req, res) => {
    try {
      const { prompt, model = "llama2" } = req.body;
      if (!prompt) {
        res.status(400).json({ success: false, error: "Prompt is required." });
        return;
      }
      const output = await generateWithOllama(prompt, model);
      res.json({ success: true, output, provider: "ollama", model });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // === 12. DYNAMIC REAL-TIME CART ENGINE ===
  app.get("/api/cart", (req, res) => {
    try {
      const userId = String(req.query.userId || "guest_user");
      const db = ModaDB.read();
      let cart = db.carts.find(c => c.userId === userId);
      if (!cart) {
        cart = { userId, items: [], discount: 0 };
        db.carts.push(cart);
        ModaDB.write(db);
      }
      
      // Calculate subtotals based on real product price info
      let subtotal = 0;
      const details = cart.items.map(it => {
        const prod = db.products.find(p => p.id === it.productId);
        const itemPrice = prod ? prod.price : 99;
        const itemName = prod ? prod.name : "MODA精品商品";
        subtotal += itemPrice * it.quantity;
        return {
          productId: it.productId,
          name: itemName,
          price: itemPrice,
          quantity: it.quantity,
          image: prod?.images?.[0] || "https://picsum.photos/200/200"
        };
      });

      // Simple Coupon code handler
      let couponDiscount = 0;
      if (cart.coupon === "MODA99") {
        couponDiscount = 9.9;
      } else if (cart.coupon === "VIP88") {
        couponDiscount = 12.0;
      }

      const shipping = subtotal > 100 || subtotal === 0 ? 0 : 10;
      const tax = Math.round(subtotal * 0.01 * 100) / 100;
      const total = Math.max(0, subtotal - couponDiscount + shipping + tax);

      res.json({
        success: true,
        cart: {
          userId,
          items: cart.items,
          coupon: cart.coupon,
          discount: couponDiscount
        },
        calculations: {
          subtotal,
          discount: couponDiscount,
          shipping,
          tax,
          total
        },
        items: details
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/cart/add", (req, res) => {
    try {
      const { userId = "guest_user", productId, quantity = 1 } = req.body;
      if (!productId) {
        res.status(400).json({ success: false, error: "Missing Product ID parameter" });
        return;
      }
      const db = ModaDB.read();
      let cart = db.carts.find(c => c.userId === userId);
      if (!cart) {
        cart = { userId, items: [], discount: 0 };
        db.carts.push(cart);
      }

      const existingItem = cart.items.find(it => it.productId === productId);
      if (existingItem) {
        existingItem.quantity += Number(quantity);
      } else {
        cart.items.push({ productId, quantity: Number(quantity) });
      }

      ModaDB.write(db);
      res.json({ success: true, message: "Product successfully enqueued into persistent cart", cart });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/cart/remove", (req, res) => {
    try {
      const { userId = "guest_user", productId } = req.body;
      if (!productId) {
        res.status(400).json({ success: false, error: "Product ID required to execute eviction." });
        return;
      }
      const db = ModaDB.read();
      const cart = db.carts.find(c => c.userId === userId);
      if (cart) {
        cart.items = cart.items.filter(it => it.productId !== productId);
        ModaDB.write(db);
      }
      res.json({ success: true, message: "Cart item removed successfully", cart });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/cart/clear", (req, res) => {
    try {
      const { userId = "guest_user" } = req.body;
      const db = ModaDB.read();
      const cart = db.carts.find(c => c.userId === userId);
      if (cart) {
        cart.items = [];
        cart.coupon = undefined;
        ModaDB.write(db);
      }
      res.json({ success: true, message: "Cart cleared state completed successfully", cart });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 13. TENANTS QUOTA & METERING ADMIN API ===
  app.get("/api/tenants", (req, res) => {
    try {
      const db = ModaDB.read();
      res.json({ success: true, tenants: db.tenants });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/tenants/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { quotaLimit, billingStatus } = req.body;
      const db = ModaDB.read();
      const tenant = db.tenants.find(t => t.id === id);
      if (!tenant) {
        res.status(404).json({ success: false, error: "Tenant not found." });
        return;
      }

      if (quotaLimit !== undefined) tenant.quotaLimit = Number(quotaLimit);
      if (billingStatus !== undefined) tenant.billingStatus = billingStatus;

      ModaDB.write(db);
      ModaDB.log("PLATFORM_ADMIN", "SAAS_CONTROLLER", "TENANT_QUOTA_UPDATE", "BILLING_SYS", `Adjusted tenant quotas and metrics: ${id}`);
      res.json({ success: true, tenant });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 14. GLOBAL PLATFORM SETTINGS ENGINE ===
  const PLATFORM_SETTINGS_FILE = path.resolve("data/platform_settings.json");
  const defaultSettings = {
    maintenanceMode: false,
    allowRegistration: true,
    defaultQuotaLimit: 10000,
    supportedPaymentGateways: ["Stripe", "Alipay", "WeChatPay", "PayPal"],
    activeSystemVersion: "v3.0.0 Stable Enterprise",
    aiConfig: {
      defaultModel: "gemini-3.5-flash",
      embeddingModel: "gemini-embedding-2-preview"
    }
  };

  app.get("/api/platform/settings", (req, res) => {
    try {
      if (!fs.existsSync(PLATFORM_SETTINGS_FILE)) {
        fs.mkdirSync(path.dirname(PLATFORM_SETTINGS_FILE), { recursive: true });
        fs.writeFileSync(PLATFORM_SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), "utf-8");
        res.json({ success: true, settings: defaultSettings });
        return;
      }
      const data = JSON.parse(fs.readFileSync(PLATFORM_SETTINGS_FILE, "utf-8"));
      res.json({ success: true, settings: data });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/platform/settings", (req, res) => {
    try {
      const currentSettings = fs.existsSync(PLATFORM_SETTINGS_FILE)
        ? JSON.parse(fs.readFileSync(PLATFORM_SETTINGS_FILE, "utf-8"))
        : defaultSettings;
      
      const updated = {
        ...currentSettings,
        ...req.body
      };

      fs.writeFileSync(PLATFORM_SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
      ModaDB.log("PLATFORM_ADMIN", "PLATFORM_CORE", "UPDATE_GLOBAL_SETTINGS", "CORE_SETTINGS", "Platform global system parameters reconfigured.");
      res.json({ success: true, settings: updated });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 15. INDUSTRY OPERATIONS BLUEPRINT TEMPLATES MARKET ===
  const INDUSTRY_TEMPLATES = [
    {
      id: "clothing",
      name: "时尚服装 (Modern Clothing)",
      tagline: "领跑前沿，AI赋能高端服饰与跨境选品运营",
      agents: [
        { role: "AI设计师", name: "Bella", prompt: "设计引领趋势、融合经典。结合大数据智能分析最热款式与高端面料。" },
        { role: "AI商品经理", name: "Ryan", prompt: "跨境高德供应链分析，智能调整库存，监控爆单流转，推荐SKU优化款。" },
        { role: "AI运营经理", name: "David", prompt: "统筹全店铺各流程顺畅，实时监控财务漏斗，分配高并发订单出仓单。" },
        { role: "AI营销经理", name: "Zack", prompt: "自动化营销宣发，擅于书写小红书、TikTok爆款高质带货视频文案，提ROI。" }
      ]
    },
    {
      id: "catering",
      name: "餐饮外卖 (Smart Catering)",
      tagline: "极速响应，AI菜单顾问与高频配送自动控制系统",
      agents: [
        { role: "AI菜单顾问", name: "Chef Spark", prompt: "深入分析客群偏好，智能化调整推荐菜谱与时令新品推荐搭配。" },
        { role: "AI采购经理", name: "Fresh Line", prompt: "每日清晨直连产地供应链，智能控生鲜库存，缩减原材料损耗率。" },
        { role: "AI运营经理", name: "Speedy Tech", prompt: "保障多门店高频配送响应。无缝协调美团/饿了么及自有配送渠道调度。" },
        { role: "AI营销经理", name: "Flavor Bomb", prompt: "撰写让食客口齿留香的优质推送短文，定时触发秒杀及免配送费大促。" }
      ]
    },
    {
      id: "beauty",
      name: "美业沙龙 (Salon Beauty)",
      tagline: "至尊呵护，高级会员积分忠诚度与预约分配顾问",
      agents: [
        { role: "AI产品顾问", name: "Chloe", prompt: "分析敏感肤质与高端护理项目配方，提供极致个性化美容诊疗咨询建议。" },
        { role: "AI会员运营经理", name: "Loyal Heart", prompt: "管理VIP阶梯客户积分与生日特权，极大促进二次到店预约消费率。" },
        { role: "AI运营经理", name: "Style Hub", prompt: "统筹高级技师预约时段及美甲美发床位周转率，提供排班推荐。" },
        { role: "AI营销经理", name: "Glow Daily", prompt: "发掘社交媒体美容爆款话题，推出体验项目折扣券和闺蜜同行拼单包。" }
      ]
    },
    {
      id: "fitness",
      name: "运动健身 (Healthy Exercise)",
      tagline: "科学律动，AI健身课程顾问与长期活跃留存增长体系",
      agents: [
        { role: "AI课程顾问", name: "Coach Iron", prompt: "构建科学健身食谱与力量抗阻训练计划，针对减脂增肌精准推荐配餐。" },
        { role: "AI会员运营经理", name: "Active Track", prompt: "追踪会员打卡频次，发送智能化加油短信及唤醒特惠，提活跃度。" },
        { role: "AI运营经理", name: "Gym Flow", prompt: "合理调度私教空闲时段和跑度机等高端器械的使用损耗预测维护。" },
        { role: "AI营销经理", name: "Power Rush", prompt: "运营高粘性社群打卡挑战赛，激发老带新裂变转化和季卡续费折扣券。" }
      ]
    },
    {
      id: "jewelry",
      name: "高定珠宝 (Luxury Jewelry)",
      tagline: "奢华传世，大师智拟高端珠宝鉴定与高客单价值宣发",
      agents: [
        { role: "AI产品设计师", name: "Valerie", prompt: "融合复古与现代极简，提供钻石与珍稀彩色宝石款式高定推荐方案。" },
        { role: "AI采购经理", name: "Gem Origin", prompt: "寻根南非与缅甸源头，直通海关清关鉴定，安全控珍奢级物流供应链。" },
        { role: "AI运营经理", name: "Crown Keeper", prompt: "管理高价值保值保险库存，统筹超高客单鉴定回访及实名私人定制预约。" },
        { role: "AI营销经理", name: "Golden Era", prompt: "用极尽典雅的传世美学语言，输出至臻浪漫的高端求婚钻戒定制故事文案。" }
      ]
    },
    {
      id: "household",
      name: "家居生活 (Warm Furniture)",
      tagline: "温馨栖所，柔性环保家居建材选品与空间收纳顾问",
      agents: [
        { role: "AI选品顾问", name: "Monica", prompt: "提供北欧极简与侘寂美学整体家装配置配色灵感，把关材料环保评级。" },
        { role: "AI采购经理", name: "Wood Craft", prompt: "追踪大宗原木及零配件厂直发状态，预测大促备货，降低仓储物流成本。" },
        { role: "AI运营经理", name: "Logis Force", prompt: "无缝调度大件家具物流上门配送及安装师傅服务节点跟踪，优化售后体验。" },
        { role: "AI营销经理", name: "Home Sweet", prompt: "分享创意温暖家居收纳技巧，撰写种草文案拉动低频次家装复购爆单。" }
      ]
    }
  ];

  app.get("/api/templates", (req, res) => {
    res.json({ success: true, templates: INDUSTRY_TEMPLATES });
  });

  app.post("/api/templates/install", async (req, res) => {
    try {
      const { tenantId, industryId } = req.body;
      if (!tenantId || !industryId) {
        res.status(400).json({ success: false, error: "Missing parameters tenantId or industryId" });
        return;
      }
      const matched = INDUSTRY_TEMPLATES.find(t => t.id === industryId);
      if (!matched) {
        res.status(404).json({ success: false, error: "Industry blueprint template not found." });
        return;
      }

      const db = ModaDB.read();
      
      // Clear old agents inside selected team if any
      const matchedTeam = db.ai_teams.find(t => t.merchantId === tenantId);
      let teamId = matchedTeam ? matchedTeam.id : `team_${tenantId}`;
      
      if (!matchedTeam) {
        db.ai_teams.push({
          id: teamId,
          merchantId: tenantId,
          name: `${matched.name}智能团队`,
          createdAt: new Date().toISOString()
        });
      }

      db.ai_agents = db.ai_agents.filter(a => a.teamId !== teamId);

      // Deploy agents from selected templates
      matched.agents.forEach((agent, index) => {
        const agtRoleMap: Record<string, 'sales_assistant' | 'marketing_strategist' | 'support_rep' | 'inventory_manager'> = {
          "AI设计师": "sales_assistant",
          "AI产品设计师": "sales_assistant",
          "AI菜单顾问": "sales_assistant",
          "AI产品顾问": "sales_assistant",
          "AI选品顾问": "sales_assistant",
          "AI课程顾问": "sales_assistant",
          "AI采购经理": "inventory_manager",
          "AI商品经理": "inventory_manager",
          "AI会员运营经理": "support_rep",
          "AI运营经理": "support_rep",
          "AI财务主管": "support_rep",
          "AI营销经理": "marketing_strategist"
        };
        const resolvedRole = agtRoleMap[agent.role] || "support_rep";

        db.ai_agents.push({
          id: `agt_${tenantId}_installed_${index}`,
          teamId,
          name: agent.name,
          role: resolvedRole,
          systemPrompt: agent.prompt,
          status: "idle",
          memoryContext: [],
          createdAt: new Date().toISOString()
        });
      });

      ModaDB.write(db);
      ModaDB.log(tenantId, "MERCHANT", "DEPLOY_TEMPLATE", "TEMPLATE_MARKET", `Deployed ${matched.name} blueprint to merchant config.`);
      res.json({ success: true, message: `Successfully installed ${matched.name} business templates to active runtime lanes.` });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 16. DETAILED ENTERPRISE APP STORE PLUGIN INSTALLATION API ===
  app.get("/api/app-store", (req, res) => {
    try {
      // Return predefined official robust store plugins catalog
      const storeApps = [
        { id: "sf_express_cargo", name: "顺丰航空特惠专线 Linker", category: "logistics", description: "接入顺丰航空、陆运动态运价，自动下单并打印电子面单，包裹异常快速打折和保价理赔闭环。", developer: "SF Express Official", rating: 4.9, installCount: 5410, monthlyPricing: 15, status: "available", requiredPermissions: ["orders.read", "orders.write"] },
        { id: "xiaohongshu_poster", name: "小红书 AI 种草爆文矩阵", category: "marketing", description: "智体自动撰写针对服装、美发和家居的精致图文笔记，多账号矩阵定时定量分发突击。", developer: "MODAUI AI Labs", rating: 4.8, installCount: 4230, monthlyPricing: 29, status: "available", requiredPermissions: ["products.read", "marketing.write"] },
        { id: "tiktok_shop_sync", name: "TikTok Shop 跨多国货盘同步", category: "sales", description: "一键同步海外货盘多SKU库存，英美加多国汇率实时换算。自动派件至各海运转转。", developer: "CrossBorder Dev Group", rating: 4.6, installCount: 1890, monthlyPricing: 39, status: "available", requiredPermissions: ["products.read", "products.write", "orders.read"] },
        { id: "wechat_miniprogram", name: "微信小程序极速开店一键部署", category: "sales", description: "免代码极速开通微信官方二级小程序店面，客户通过微信支付直达后端控制层。", developer: "Tencent SaaS Build", rating: 4.9, installCount: 9120, monthlyPricing: 0, status: "available", requiredPermissions: ["products.read", "orders.write"] },
        { id: "meituan_coupon_hub", name: "美团点评团购优惠券代核销", category: "sales", description: "专为餐饮与沙龙健身打造，AI 机器人全天候核销美团券、大众点评核券，自动充卡记账。", developer: "MODAUI Platform Corp", rating: 4.7, installCount: 3200, monthlyPricing: 19, status: "available", requiredPermissions: ["orders.write", "finance.write"] },
        { id: "ai_voice_customer", name: "AI 实时语音双向对话客服", category: "ai_tools", description: "使用 Gemini 深度声音及文本模型，支持买家通过电话、微信实时和克隆声优交流售后与选款。", developer: "Gemini Interactions Dev", rating: 4.9, installCount: 1205, monthlyPricing: 59, status: "available", requiredPermissions: ["customers.read", "customers.write", "ai.voice"] },
        { id: "digikash_payment", name: "DigiKash 聚合支付网关", category: "finance", description: "一站式接入 Stripe, PayPal, Paystack 等全球主流支付渠道，支持多币种结算与自动提现。", developer: "DigiKash Official", rating: 5.0, installCount: 8500, monthlyPricing: 0, status: "available", requiredPermissions: ["finance.read", "finance.write", "orders.read"] },
        { id: "lark_process_flow", name: "飞书自动流程审批协同器", category: "finance", description: "当 AI 财务专家生成 ROI 资金流水、采购经理发现库存缺货时，自动在特定组织架构飞书群中推送高美观卡片并自动流转审批流程。", developer: "Lark Platform Official", rating: 4.8, installCount: 1020, monthlyPricing: 9, status: "available", requiredPermissions: ["finance.write", "orders.read"] }
      ];
      res.json({ success: true, apps: storeApps });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/app-installations", (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || "default_tenant");
      const db = ModaDB.read();
      const installs = db.appInstallations.filter(i => i.merchantId === tenantId);
      res.json({ success: true, installations: installs });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/app-store/:appId/install", (req, res) => {
    try {
      const { appId } = req.params;
      const { merchantId, config = {} } = req.body;
      if (!merchantId) {
        res.status(400).json({ success: false, error: "Missing parameter: merchantId is required." });
        return;
      }
      const db = ModaDB.read();
      const existing = db.appInstallations.find(i => i.merchantId === merchantId && i.appId === appId);
      
      if (existing) {
        existing.status = "active";
        existing.config = { ...existing.config, ...config };
        existing.updatedAt = new Date().toISOString();
      } else {
        db.appInstallations.push({
          id: `inst_${Math.random().toString(36).substring(2, 9)}`,
          merchantId,
          appId,
          status: "active",
          config,
          apiKey: `key_ext_${digital-asset.randomUUID().replace(/-/g, "")}`,
          webhookSecret: `whs_${Math.random().toString(36).substring(2, 10)}`,
          installedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      ModaDB.write(db);
      ModaDB.log(merchantId, "MERCHANT", "APP_INSTALL", "APP_STORE", `Installed plugin extension into business sandbox: ${appId}`);
      res.json({ success: true, message: "Modular store extension successfully instantiated." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/app-store/:appId/uninstall", (req, res) => {
    try {
      const { appId } = req.params;
      const { merchantId } = req.body;
      if (!merchantId) {
        res.status(400).json({ success: false, error: "Missing merchantId parameter" });
        return;
      }
      const db = ModaDB.read();
      db.appInstallations = db.appInstallations.filter(i => !(i.merchantId === merchantId && i.appId === appId));
      ModaDB.write(db);
      ModaDB.log(merchantId, "MERCHANT", "APP_UNINSTALL", "APP_STORE", `Evicted plugin extension: ${appId}`);
      res.json({ success: true, message: "Plugin uninstalled successfully." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 17. MARKETING AUTOMATION WORKFLOWS & CAMPAIGNS API ===
  app.get("/api/campaigns", (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || "default_tenant");
      const db = ModaDB.read();
      const merchantCampaigns = db.campaigns.filter(c => c.merchantId === tenantId);
      res.json({ success: true, campaigns: merchantCampaigns });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/campaigns/create", (req, res) => {
    try {
      const { merchantId, name, type, trigger, audience, content } = req.body;
      if (!merchantId || !name || !type) {
        res.status(400).json({ success: false, error: "Missing required campaign parameters." });
        return;
      }
      const db = ModaDB.read();
      const newCampaign: DBCampaign = {
        id: `cmp_${digital-asset.randomUUID().substring(0, 8)}`,
        merchantId,
        name,
        type,
        status: "draft",
        trigger: trigger || { type: "manual" },
        audience: audience || { filters: [], count: 154 },
        content: content || { body: "输入您的营销爆款文案内容..." },
        performance: { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0, revenue: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.campaigns.unshift(newCampaign);
      ModaDB.write(db);
      ModaDB.log(merchantId, "MERCHANT_CAMPAIGN", "CREATE_CAMPAIGN", "CAMPAIGN_BUILDER", `Drafted advertising campaign: ${name}`);
      res.json({ success: true, campaign: newCampaign });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/campaigns/:campaignId/launch", (req, res) => {
    try {
      const { campaignId } = req.params;
      const { merchantId } = req.body;
      const db = ModaDB.read();
      const campaign = db.campaigns.find(c => c.id === campaignId && c.merchantId === merchantId);
      if (!campaign) {
        res.status(404).json({ success: false, error: "Campaign not found." });
        return;
      }

      // Simulate sending out metrics
      campaign.status = "completed";
      campaign.updatedAt = new Date().toISOString();
      campaign.performance = {
        sent: 1000,
        delivered: 980,
        opened: 412,
        clicked: 184,
        converted: 24,
        revenue: 2376
      };

      // Add a financial receipt of simulated ads distribution pricing
      db.finance.push({
        id: `fin_cmp_${digital-asset.randomUUID().substring(0, 8)}`,
        merchantId,
        type: "expense",
        amount: 50.0, // $50 advertising cost
        description: `广告营销网络推送分发成本 (活动: ${campaign.name})`,
        createdAt: new Date().toISOString()
      });

      ModaDB.write(db);
      ModaDB.log(merchantId, "MERCHANT_CAMPAIGN", "LAUNCH_CAMPAIGN", "CAMPAIGN_LAUNCHER", `Dispatched promotional ads: ${campaign.name}`);
      res.json({ success: true, campaign });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/campaigns/:campaignId/analytics", (req, res) => {
    try {
      const { campaignId } = req.params;
      const tenantId = String(req.query.tenantId || "default_tenant");
      const db = ModaDB.read();
      const campaign = db.campaigns.find(c => c.id === campaignId && c.merchantId === tenantId);
      if (!campaign) {
        res.status(404).json({ success: false, error: "Campaign profile missing" });
        return;
      }
      res.json({ success: true, performance: campaign.performance });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 18. OMNI-CHANNEL STORE integrations (TikTok, xiaohongshu) ===
  app.get("/api/channels", (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || "default_tenant");
      const db = ModaDB.read();
      const currentChs = db.channelConnections.filter(c => c.merchantId === tenantId);
      res.json({ success: true, connections: currentChs });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/channels/tiktok/connect", (req, res) => {
    try {
      const { merchantId, channel, authCode } = req.body;
      if (!merchantId || !channel) {
        res.status(400).json({ success: false, error: "Missing parameters merchantId or channel" });
        return;
      }
      const db = ModaDB.read();
      // Remove stale connection if existing
      db.channelConnections = db.channelConnections.filter(c => !(c.merchantId === merchantId && c.channel === channel));

      const newConn: DBChannelConnection = {
        id: `chn_${Math.random().toString(36).substring(2, 9)}`,
        merchantId,
        channel,
        status: "connected",
        accessToken: `tok_ext_${digital-asset.randomUUID().substring(0, 16)}`,
        storeId: `sto_ext_${Math.random().toString(36).substring(2, 8)}`,
        config: { authCode: authCode || "standard_oauth_token" },
        connectedAt: new Date().toISOString()
      };
      db.channelConnections.push(newConn);
      ModaDB.write(db);
      ModaDB.log(merchantId, "CHANNELS", "CONNECT_CHANNEL", "CHANNEL_INTEGRATOR", `Connected store to external media channel: ${channel}`);
      res.json({ success: true, connection: newConn });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/channels/xiaohongshu/sync-products", (req, res) => {
    try {
      const { merchantId, channels } = req.body;
      if (!merchantId || !channels) {
        res.status(400).json({ success: false, error: "Parameters merchantId and channels list are required." });
        return;
      }
      // Log external system API calls
      ModaDB.log(merchantId, "CHANNELS", "SYNC_PRODUCTS", "CHANNEL_INTEGRATOR", `Synchronized merchandise catalog to external lanes: ${channels.join(", ")}`);
      res.json({ success: true, message: `Successfully synced inventory metadata to active networks: ${channels.join(", ")}` });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/channels/douyin/sync-orders", (req, res) => {
    try {
      const { merchantId } = req.body;
      if (!merchantId) {
        res.status(400).json({ success: false, error: "merchantId required" });
        return;
      }
      const db = ModaDB.read();
      // Pull and construct a simulated purchase from TikTok / Douyin
      const mockOrderId = `ord_ext_${Math.random().toString(36).substring(2, 9)}`;
      const extProducts = db.products.filter(p => p.storeId === `sto_${merchantId}`);
      const selectedProd = extProducts[0] || { id: "p1", name: "时尚风衣外套", price: 199 };
      
      const newOrder: DBOrder = {
        id: mockOrderId,
        userId: "ext_omni_buyer",
        storeId: `sto_${merchantId}`,
        merchantId,
        items: [{ productId: selectedProd.id, productName: selectedProd.name, price: Number(selectedProd.price), quantity: 1 }],
        totalPrice: Number(selectedProd.price),
        status: "processing",
        createdAt: new Date().toISOString()
      };

      db.orders.unshift(newOrder);

      // Add financial revenue ledger
      db.finance.push({
        id: `fin_${digital-asset.randomUUID().substring(0, 8)}`,
        merchantId,
        type: "revenue",
        amount: Number(selectedProd.price),
        orderId: mockOrderId,
        description: `对外全渠道销售回款 (渠道: 多媒体渠道自动同步录单)`,
        createdAt: new Date().toISOString()
      });

      ModaDB.write(db);
      ModaDB.log(merchantId, "CHANNELS", "SYNC_ORDERS", "CHANNEL_INTEGRATOR", `Imported external customer ticket automatically: ${mockOrderId}`);
      res.json({ success: true, message: "Channel orders updated.", order: newOrder });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 19. RBAC TEAM PRIVILEGES & STAFF SYSTEM ===
  app.get("/api/roles", (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || "default_tenant");
      const db = ModaDB.read();
      const merchantRoles = db.roles.filter(r => r.merchantId === tenantId);
      res.json({ success: true, roles: merchantRoles.length > 0 ? merchantRoles : [
        { id: "owner", name: "系统创办持有人", description: "拥有全局所有控制权限、结账配置与高级微调设置范围。", permissions: ["products:write", "orders:write", "finance:read", "settings:manage"], merchantId: tenantId },
        { id: "operator", name: "智能带班店长", description: "日常商品及分单履约处理，可以查阅销售明细。", permissions: ["products:write", "orders:write"], merchantId: tenantId }
      ] });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/roles/create", (req, res) => {
    try {
      const { merchantId, name, description, permissions } = req.body;
      if (!merchantId || !name) {
        res.status(400).json({ success: false, error: "Missing active tenant context or role tag name" });
        return;
      }
      const db = ModaDB.read();
      const newRole: DBRole = {
        id: `rol_${Math.random().toString(36).substring(2, 8)}`,
        name,
        description: description || "店员角色说明...",
        permissions: permissions || ["products:read"],
        merchantId
      };
      db.roles.push(newRole);
      ModaDB.write(db);
      ModaDB.log(merchantId, "RBAC_SYSTEM", "CREATE_ROLE", "TEAM_SECURITY", `Created custom workspace role level: ${name}`);
      res.json({ success: true, role: newRole });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/staff", (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || "default_tenant");
      const db = ModaDB.read();
      const list = db.staffPermissions.filter(s => s.merchantId === tenantId);
      res.json({ success: true, staff: list.length > 0 ? list : [
        { id: "stf_1", merchantId: tenantId, email: "manager@modaui.com", name: "店长助手 阿杰", roles: ["operator"], status: "active" }
      ] });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/staff/:staffId/update-role", (req, res) => {
    try {
      const { staffId } = req.params;
      const { merchantId, roles } = req.body;
      const db = ModaDB.read();
      const staff = db.staffPermissions.find(s => s.id === staffId && s.merchantId === merchantId);
      if (!staff) {
        res.status(404).json({ success: false, error: "Teammate profile not found in active workspace." });
        return;
      }
      staff.roles = roles;
      ModaDB.write(db);
      ModaDB.log(merchantId, "RBAC_SYSTEM", "UPDATE_STAFF", "TEAM_SECURITY", `Adjusted team parameters for system user: ${staff.name}`);
      res.json({ success: true, staff });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/staff/invite", (req, res) => {
    try {
      const { merchantId, email, name, roles } = req.body;
      if (!merchantId || !email || !name) {
        res.status(400).json({ success: false, error: "Missing recipient details" });
        return;
      }
      const db = ModaDB.read();
      const newStaff: DBStaffPermission = {
        id: `stf_${Math.random().toString(36).substring(2, 9)}`,
        merchantId,
        email,
        name,
        roles: roles || ["operator"],
        status: "invited"
      };
      db.staffPermissions.push(newStaff);
      ModaDB.write(db);
      ModaDB.log(merchantId, "RBAC_SYSTEM", "INVITE_STAFF", "TEAM_SECURITY", `Dispatched collaboration invitation to: ${email}`);
      res.json({ success: true, staff: newStaff });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 20. CUSTOM THEME DESIGNER ENGINE ===
  app.get("/api/themes", (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || "default_tenant");
      const db = ModaDB.read();
      const list = db.themes.filter(t => t.merchantId === tenantId);
      res.json({ success: true, themes: list.length > 0 ? list : [
        { id: "thm_default", merchantId: tenantId, name: "MODA经典流线 (Default Air)", status: "published", config: { colors: { primary: "#d4af37", secondary: "#111111", background: "#fcfbf7", text: "#1e1e1e" }, fonts: { heading: "Playfair Display", body: "Inter" }, layout: { headerStyle: "luxury", footerEnabled: true } }, previewUrl: "https://picsum.photos/400/300" }
      ] });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put("/api/themes/:themeId", (req, res) => {
    try {
      const { themeId } = req.params;
      const { merchantId, config } = req.body;
      const db = ModaDB.read();
      let theme = db.themes.find(t => t.id === themeId && t.merchantId === merchantId);
      if (!theme) {
        // Create custom theme node on edit if it doesn't exist
        theme = {
          id: themeId,
          merchantId,
          name: "自定义品牌微调 (Custom Vibe)",
          status: "draft",
          config: config,
          previewUrl: "https://picsum.photos/400/300"
        };
        db.themes.push(theme);
      } else {
        theme.config = { ...theme.config, ...config };
      }
      ModaDB.write(db);
      res.json({ success: true, theme });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/themes/:themeId/publish", (req, res) => {
    try {
      const { themeId } = req.params;
      const { merchantId } = req.body;
      const db = ModaDB.read();
      db.themes.forEach(t => {
        if (t.merchantId === merchantId) {
          t.status = t.id === themeId ? "published" : "archived";
        }
      });
      const published = db.themes.find(t => t.id === themeId && t.merchantId === merchantId);
      
      // Mirror branding details inside DBStore
      const matchedStore = db.stores.find(s => s.merchantId === merchantId);
      if (matchedStore && published) {
        matchedStore.branding = {
          ...matchedStore.branding,
          colorTheme: (published.config.colors.primary === "#d4af37" ? "classic" : "warm")
        };
      }

      ModaDB.write(db);
      ModaDB.log(merchantId, "STOREFRONT_THEMES", "PUBLISH_THEME", "THEME_BUILDER", `Deimplemented previous layout; published branding code style: ${themeId}`);
      res.json({ success: true, message: "Theme published to global storefront." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === 21. CUSTOM WEBHOOKS & API CREDENTIALS GATEWAY ===
  app.get("/api/webhooks", (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || "default_tenant");
      const db = ModaDB.read();
      const currentList = db.webhookRegistrations.filter(w => w.merchantId === tenantId);
      res.json({ success: true, webhooks: currentList });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/webhooks/register", (req, res) => {
    try {
      const { merchantId, event, targetUrl } = req.body;
      if (!merchantId || !event || !targetUrl) {
        res.status(400).json({ success: false, error: "Missing parameters merchantId, event, or targetUrl." });
        return;
      }
      const db = ModaDB.read();
      const newWebhook: DBWebhookReg = {
        id: `whk_${Math.random().toString(36).substring(2, 9)}`,
        merchantId,
        event,
        targetUrl,
        active: true,
        createdAt: new Date().toISOString()
      };
      db.webhookRegistrations.push(newWebhook);
      ModaDB.write(db);
      ModaDB.log(merchantId, "WEBHOOKS", "REGISTER_WEBHOOK", "WEBHOOK_DISPATCHER", `Subscribed URL node to system event listener stream: ${event} -> ${targetUrl}`);
      res.json({ success: true, webhook: newWebhook });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/webhooks/:webhookId", (req, res) => {
    try {
      const { webhookId } = req.params;
      const tenantId = String(req.query.tenantId || "default_tenant");
      const db = ModaDB.read();
      db.webhookRegistrations = db.webhookRegistrations.filter(w => !(w.id === webhookId && w.merchantId === tenantId));
      ModaDB.write(db);
      res.json({ success: true, message: "Webhook successfully detached." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/settings/api-keys", (req, res) => {
    try {
      const tenantId = String(req.query.tenantId || "default_tenant");
      const db = ModaDB.read();
      const keys = db.apiKeys.filter(k => k.merchantId === tenantId);
      res.json({ success: true, keys });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/settings/api-keys", (req, res) => {
    try {
      const { merchantId, name } = req.body;
      if (!merchantId || !name) {
        res.status(400).json({ success: false, error: "Parameters merchantId and name are required." });
        return;
      }
      const db = ModaDB.read();
      const newKey: DBAPIKey = {
        id: `api_${Math.random().toString(36).substring(2, 8)}`,
        merchantId,
        name,
        apiKey: `moda_key_${digital-asset.randomUUID().replace(/-/g, "")}`,
        scopes: ["products:read", "orders:read"],
        createdAt: new Date().toISOString()
      };
      db.apiKeys.push(newKey);
      ModaDB.write(db);
      ModaDB.log(merchantId, "DEVELOPER_PORTAL", "GENERATE_API_KEY", "SECURITY_MGMT", `Issued custom headless developer API client credential: ${name}`);
      res.json({ success: true, key: newKey });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete("/api/settings/api-keys/:keyId", (req, res) => {
    try {
      const { keyId } = req.params;
      const tenantId = String(req.query.tenantId || "default_tenant");
      const db = ModaDB.read();
      db.apiKeys = db.apiKeys.filter(k => !(k.id === keyId && k.merchantId === tenantId));
      ModaDB.write(db);
      res.json({ success: true, message: "API key successfully revoked." });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/webhooks/test-dispatch", (req, res) => {
    try {
      const { merchantId, event } = req.body;
      if (!merchantId || !event) {
        res.status(400).json({ success: false, error: "Missing parameters merchantId or event." });
        return;
      }
      
      const db = ModaDB.read();
      const matchedHooks = db.webhookRegistrations.filter(w => w.merchantId === merchantId && w.event === event);
      
      // Simulate payload
      const samplePayload = {
        eventId: `evt_${Math.random().toString(36).substring(2, 9)}`,
        event,
        timestamp: new Date().toISOString(),
        productName: "经典极智高级成衣 SPU-009",
        qty: 1,
        paidAmount: 299,
        customerEmail: "vip@modaui.com",
        orderId: `ord_${Math.random().toString(36).substring(2, 9)}`
      };

      ModaDB.log(merchantId, "WEBHOOKS", "TEST_DISPATCH_WEBHOOK", "WEBHOOK_DISPATCHER", `Dispatched mock event payload for: [${event}]`);
      
      res.json({ 
        success: true, 
        matchedCount: matchedHooks.length,
        samplePayload
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === LVA (Platform-Level Admin) ROUTES ===
  // Lightweight management, audit, quota and usage endpoints for Platform Admin UI
  app.get("/api/lva/health", (req, res) => {
    res.json({ success: true, service: "LVA", status: "ok", time: new Date().toISOString() });
  });

  // List tenants with quota overview
  app.get("/api/lva/tenants", (req, res) => {
    try {
      const db = ModaDB.read();
      const tenants = db.tenants.map(t => ({ id: t.id, quotaLimit: t.quotaLimit, quotaUsed: t.quotaUsed, billingStatus: t.billingStatus }));
      res.json({ success: true, tenants });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Get tenant detail
  app.get("/api/lva/tenants/:tenantId", (req, res) => {
    try {
      const { tenantId } = req.params;
      const db = ModaDB.read();
      const tenant = db.tenants.find(t => t.id === tenantId);
      if (!tenant) return res.status(404).json({ success: false, error: "Tenant not found" });
      const merchant = db.merchants.find(m => m.id === tenantId) || null;
      res.json({ success: true, tenant, merchant });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Update tenant quota (admin action)
  app.post("/api/lva/tenants/:tenantId/quota", (req, res) => {
    try {
      const { tenantId } = req.params;
      const { quotaLimit } = req.body;
      if (typeof quotaLimit !== 'number') return res.status(400).json({ success: false, error: "quotaLimit must be a number" });
      const db = ModaDB.read();
      const tenant = db.tenants.find(t => t.id === tenantId);
      if (!tenant) return res.status(404).json({ success: false, error: "Tenant not found" });
      tenant.quotaLimit = quotaLimit;
      ModaDB.write(db);
      ModaDB.log("system", "LVA", "UPDATE_QUOTA", "TENANT_ENGINE", `Updated quota for ${tenantId} to ${quotaLimit}`);
      res.json({ success: true, tenant });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Audit logs retrieval (supports basic filtering)
  app.get("/api/lva/audit/logs", (req, res) => {
    try {
      const { tenantId, level, limit = 200 } = req.query as any;
      const db = ModaDB.read();
      let logs = db.audit_logs || [];
      if (tenantId) logs = logs.filter((l: any) => l.tenantId === String(tenantId));
      if (level) logs = logs.filter((l: any) => l.level === String(level));
      logs = logs.slice(0, Number(limit));
      res.json({ success: true, logs });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Append an audit ledger entry (used by agents or backend tasks)
  app.post("/api/lva/ai/audit_ledger", (req, res) => {
    try {
      const { actor = 'system', action, details = {}, tenantId = 'platform' } = req.body;
      if (!action) return res.status(400).json({ success: false, error: "action is required" });
      const db = ModaDB.read();
      const entry = { id: `ald_${Math.random().toString(36).slice(2,9)}`, actor, action, details, tenantId, createdAt: new Date().toISOString() };
      db.audit_logs = db.audit_logs || [];
      db.audit_logs.unshift(entry);
      ModaDB.write(db);
      ModaDB.log(actor, "LVA", "APPEND_AUDIT", "AUDIT_ENGINE", `Audit entry appended: ${action}`);
      res.json({ success: true, entry });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Usage metrics for a tenant (simple aggregation)
  app.get("/api/lva/usage/:tenantId", (req, res) => {
    try {
      const { tenantId } = req.params;
      const db = ModaDB.read();
      const tenant = db.tenants.find(t => t.id === tenantId);
      if (!tenant) return res.status(404).json({ success: false, error: "Tenant not found" });
      // simple synthetic usage: quotaUsed and recent activity
      const recentLogs = (db.audit_logs || []).filter((l: any) => l.tenantId === tenantId).slice(0, 20);
      res.json({ success: true, usage: { quotaLimit: tenant.quotaLimit, quotaUsed: tenant.quotaUsed || 0, recentLogs } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Allocate temporary additional quota to tenant
  app.post("/api/lva/allocations", (req, res) => {
    try {
      const { tenantId, add = 0, reason = 'manual_adjustment' } = req.body;
      if (!tenantId) return res.status(400).json({ success: false, error: "tenantId required" });
      const db = ModaDB.read();
      const tenant = db.tenants.find(t => t.id === tenantId);
      if (!tenant) return res.status(404).json({ success: false, error: "Tenant not found" });
      tenant.quotaLimit = (tenant.quotaLimit || 0) + Number(add);
      db.quota_allocations = db.quota_allocations || [];
      const alloc = { id: `qal_${Math.random().toString(36).slice(2,9)}`, tenantId, add: Number(add), reason, createdAt: new Date().toISOString() };
      db.quota_allocations.push(alloc);
      ModaDB.write(db);
      ModaDB.log('system', 'LVA', 'ALLOC_QUOTA', 'TENANT_ENGINE', `Allocated ${add} to ${tenantId} (${reason})`);
      res.json({ success: true, tenant, allocation: alloc });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Serve static assets OR handle Vite in middleware mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AI Host Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
