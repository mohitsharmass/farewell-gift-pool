const test = require('node:test');
const assert = require('node:assert');
const SettlementEngine = require('../src/settlement.js');

test('Problem Statement Scenario: ₹6,000 budget with 6 people, partial, covered friend, and unpaid', () => {
  // 6 participants
  const participants = [
    { id: '1', name: 'Alice (Generous Soul)' },
    { id: '2', name: 'Bob (Friend covered by Alice)' },
    { id: '3', name: 'Charlie (Paid full)' },
    { id: '4', name: 'Dave (Paid partial)' },
    { id: '5', name: 'Eve (Unpaid)' },
    { id: '6', name: 'Frank (Unpaid)' }
  ];

  // ₹6,000 budget / 6 = ₹1,000 fair share
  // Alice pays ₹2,000 (covers her 1,000 + Bob's 1,000)
  // Charlie pays ₹1,000
  // Dave pays ₹500
  // Eve pays ₹0
  // Frank pays ₹0
  const payments = [
    { id: 'p1', payerId: '1', amount: 2000, note: 'Alice paid her share and Bob share', beneficiaryId: '2' },
    { id: 'p2', payerId: '3', amount: 1000, note: 'Charlie paid full share' },
    { id: 'p3', payerId: '4', amount: 500, note: 'Dave paid partial' }
  ];

  const summary = SettlementEngine.calculatePoolSummary(6000, participants, payments);
  
  assert.strictEqual(summary.targetBudget, 6000);
  assert.strictEqual(summary.fairShare, 1000);
  assert.strictEqual(summary.totalCollected, 3500);
  assert.strictEqual(summary.remainingToCollect, 2500);
  assert.strictEqual(summary.surplus, 0);
  assert.strictEqual(summary.percentCollected, 58);
  assert.strictEqual(summary.status, 'IN_PROGRESS');

  const balances = SettlementEngine.calculateMemberBalances(6000, participants, payments);
  
  // Alice: Paid 2000, share 1000 => Net +1000 (SURPLUS)
  const alice = balances.find(b => b.id === '1');
  assert.strictEqual(alice.totalPaid, 2000);
  assert.strictEqual(alice.netBalance, 1000);
  assert.strictEqual(alice.status, 'SURPLUS');
  assert.strictEqual(alice.coveredForOthers, 2000);

  // Bob: Paid 0, share 1000 => Net -1000 (UNPAID)
  const bob = balances.find(b => b.id === '2');
  assert.strictEqual(bob.totalPaid, 0);
  assert.strictEqual(bob.netBalance, -1000);
  assert.strictEqual(bob.status, 'UNPAID');
  assert.strictEqual(bob.coveredByOthers, 2000);

  // Charlie: Paid 1000, share 1000 => Net 0 (SETTLED)
  const charlie = balances.find(b => b.id === '3');
  assert.strictEqual(charlie.totalPaid, 1000);
  assert.strictEqual(charlie.netBalance, 0);
  assert.strictEqual(charlie.status, 'SETTLED');

  // Dave: Paid 500, share 1000 => Net -500 (PARTIAL)
  const dave = balances.find(b => b.id === '4');
  assert.strictEqual(dave.totalPaid, 500);
  assert.strictEqual(dave.netBalance, -500);
  assert.strictEqual(dave.status, 'PARTIAL');

  // Eve & Frank: Paid 0, share 1000 => Net -1000 (UNPAID)
  const eve = balances.find(b => b.id === '5');
  assert.strictEqual(eve.netBalance, -1000);
  assert.strictEqual(eve.status, 'UNPAID');

  const frank = balances.find(b => b.id === '6');
  assert.strictEqual(frank.netBalance, -1000);
  assert.strictEqual(frank.status, 'UNPAID');

  // Debt Simplification test
  // Debtors: Bob (-1000), Dave (-500), Eve (-1000), Frank (-1000)
  // Creditor: Alice (+1000)
  // One transaction settles Alice (+1000) with one of the debtors of 1000 (e.g. Bob or Eve)
  const settlements = SettlementEngine.simplifyDebts(balances);
  assert.strictEqual(settlements.length, 1);
  assert.strictEqual(settlements[0].toId, '1'); // Pays Alice
  assert.strictEqual(settlements[0].amount, 1000);
});

test('Full Settlement: When total payments equal total budget', () => {
  const participants = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' }
  ];
  // Budget: 3000 (1000 each)
  // Alice paid 3000 for the entire gift upfront!
  const payments = [
    { id: 'p1', payerId: '1', amount: 3000, note: 'Alice bought the gift upfront' }
  ];

  const summary = SettlementEngine.calculatePoolSummary(3000, participants, payments);
  assert.strictEqual(summary.remainingToCollect, 0);
  assert.strictEqual(summary.status, 'COMPLETED');

  const balances = SettlementEngine.calculateMemberBalances(3000, participants, payments);
  const settlements = SettlementEngine.simplifyDebts(balances);

  // Bob pays Alice 1000, Charlie pays Alice 1000
  assert.strictEqual(settlements.length, 2);
  const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
  assert.strictEqual(totalSettled, 2000);
  settlements.forEach(s => {
    assert.strictEqual(s.toId, '1');
    assert.strictEqual(s.amount, 1000);
  });
});

test('Over-collection / Surplus Scenario', () => {
  const participants = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' }
  ];
  // Budget 1000 (500 each), Alice paid 700, Bob paid 500 => Total 1200
  const payments = [
    { id: 'p1', payerId: '1', amount: 700 },
    { id: 'p2', payerId: '2', amount: 500 }
  ];

  const summary = SettlementEngine.calculatePoolSummary(1000, participants, payments);
  assert.strictEqual(summary.surplus, 200);
  assert.strictEqual(summary.status, 'SURPLUS');
});

test('Shareable WhatsApp message generation', () => {
  const participants = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' }
  ];
  const payments = [{ id: 'p1', payerId: '1', amount: 1000 }];
  const summary = SettlementEngine.calculatePoolSummary(1000, participants, payments);
  const balances = SettlementEngine.calculateMemberBalances(1000, participants, payments);
  const settlements = SettlementEngine.simplifyDebts(balances);
  
  const text = SettlementEngine.generateShareableSummary(summary, balances, settlements, "Manager Farewell Gift");
  assert.match(text, /MANAGER FAREWELL GIFT/);
  assert.match(text, /Budget Target:/);
  assert.match(text, /WHO OWES WHAT:/);
});
