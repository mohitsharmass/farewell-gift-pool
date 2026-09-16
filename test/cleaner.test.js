const test = require('node:test');
const assert = require('node:assert');
const DataCleaner = require('../src/dataCleaner.js');
const SettlementEngine = require('../src/settlement.js');

test('DataCleaner: Amount Parsing with Inconsistent Formats', () => {
  assert.strictEqual(DataCleaner.parseAmount('₹1,000'), 1000);
  assert.strictEqual(DataCleaner.parseAmount('Rs. 1,000'), 1000);
  assert.strictEqual(DataCleaner.parseAmount('INR 500'), 500);
  assert.strictEqual(DataCleaner.parseAmount('1k'), 1000);
  assert.strictEqual(DataCleaner.parseAmount('1.5k'), 1500);
  assert.strictEqual(DataCleaner.parseAmount('500/-'), 500);
  assert.strictEqual(DataCleaner.parseAmount(' 250.75 '), 250.75);

  // Invalid amounts
  assert.strictEqual(DataCleaner.parseAmount('-500'), null);
  assert.strictEqual(DataCleaner.parseAmount('pending'), null);
  assert.strictEqual(DataCleaner.parseAmount('N/A'), null);
  assert.strictEqual(DataCleaner.parseAmount(''), null);
});

test('DataCleaner: Name Normalization & Fuzzy Similarity', () => {
  assert.strictEqual(DataCleaner.normalizeName('  alice '), 'Alice');
  assert.strictEqual(DataCleaner.normalizeName('dAvE sMiTh'), 'Dave Smith');

  assert.strictEqual(DataCleaner.areNamesSimilar('Alice', 'alice'), true);
  assert.strictEqual(DataCleaner.areNamesSimilar('Alice', 'Alice S.'), true);
  assert.strictEqual(DataCleaner.areNamesSimilar('Bob', 'bob'), true);
  assert.strictEqual(DataCleaner.areNamesSimilar('Charlie', 'David'), false);
});

test('The Twist: Complete Messy List Ingestion, Deduplication, Merging & Rejection Audit', () => {
  const messyInput = `
# Messy Office Farewell Gift Contribution Log
Alice, ₹1,000, Paid full via UPI
alice, 1000, Paid full via UPI
Alice S., 1k, Extra contribution
Bob, Rs. 500/-, Part payment
BOB, 500, Part payment
Charlie, ₹1,000
Dave, -500, Refund
Eve, pending, Will pay tomorrow
, 500, Anonymous
Corrupt data without amount
Frank, 1000, Paid cash
  `.trim();

  const { cleanedPayments, participants, report } = DataCleaner.cleanAndReconcile(messyInput);

  // Assertions on Audit Report
  assert.strictEqual(report.totalProcessed, 11);
  assert.ok(report.importedCount >= 4, 'Should import valid clean contributions');
  assert.ok(report.deduplicatedCount >= 2, 'Should detect duplicate rows for Alice and Bob');
  assert.ok(report.mergedCount >= 2, 'Should merge casing variations (alice -> Alice, BOB -> Bob)');
  assert.ok(report.rejectedCount >= 4, 'Should reject negative amount, "pending", missing name, and corrupt line');

  // Verify Rejection Reasons
  const rejectedReasons = report.rejected.map(r => r.reason);
  assert.ok(rejectedReasons.some(r => r.includes('Missing or invalid person name')));
  assert.ok(rejectedReasons.some(r => r.includes('Invalid or non-positive amount')));

  // End-to-end integration: Compute correct balances with SettlementEngine
  // Budget ₹6,000 across the cleaned participants
  const summary = SettlementEngine.calculatePoolSummary(6000, participants, cleanedPayments);
  assert.strictEqual(summary.targetBudget, 6000);
  assert.ok(summary.totalCollected > 0, 'Total collected should be calculated from cleaned data');

  const balances = SettlementEngine.calculateMemberBalances(6000, participants, cleanedPayments);
  assert.ok(balances.length > 0, 'Balances should be computed for all cleaned participants');

  const settlements = SettlementEngine.simplifyDebts(balances);
  assert.ok(Array.isArray(settlements), 'Should generate simplified settlement plan');
});
