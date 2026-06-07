const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', 'data', 'modadb.json');
function read() {
  if (!fs.existsSync(DB_PATH)) return null;
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function write(data) {
  fs.writeFileSync(DB_PATH + '.tmp', JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(DB_PATH + '.tmp', DB_PATH);
}

function seed() {
  const db = read();
  if (!db) {
    console.error('Database not found at', DB_PATH);
    process.exit(1);
  }

  // Ensure merchants exist
  if (!Array.isArray(db.merchants)) db.merchants = [];
  if (!Array.isArray(db.stores)) db.stores = [];

  const merchants = db.merchants.length ? db.merchants : [
    { id: 'mer_demo_1', name: 'Demo Merchant 1', ownerId: 'owner1@example.com', status: 'active', billingPlan: 'growth', createdAt: new Date().toISOString() },
    { id: 'mer_demo_2', name: 'Demo Merchant 2', ownerId: 'owner2@example.com', status: 'active', billingPlan: 'free', createdAt: new Date().toISOString() }
  ];

  // ensure merchants are present in db.merchants
  for (const m of merchants) {
    if (!db.merchants.find(x => x.id === m.id)) db.merchants.push(m);
  }

  // add a demo Platform Admin user for local testing
  if (!Array.isArray(db.users)) db.users = [];
  if (!db.users.find(u => u.email === 'admin@modaui.local')) {
    const uid = `usr_admin`;
    db.users.push({
      id: uid,
      username: 'platform_admin',
      email: 'admin@modaui.local',
      passwordHash: require('crypto').createHash('sha256').update('adminpass').digest('hex'),
      role: 'Platform Admin',
      verified: true,
      createdAt: new Date().toISOString()
    });
    // create a session for this user
    if (!Array.isArray(db.sessions)) db.sessions = [];
    const sessId = `sess_demo_admin`;
    db.sessions.push({ id: sessId, userId: uid, expiresAt: new Date(Date.now() + 24*60*60*1000).toISOString() });
    console.log('Created demo admin user admin@modaui.local with session ', sessId);
  }

  // create stores if none
  if (db.stores.length === 0) {
    const toCreate = [];
    for (let i = 1; i <= 12; i++) {
      const mid = merchants[i % merchants.length].id;
      toCreate.push({
        id: `sto_${mid}_${i}`,
        merchantId: mid,
        name: `示例店铺 ${i}`,
        domain: `${mid}-store-${i}.modaui.local`,
        branding: { logo: '🏬', colorTheme: 'classic', bannerText: `欢迎来到 示例店铺 ${i}` },
        createdAt: new Date().toISOString()
      });
    }
    db.stores = db.stores.concat(toCreate);
  } else {
    console.log('Stores already exist, skipping creation. Count=', db.stores.length);
  }

  write(db);
  console.log('Seed complete. Stores count now:', db.stores.length);
}

seed();
