const fs = require('fs');
const path = require('path');

const DB_FILE = path.resolve(__dirname, '../data/modadb.json');

function loadDB(){
  if(!fs.existsSync(DB_FILE)){
    const initial = { tenants: [], merchants: [], audit_logs: [], quota_allocations: [] };
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  try{ return JSON.parse(raw); } catch(e){ const initial = { tenants: [], merchants: [], audit_logs: [], quota_allocations: [] }; fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8'); return initial; }
}

function saveDB(db){ fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8'); }

(async ()=>{
  const db = loadDB();
  console.log('Initial tenants:', db.tenants || []);

  // Create merchant
  const merchantId = 'mer_test_' + Math.random().toString(36).slice(2,8);
  const merchant = { id: merchantId, name: 'SmokeTest Merchant', ownerId: 'owner@smoketest', status: 'active', billingPlan: 'growth', createdAt: new Date().toISOString() };
  db.merchants = db.merchants || [];
  db.merchants.push(merchant);

  // Create tenant entry
  db.tenants = db.tenants || [];
  const tenant = { id: merchantId, quotaLimit: 500, quotaUsed: 0, billingStatus: 'paid', globalSettings: { maintenanceMode: false, allowRegistration: true } };
  db.tenants.push(tenant);

  // Append audit log
  db.audit_logs = db.audit_logs || [];
  const audit = { id: 'ald_'+Math.random().toString(36).slice(2,9), timestamp: new Date().toISOString(), userId: 'system', username: 'system', action: 'SMOKE_TEST_CREATE', component: 'SMOKE', details: `Created tenant ${merchantId}` };
  db.audit_logs.unshift(audit);

  saveDB(db);
  console.log('Created tenant:', tenant);

  // Allocate additional quota
  const add = 1000;
  tenant.quotaLimit = (tenant.quotaLimit||0) + add;
  db.quota_allocations = db.quota_allocations || [];
  const alloc = { id: 'qal_'+Math.random().toString(36).slice(2,9), tenantId: tenant.id, add, reason: 'smoke_test', createdAt: new Date().toISOString() };
  db.quota_allocations.push(alloc);
  saveDB(db);
  console.log('Allocation recorded:', alloc);

  // Query usage
  const usage = { quotaLimit: tenant.quotaLimit, quotaUsed: tenant.quotaUsed || 0, recentLogs: db.audit_logs.slice(0,5) };
  console.log('Usage for', tenant.id, usage);

  process.exit(0);
})();
