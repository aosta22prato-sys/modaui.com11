
import { ModaDB } from '../src/server/db';
import crypto from 'crypto';

async function verifyFinance() {
  console.log('--- Starting Finance Kernel Verification ---');
  
  await ModaDB.init();
  
  const merchantId = 'merchant_finance_test';
  const userId = 'user_finance_test';

  // 1. 初始化账户
  console.log('\n[1] Initializing Company Account...');
  const initialAccount = {
    id: 'acc_' + crypto.randomUUID().slice(0, 8),
    userId: userId,
    merchantId: merchantId,
    balance: 1000,
    currency: 'USD',
    earnings: 0,
    referralBalance: 0,
    status: 'active' as const,
    createdAt: new Date().toISOString()
  };
  ModaDB.saveCompanyAccount(initialAccount);
  console.log(`Account initialized with balance: ${initialAccount.balance} ${initialAccount.currency}`);

  // 2. 模拟收款链接产生交易
  console.log('\n[2] Simulating Income Transaction (via Collection Link)...');
  const incomeTx = {
    id: 'tx_' + crypto.randomUUID().slice(0, 8),
    userId: userId,
    merchantId: merchantId,
    type: 'income' as const,
    amount: 500,
    currency: 'USD',
    status: 'completed' as const,
    description: 'Payment from Collection Link #CL123',
    referenceId: 'CL123',
    createdAt: new Date().toISOString()
  };
  
  // 保存交易
  ModaDB.saveBusinessTransaction(incomeTx);
  
  // 手动更新余额 (在实际业务逻辑中，这应该由 Service 层处理)
  const acc = ModaDB.getCompanyAccountByMerchant(merchantId);
  if (acc) {
    acc.balance += incomeTx.amount;
    ModaDB.saveCompanyAccount(acc);
  }

  // 3. 验证余额更新
  const updatedAcc = ModaDB.getCompanyAccountByMerchant(merchantId);
  console.log(`New Balance: ${updatedAcc?.balance}`);
  if (updatedAcc?.balance === 1500) {
    console.log('✅ PASS: Account balance updated correctly.');
  } else {
    console.log('❌ FAIL: Account balance mismatch.');
  }

  // 4. 验证 AI 会计分析数据源
  console.log('\n[4] Checking AI Finance Analysis Source...');
  const txs = ModaDB.getBusinessTransactions(merchantId);
  console.log(`Found ${txs.length} transactions for analysis.`);
  
  if (txs.length > 0 && txs[0].amount === 500) {
    console.log('✅ PASS: AI Assistant can access transaction data.');
  } else {
    console.log('❌ FAIL: Transaction data not retrievable.');
  }

  // 5. 保存一个模拟的 AI 分析报告
  console.log('\n[5] Saving Mock AI Analysis Report...');
  const analysis = {
    id: 'ana_' + crypto.randomUUID().slice(0, 8),
    merchantId: merchantId,
    agentName: '刘会计',
    reportDate: new Date().toISOString().split('T')[0],
    metrics: {
      revenue: 500,
      expense: 0,
      profit: 500,
      growth: 50
    },
    insights: ['收入增长显著', '主要来源为收款链接'],
    recommendations: ['建议增加促销力度'],
    createdAt: new Date().toISOString()
  };
  ModaDB.saveAiFinanceAnalysis(analysis);
  
  const latestAnalysis = ModaDB.getLatestAiFinanceAnalysis(merchantId);
  if (latestAnalysis && latestAnalysis.agentName === '刘会计') {
    console.log('✅ PASS: AI Finance Analysis saved and retrieved.');
  } else {
    console.log('❌ FAIL: AI Analysis persistence failed.');
  }

  console.log('\n--- Finance Verification Finished ---');
}

verifyFinance().catch(console.error);
