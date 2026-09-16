/**
 * Settlement Engine - Core business logic for Gift Pool & Debt Simplification
 * Handles pool budget tracking, dynamic fair shares, individual balances,
 * and greedy minimal-transaction debt simplification.
 */

class SettlementEngine {
  /**
   * Calculate pool overview statistics.
   * @param {number} targetBudget - The target budget for the pool.
   * @param {Array<{id: string, name: string}>} participants - List of pool participants.
   * @param {Array<{id: string, payerId: string, amount: number, note?: string, beneficiaryId?: string}>} payments - List of recorded payments.
   */
  static calculatePoolSummary(targetBudget, participants, payments) {
    const budget = Number(targetBudget) || 0;
    const count = participants.length;
    const fairShare = count > 0 ? Math.round((budget / count) * 100) / 100 : 0;

    const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const roundedTotal = Math.round(totalCollected * 100) / 100;
    const remainingToCollect = Math.max(0, Math.round((budget - roundedTotal) * 100) / 100);
    const surplus = Math.max(0, Math.round((roundedTotal - budget) * 100) / 100);
    const percentCollected = budget > 0 ? Math.min(100, Math.round((roundedTotal / budget) * 100)) : 100;

    let status = 'IN_PROGRESS';
    let statusMessage = `Need ₹${remainingToCollect.toLocaleString('en-IN')} more to reach goal`;

    if (roundedTotal >= budget && budget > 0) {
      if (surplus > 0) {
        status = 'SURPLUS';
        statusMessage = `Goal reached! Surplus of ₹${surplus.toLocaleString('en-IN')}`;
      } else {
        status = 'COMPLETED';
        statusMessage = 'Goal reached! Exact amount collected';
      }
    } else if (roundedTotal === 0 && budget > 0) {
      status = 'NOT_STARTED';
      statusMessage = `₹0 collected so far out of ₹${budget.toLocaleString('en-IN')}`;
    }

    return {
      targetBudget: budget,
      participantCount: count,
      fairShare,
      totalCollected: roundedTotal,
      remainingToCollect,
      surplus,
      percentCollected,
      status,
      statusMessage
    };
  }

  /**
   * Calculate individual member breakdown ("How much do I still owe?").
   * @param {number} targetBudget - Target pool budget.
   * @param {Array<{id: string, name: string}>} participants - List of participants.
   * @param {Array<{id: string, payerId: string, amount: number, note?: string, beneficiaryId?: string}>} payments - List of payments.
   */
  static calculateMemberBalances(targetBudget, participants, payments) {
    const summary = this.calculatePoolSummary(targetBudget, participants, payments);
    const { fairShare } = summary;

    // Track total paid by each participant
    const paidByMember = {};
    const coveredForOthers = {}; // person A paid specifically on behalf of person B
    const coveredByOthers = {};  // person B was covered by person A

    participants.forEach(p => {
      paidByMember[p.id] = 0;
      coveredForOthers[p.id] = 0;
      coveredByOthers[p.id] = 0;
    });

    payments.forEach(payment => {
      const amount = Number(payment.amount) || 0;
      if (paidByMember[payment.payerId] !== undefined) {
        paidByMember[payment.payerId] += amount;
      }
      if (payment.beneficiaryId && payment.beneficiaryId !== payment.payerId) {
        if (coveredForOthers[payment.payerId] !== undefined) {
          coveredForOthers[payment.payerId] += amount;
        }
        if (coveredByOthers[payment.beneficiaryId] !== undefined) {
          coveredByOthers[payment.beneficiaryId] += amount;
        }
      }
    });

    return participants.map(p => {
      const totalPaid = Math.round((paidByMember[p.id] || 0) * 100) / 100;
      const netBalance = Math.round((totalPaid - fairShare) * 100) / 100;

      let status = 'SETTLED';
      let statusLabel = 'All Cleared';
      let amountOwed = 0;
      let amountExcess = 0;

      if (netBalance < -0.009) {
        amountOwed = Math.abs(netBalance);
        if (totalPaid === 0) {
          status = 'UNPAID';
          statusLabel = `Unpaid (Owes ₹${amountOwed.toLocaleString('en-IN')})`;
        } else {
          status = 'PARTIAL';
          statusLabel = `Partially Paid (Owes ₹${amountOwed.toLocaleString('en-IN')})`;
        }
      } else if (netBalance > 0.009) {
        amountExcess = netBalance;
        status = 'SURPLUS';
        statusLabel = `Overpaid / Reimbursable (+₹${amountExcess.toLocaleString('en-IN')})`;
      }

      return {
        id: p.id,
        name: p.name,
        fairShare,
        totalPaid,
        netBalance,
        status,
        statusLabel,
        amountOwed,
        amountExcess,
        coveredForOthers: Math.round((coveredForOthers[p.id] || 0) * 100) / 100,
        coveredByOthers: Math.round((coveredByOthers[p.id] || 0) * 100) / 100
      };
    });
  }

  /**
   * Computes the simplest list of who should pay whom (Greedy Debt Simplification).
   * Minimizes the number of peer-to-peer transactions to at most N - 1.
   * Works on individual net balances.
   * 
   * @param {Array<{id: string, name: string, netBalance: number}>} memberBalances
   * @returns {Array<{fromId: string, fromName: string, toId: string, toName: string, amount: number}>}
   */
  static simplifyDebts(memberBalances) {
    // Separate into debtors (< 0) and creditors (> 0)
    // Deep clone to avoid mutating input
    const debtors = [];
    const creditors = [];

    memberBalances.forEach(m => {
      const bal = Math.round(m.netBalance * 100) / 100;
      if (bal < -0.009) {
        debtors.push({ id: m.id, name: m.name, amountOwed: Math.abs(bal) });
      } else if (bal > 0.009) {
        creditors.push({ id: m.id, name: m.name, amountOwed: bal });
      }
    });

    // Sort descending by amount for greedy matching
    debtors.sort((a, b) => b.amountOwed - a.amountOwed);
    creditors.sort((a, b) => b.amountOwed - a.amountOwed);

    const settlements = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const settlementAmount = Math.min(debtor.amountOwed, creditor.amountOwed);
      const roundedAmount = Math.round(settlementAmount * 100) / 100;

      if (roundedAmount > 0) {
        settlements.push({
          fromId: debtor.id,
          fromName: debtor.name,
          toId: creditor.id,
          toName: creditor.name,
          amount: roundedAmount,
          formatted: `${debtor.name} pays ${creditor.name} ₹${roundedAmount.toLocaleString('en-IN')}`
        });
      }

      debtor.amountOwed = Math.round((debtor.amountOwed - settlementAmount) * 100) / 100;
      creditor.amountOwed = Math.round((creditor.amountOwed - settlementAmount) * 100) / 100;

      if (debtor.amountOwed <= 0.009) {
        dIdx++;
      }
      if (creditor.amountOwed <= 0.009) {
        cIdx++;
      }
    }

    return settlements;
  }

  /**
   * Generates a ready-to-send WhatsApp / Slack broadcast message for the organiser.
   * @param {Object} poolSummary
   * @param {Array} memberBalances
   * @param {Array} settlements
   * @param {string} poolTitle
   */
  static generateShareableSummary(poolSummary, memberBalances, settlements, poolTitle = "Farewell Gift Pool") {
    let msg = `🎁 *${poolTitle.toUpperCase()} - STATUS UPDATE*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🎯 *Budget Target:* ₹${poolSummary.targetBudget.toLocaleString('en-IN')}\n`;
    msg += `💰 *Total Collected:* ₹${poolSummary.totalCollected.toLocaleString('en-IN')} (${poolSummary.percentCollected}%)\n`;
    
    if (poolSummary.remainingToCollect > 0) {
      msg += `⏳ *Still Needed:* ₹${poolSummary.remainingToCollect.toLocaleString('en-IN')}\n`;
    } else if (poolSummary.surplus > 0) {
      msg += `🎉 *Surplus Collected:* ₹${poolSummary.surplus.toLocaleString('en-IN')}\n`;
    } else {
      msg += `✅ *Target Fully Reached!*\n`;
    }
    msg += `👥 *Fair Share Per Person:* ₹${poolSummary.fairShare.toLocaleString('en-IN')}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `📊 *WHO OWES WHAT:*\n`;
    memberBalances.forEach(m => {
      if (m.status === 'SETTLED') {
        msg += `• *${m.name}*: Paid ₹${m.totalPaid.toLocaleString('en-IN')} (✅ Cleared)\n`;
      } else if (m.status === 'SURPLUS') {
        msg += `• *${m.name}*: Paid ₹${m.totalPaid.toLocaleString('en-IN')} (🌟 Overpaid by ₹${m.amountExcess.toLocaleString('en-IN')})\n`;
      } else if (m.status === 'PARTIAL') {
        msg += `• *${m.name}*: Paid ₹${m.totalPaid.toLocaleString('en-IN')} (⚠️ Owes ₹${m.amountOwed.toLocaleString('en-IN')})\n`;
      } else {
        msg += `• *${m.name}*: Paid ₹0 (❌ Owes ₹${m.amountOwed.toLocaleString('en-IN')})\n`;
      }
    });

    if (settlements.length > 0) {
      msg += `\n🤝 *SIMPLEST SETTLEMENT PLAN:*\n`;
      settlements.forEach((s, idx) => {
        msg += `${idx + 1}. *${s.fromName}* ➡️ *${s.toName}*: ₹${s.amount.toLocaleString('en-IN')}\n`;
      });
    }

    msg += `\n_Generated via Farewell Gift Pool Tracker_ 🚀`;
    return msg;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettlementEngine;
}
