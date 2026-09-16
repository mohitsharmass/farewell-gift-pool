/**
 * FairShare - Application Controller & DOM Interaction
 * Handles state, local storage persistence, scenario presets, modals, and rendering.
 */

// Initial Default State matching the exact Problem Statement
const PROBLEM_SCENARIO = {
  title: "Manager's Farewell Gift",
  targetBudget: 6000,
  participants: [
    { id: 'm1', name: 'Alice (Generous Soul)' },
    { id: 'm2', name: 'Bob (Friend Covered)' },
    { id: 'm3', name: 'Charlie (Paid Full)' },
    { id: 'm4', name: 'Dave (Paid Partial)' },
    { id: 'm5', name: 'Eve (Not Paid)' },
    { id: 'm6', name: 'Frank (Not Paid)' }
  ],
  payments: [
    { id: 'p1', payerId: 'm1', amount: 2000, note: 'Covered self and friend Bob', beneficiaryId: 'm2', date: 'Today, 10:30 AM' },
    { id: 'p2', payerId: 'm3', amount: 1000, note: 'Paid full share via UPI', beneficiaryId: null, date: 'Today, 11:15 AM' },
    { id: 'p3', payerId: 'm4', amount: 500, note: 'Partial payment (half)', beneficiaryId: null, date: 'Today, 01:00 PM' }
  ]
};

class App {
  constructor() {
    this.storageKey = 'fairshare_gift_pool_data';
    this.state = this.loadState();
    this.currentFilter = 'all';

    this.cacheDom();
    this.bindEvents();
    this.render();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    // Deep clone problem statement scenario
    return JSON.parse(JSON.stringify(PROBLEM_SCENARIO));
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
    this.render();
  }

  cacheDom() {
    // Theme
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.themeIcon = document.getElementById('themeIcon');

    // Hero / Budget
    this.targetBudgetInput = document.getElementById('targetBudgetInput');
    this.poolTitleDisplay = document.getElementById('poolTitleDisplay');
    this.poolStatusBadge = document.getElementById('poolStatusBadge');
    this.progressBarFill = document.getElementById('progressBarFill');
    this.totalCollectedVal = document.getElementById('totalCollectedVal');
    this.statusMessageVal = document.getElementById('statusMessageVal');
    this.fairShareVal = document.getElementById('fairShareVal');
    this.bannerCollectedStatus = document.getElementById('bannerCollectedStatus');
    this.bannerIcon = document.getElementById('bannerIcon');
    this.bannerCollectedText = document.getElementById('bannerCollectedText');
    this.bannerPeopleText = document.getElementById('bannerPeopleText');

    // Filter Buttons
    this.filterBtns = document.querySelectorAll('.pill-btn');
    this.countAll = document.getElementById('countAll');
    this.countUnpaid = document.getElementById('countUnpaid');
    this.countPartial = document.getElementById('countPartial');
    this.countCleared = document.getElementById('countCleared');

    // Members & Payments
    this.memberList = document.getElementById('memberList');
    this.settlementList = document.getElementById('settlementList');
    this.settlementCountBadge = document.getElementById('settlementCountBadge');
    this.transactionList = document.getElementById('transactionList');
    this.txCountBadge = document.getElementById('txCountBadge');

    // Modals
    this.paymentModal = document.getElementById('paymentModal');
    this.memberModal = document.getElementById('memberModal');
    this.broadcastModal = document.getElementById('broadcastModal');
    this.toast = document.getElementById('toast');

    // Form inputs
    this.paymentForm = document.getElementById('paymentForm');
    this.payerSelect = document.getElementById('payerSelect');
    this.beneficiarySelect = document.getElementById('beneficiarySelect');
    this.paymentAmount = document.getElementById('paymentAmount');
    this.coverFriendCheckbox = document.getElementById('coverFriendCheckbox');
    this.beneficiaryGroup = document.getElementById('beneficiaryGroup');
    this.paymentNote = document.getElementById('paymentNote');
    this.memberForm = document.getElementById('memberForm');
    this.memberNameInput = document.getElementById('memberNameInput');
    this.broadcastText = document.getElementById('broadcastText');

    // Messy Data Importer (The Twist)
    this.messyModal = document.getElementById('messyModal');
    this.openMessyModalBtn = document.getElementById('openMessyModalBtn');
    this.closeMessyModal = document.getElementById('closeMessyModal');
    this.loadSampleMessyBtn = document.getElementById('loadSampleMessyBtn');
    this.messyInputText = document.getElementById('messyInputText');
    this.runReconcileBtn = document.getElementById('runReconcileBtn');
    this.auditReportContainer = document.getElementById('auditReportContainer');
    this.auditImportedCount = document.getElementById('auditImportedCount');
    this.auditDedupCount = document.getElementById('auditDedupCount');
    this.auditMergedCount = document.getElementById('auditMergedCount');
    this.auditRejCount = document.getElementById('auditRejCount');
    this.auditRejectedList = document.getElementById('auditRejectedList');
    this.auditMergedList = document.getElementById('auditMergedList');
    this.auditDedupList = document.getElementById('auditDedupList');
    this.applyCleanedDataBtn = document.getElementById('applyCleanedDataBtn');
    this.lastReconciledResult = null;
  }

  bindEvents() {
    // Theme toggle
    this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

    // Load problem scenario preset
    document.getElementById('loadPresetBtn').addEventListener('click', () => {
      this.state = JSON.parse(JSON.stringify(PROBLEM_SCENARIO));
      this.saveState();
      this.showToast('⚡ Problem scenario loaded!');
    });

    // Target Budget Change
    this.targetBudgetInput.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value) || 0;
      this.state.targetBudget = Math.max(0, val);
      this.saveState();
    });

    // Pool Title Editable
    this.poolTitleDisplay.addEventListener('blur', (e) => {
      this.state.title = e.target.innerText.trim() || "Manager's Farewell Gift";
      this.saveState();
    });

    // Filter clicks
    this.filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.renderMembers();
      });
    });

    // Modals Open/Close
    document.getElementById('recordPaymentBtn').addEventListener('click', () => this.openPaymentModal());
    document.getElementById('closePaymentModal').addEventListener('click', () => this.closePaymentModal());
    document.getElementById('cancelPaymentBtn').addEventListener('click', () => this.closePaymentModal());

    document.getElementById('addMemberBtn').addEventListener('click', () => this.openMemberModal());
    document.getElementById('closeMemberModal').addEventListener('click', () => this.closeMemberModal());
    document.getElementById('cancelMemberBtn').addEventListener('click', () => this.closeMemberModal());

    document.getElementById('broadcastBtn').addEventListener('click', () => this.openBroadcastModal());
    document.getElementById('closeBroadcastModal').addEventListener('click', () => this.closeBroadcastModal());
    document.getElementById('closeBroadcastBtn').addEventListener('click', () => this.closeBroadcastModal());

    // Friend cover checkbox toggle
    this.coverFriendCheckbox.addEventListener('change', (e) => {
      this.beneficiaryGroup.style.display = e.target.checked ? 'block' : 'none';
    });

    // Form Submissions
    this.paymentForm.addEventListener('submit', (e) => this.handlePaymentSubmit(e));
    this.memberForm.addEventListener('submit', (e) => this.handleMemberSubmit(e));

    // Copy Settlement & Broadcast
    document.getElementById('copySettlementBtn').addEventListener('click', () => this.copySettlementPlan());
    document.getElementById('copyBroadcastBtn').addEventListener('click', () => this.copyBroadcast());

    // Messy Data Reconciler (The Twist)
    this.openMessyModalBtn.addEventListener('click', () => this.openMessyModal());
    this.closeMessyModal.addEventListener('click', () => this.closeMessyModalDialog());
    this.loadSampleMessyBtn.addEventListener('click', () => this.loadSampleMessy());
    this.runReconcileBtn.addEventListener('click', () => this.runReconciliation());
    this.applyCleanedDataBtn.addEventListener('click', () => this.applyCleanedData());

    // Export & Import
    document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
    document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
    document.getElementById('importFileInput').addEventListener('change', (e) => this.importData(e));
    document.getElementById('resetPoolBtn').addEventListener('click', () => this.resetPool());
  }

  openMessyModal() {
    this.messyModal.classList.add('active');
  }

  closeMessyModalDialog() {
    this.messyModal.classList.remove('active');
  }

  loadSampleMessy() {
    this.messyInputText.value = [
      '# Messy Office Farewell Contribution Log',
      'Alice, ₹1,000, Paid full via UPI',
      'alice, 1000, Paid full via UPI',
      'Alice S., 1k, Extra contribution',
      'Bob: Rs. 500/- (partial)',
      'BOB, 500, Part payment',
      'Charlie, ₹1,000, Full share',
      'Dave, -500, Refund',
      'Eve, pending, Will pay tomorrow',
      ', 500, Missing name',
      'Corrupt row without amount',
      'Frank, 1000, Paid cash'
    ].join('\n');
    this.showToast('Sample messy contribution log loaded!');
  }

  runReconciliation() {
    const raw = this.messyInputText.value.trim();
    if (!raw) {
      alert('Please paste or load messy contribution data first.');
      return;
    }

    // Call DataCleaner engine
    const result = DataCleaner.cleanAndReconcile(raw, this.state.participants);
    this.lastReconciledResult = result;
    const { report } = result;

    // Display counts
    this.auditImportedCount.innerText = report.importedCount;
    this.auditDedupCount.innerText = report.deduplicatedCount;
    this.auditMergedCount.innerText = report.mergedCount;
    this.auditRejCount.innerText = report.rejectedCount;

    // Populate Rejected List
    this.auditRejectedList.innerHTML = '';
    if (report.rejected.length === 0) {
      this.auditRejectedList.innerHTML = '<li>None — all rows had valid names &amp; amounts!</li>';
    } else {
      report.rejected.forEach(r => {
        const li = document.createElement('li');
        li.innerHTML = `Row ${r.row}: <strong>"${r.raw}"</strong> &mdash; <span class="text-rose">${r.reason}</span>`;
        this.auditRejectedList.appendChild(li);
      });
    }

    // Populate Merged List
    this.auditMergedList.innerHTML = '';
    if (report.merged.length === 0) {
      this.auditMergedList.innerHTML = '<li>None — all names were uniquely distinct!</li>';
    } else {
      report.merged.forEach(m => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>"${m.original}"</strong> &rarr; Merged into <strong>${m.mergedInto}</strong> (${m.reason})`;
        this.auditMergedList.appendChild(li);
      });
    }

    // Populate De-duplicated List
    this.auditDedupList.innerHTML = '';
    if (report.deduplicated.length === 0) {
      this.auditDedupList.innerHTML = '<li>None — no redundant identical payments detected!</li>';
    } else {
      report.deduplicated.forEach(d => {
        const li = document.createElement('li');
        li.innerHTML = `Row ${d.row}: <strong>${d.person}</strong> (₹${d.amount}) &mdash; <span class="text-amber">${d.reason}</span>`;
        this.auditDedupList.appendChild(li);
      });
    }

    this.auditReportContainer.style.display = 'block';
    this.showToast('Reconciliation complete! Review audit report below.');
  }

  applyCleanedData() {
    if (!this.lastReconciledResult) {
      alert('Please run the reconciliation first.');
      return;
    }

    const { cleanedPayments, participants } = this.lastReconciledResult;

    // Update pool participants and append cleaned payments
    this.state.participants = participants;
    this.state.payments = cleanedPayments;
    this.saveState();

    this.closeMessyModalDialog();
    this.showToast(`✅ Loaded ${cleanedPayments.length} clean contributions into pool!`);
  }

  toggleTheme() {
    const isDark = document.body.classList.contains('theme-dark');
    if (isDark) {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      this.themeIcon.innerText = '🌙';
    } else {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      this.themeIcon.innerText = '☀️';
    }
  }

  showToast(message) {
    this.toast.innerText = message;
    this.toast.classList.add('show');
    setTimeout(() => {
      this.toast.classList.remove('show');
    }, 2500);
  }

  openPaymentModal(prefillPayerId = null) {
    this.populatePayerDropdowns();
    if (prefillPayerId) {
      this.payerSelect.value = prefillPayerId;
      // Calculate member balance to prefill remaining owed
      const balances = SettlementEngine.calculateMemberBalances(this.state.targetBudget, this.state.participants, this.state.payments);
      const member = balances.find(b => b.id === prefillPayerId);
      if (member && member.amountOwed > 0) {
        this.paymentAmount.value = member.amountOwed;
      }
    } else {
      this.paymentAmount.value = '';
    }
    this.coverFriendCheckbox.checked = false;
    this.beneficiaryGroup.style.display = 'none';
    this.paymentNote.value = '';
    this.paymentModal.classList.add('active');
  }

  closePaymentModal() {
    this.paymentModal.classList.remove('active');
  }

  openMemberModal() {
    this.memberNameInput.value = '';
    this.memberModal.classList.add('active');
    this.memberNameInput.focus();
  }

  closeMemberModal() {
    this.memberModal.classList.remove('active');
  }

  openBroadcastModal() {
    const summary = SettlementEngine.calculatePoolSummary(this.state.targetBudget, this.state.participants, this.state.payments);
    const balances = SettlementEngine.calculateMemberBalances(this.state.targetBudget, this.state.participants, this.state.payments);
    const settlements = SettlementEngine.simplifyDebts(balances);
    this.broadcastText.value = SettlementEngine.generateShareableSummary(summary, balances, settlements, this.state.title);
    this.broadcastModal.classList.add('active');
  }

  closeBroadcastModal() {
    this.broadcastModal.classList.remove('active');
  }

  populatePayerDropdowns() {
    this.payerSelect.innerHTML = '';
    this.beneficiarySelect.innerHTML = '';

    this.state.participants.forEach(p => {
      const opt1 = document.createElement('option');
      opt1.value = p.id;
      opt1.innerText = p.name;
      this.payerSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = p.id;
      opt2.innerText = p.name;
      this.beneficiarySelect.appendChild(opt2);
    });
  }

  handlePaymentSubmit(e) {
    e.preventDefault();
    const payerId = this.payerSelect.value;
    const amount = parseFloat(this.paymentAmount.value) || 0;
    const isCovering = this.coverFriendCheckbox.checked;
    const beneficiaryId = isCovering ? this.beneficiarySelect.value : null;
    const note = this.paymentNote.value.trim();

    if (amount <= 0) {
      alert('Please enter a valid contribution amount.');
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newPayment = {
      id: 'p_' + Date.now(),
      payerId,
      amount,
      note: note || (isCovering ? 'Covered for friend' : 'Contribution'),
      beneficiaryId,
      date: `Today, ${timeStr}`
    };

    this.state.payments.unshift(newPayment);
    this.saveState();
    this.closePaymentModal();
    this.showToast(`₹${amount.toLocaleString('en-IN')} contribution recorded!`);
  }

  handleMemberSubmit(e) {
    e.preventDefault();
    const name = this.memberNameInput.value.trim();
    if (!name) return;

    const newMember = {
      id: 'm_' + Date.now(),
      name
    };

    this.state.participants.push(newMember);
    this.saveState();
    this.closeMemberModal();
    this.showToast(`Added ${name} to the gift pool!`);
  }

  deleteMember(id) {
    const member = this.state.participants.find(p => p.id === id);
    if (!member) return;
    if (confirm(`Remove ${member.name} from the pool? Existing payments will be retained.`)) {
      this.state.participants = this.state.participants.filter(p => p.id !== id);
      this.saveState();
      this.showToast(`Removed ${member.name}`);
    }
  }

  deletePayment(id) {
    if (confirm('Delete this payment record?')) {
      this.state.payments = this.state.payments.filter(p => p.id !== id);
      this.saveState();
      this.showToast('Payment removed');
    }
  }

  copySettlementPlan() {
    const balances = SettlementEngine.calculateMemberBalances(this.state.targetBudget, this.state.participants, this.state.payments);
    const settlements = SettlementEngine.simplifyDebts(balances);
    if (settlements.length === 0) {
      this.showToast('No outstanding settlements needed!');
      return;
    }
    const text = settlements.map((s, i) => `${i + 1}. ${s.fromName} pays ${s.toName} ₹${s.amount.toLocaleString('en-IN')}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('📋 Settlement plan copied!');
    });
  }

  copyBroadcast() {
    navigator.clipboard.writeText(this.broadcastText.value).then(() => {
      this.showToast('📋 Broadcast copied for WhatsApp/Slack!');
    });
  }

  exportData() {
    const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gift_pool_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('💾 Exported pool data to JSON');
  }

  importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.targetBudget !== undefined && Array.isArray(imported.participants)) {
          this.state = imported;
          this.saveState();
          this.showToast('📂 Pool data restored successfully!');
        } else {
          alert('Invalid file format. Please upload a valid FairShare JSON file.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  resetPool() {
    if (confirm('Are you sure you want to clear this pool and start empty?')) {
      this.state = {
        title: "New Gift Pool",
        targetBudget: 6000,
        participants: [],
        payments: []
      };
      this.saveState();
      this.showToast('Pool reset to blank state');
    }
  }

  render() {
    this.renderHero();
    this.renderMembers();
    this.renderSettlements();
    this.renderTransactions();
  }

  renderHero() {
    const summary = SettlementEngine.calculatePoolSummary(this.state.targetBudget, this.state.participants, this.state.payments);
    
    this.poolTitleDisplay.innerText = this.state.title || "Manager's Farewell Gift";
    this.targetBudgetInput.value = this.state.targetBudget;

    this.totalCollectedVal.innerText = `₹${summary.totalCollected.toLocaleString('en-IN')}`;
    this.fairShareVal.innerText = `₹${summary.fairShare.toLocaleString('en-IN')}`;
    this.statusMessageVal.innerText = summary.statusMessage;

    // Progress Bar
    this.progressBarFill.style.width = `${summary.percentCollected}%`;

    // Status Badge
    this.poolStatusBadge.className = 'pool-badge';
    if (summary.status === 'COMPLETED') {
      this.poolStatusBadge.classList.add('badge-completed');
      this.poolStatusBadge.innerText = '✅ Goal Reached';
      this.bannerCollectedStatus.className = 'clue-banner status-met';
      this.bannerIcon.innerText = '🎉';
      this.bannerCollectedText.innerText = `Yes! All ₹${summary.targetBudget.toLocaleString('en-IN')} has been collected.`;
    } else if (summary.status === 'SURPLUS') {
      this.poolStatusBadge.classList.add('badge-surplus');
      this.poolStatusBadge.innerText = '🌟 Surplus Collected';
      this.bannerCollectedStatus.className = 'clue-banner status-met';
      this.bannerIcon.innerText = '🥳';
      this.bannerCollectedText.innerText = `Yes! Goal exceeded with ₹${summary.surplus.toLocaleString('en-IN')} surplus!`;
    } else {
      this.poolStatusBadge.classList.add('badge-in-progress');
      this.poolStatusBadge.innerText = '⏳ In Progress';
      this.bannerCollectedStatus.className = 'clue-banner status-incomplete';
      this.bannerIcon.innerText = '⚠️';
      this.bannerCollectedText.innerText = `Not yet. Still need ₹${summary.remainingToCollect.toLocaleString('en-IN')} to reach ₹${summary.targetBudget.toLocaleString('en-IN')}.`;
    }

    this.bannerPeopleText.innerText = `${summary.participantCount} members chipping in (₹${summary.fairShare.toLocaleString('en-IN')} each).`;
  }

  renderMembers() {
    const balances = SettlementEngine.calculateMemberBalances(this.state.targetBudget, this.state.participants, this.state.payments);
    
    // Update count pills
    const unpaidList = balances.filter(b => b.status === 'UNPAID');
    const partialList = balances.filter(b => b.status === 'PARTIAL');
    const clearedList = balances.filter(b => b.status === 'SETTLED' || b.status === 'SURPLUS');

    this.countAll.innerText = balances.length;
    this.countUnpaid.innerText = unpaidList.length;
    this.countPartial.innerText = partialList.length;
    this.countCleared.innerText = clearedList.length;

    // Filter
    let filtered = balances;
    if (this.currentFilter === 'unpaid') filtered = unpaidList;
    else if (this.currentFilter === 'partial') filtered = partialList;
    else if (this.currentFilter === 'cleared') filtered = clearedList;

    this.memberList.innerHTML = '';

    if (filtered.length === 0) {
      this.memberList.innerHTML = `
        <div class="empty-state">
          No members in this category. Click <strong>+ Add Member</strong> to include more people.
        </div>
      `;
      return;
    }

    filtered.forEach(m => {
      const initial = m.name.charAt(0).toUpperCase();
      let pillClass = 'pill-settled';
      let pillText = 'Cleared';

      if (m.status === 'UNPAID') {
        pillClass = 'pill-unpaid';
        pillText = `Owes ₹${m.amountOwed.toLocaleString('en-IN')}`;
      } else if (m.status === 'PARTIAL') {
        pillClass = 'pill-partial';
        pillText = `Owes ₹${m.amountOwed.toLocaleString('en-IN')}`;
      } else if (m.status === 'SURPLUS') {
        pillClass = 'pill-surplus';
        pillText = `+₹${m.amountExcess.toLocaleString('en-IN')} Extra`;
      }

      let subNote = `Paid: ₹${m.totalPaid.toLocaleString('en-IN')} / ₹${m.fairShare.toLocaleString('en-IN')}`;
      if (m.coveredForOthers > 0) {
        subNote += ` &bull; 🌟 Covered friend (₹${m.coveredForOthers.toLocaleString('en-IN')})`;
      } else if (m.coveredByOthers > 0) {
        subNote += ` &bull; 🤝 Friend covered share`;
      }

      const card = document.createElement('div');
      card.className = 'member-card';
      card.innerHTML = `
        <div class="member-info">
          <div class="member-avatar">${initial}</div>
          <div>
            <div class="member-name">${m.name}</div>
            <div class="member-subtext">${subNote}</div>
          </div>
        </div>
        <div class="member-financials">
          <span class="member-status-pill ${pillClass}">${pillText}</span>
          <div class="member-actions">
            ${m.amountOwed > 0 ? `<button class="member-quick-pay" data-id="${m.id}">+ Pay ₹${m.amountOwed}</button>` : ''}
            <button class="delete-member-btn" data-id="${m.id}" title="Remove member">&times;</button>
          </div>
        </div>
      `;

      // Event bindings
      const quickPayBtn = card.querySelector('.member-quick-pay');
      if (quickPayBtn) {
        quickPayBtn.addEventListener('click', () => this.openPaymentModal(m.id));
      }

      card.querySelector('.delete-member-btn').addEventListener('click', () => this.deleteMember(m.id));

      this.memberList.appendChild(card);
    });
  }

  renderSettlements() {
    const balances = SettlementEngine.calculateMemberBalances(this.state.targetBudget, this.state.participants, this.state.payments);
    const settlements = SettlementEngine.simplifyDebts(balances);

    this.settlementCountBadge.innerText = `${settlements.length} Transfer${settlements.length === 1 ? '' : 's'} Needed`;
    this.settlementList.innerHTML = '';

    if (settlements.length === 0) {
      this.settlementList.innerHTML = `
        <div class="empty-state">
          ✨ Everyone is settled up! No transfers needed right now.
        </div>
      `;
      return;
    }

    settlements.forEach(s => {
      const item = document.createElement('div');
      item.className = 'settlement-item';
      item.innerHTML = `
        <div class="settlement-flow">
          <div class="settler-name settler-from">🔴 ${s.fromName}</div>
          <div class="flow-arrow">
            <span class="flow-amount">₹${s.amount.toLocaleString('en-IN')}</span>
            <span class="arrow-line">──────►</span>
          </div>
          <div class="settler-name settler-to">🟢 ${s.toName}</div>
        </div>
        <button class="btn btn-xs btn-outline mark-settled-btn" title="Record this settlement as a payment">
          Settle Up
        </button>
      `;

      item.querySelector('.mark-settled-btn').addEventListener('click', () => {
        // Record payment from debtor to creditor
        const newPayment = {
          id: 'p_' + Date.now(),
          payerId: s.fromId,
          amount: s.amount,
          note: `Direct settlement to ${s.toName}`,
          beneficiaryId: null,
          date: 'Just now'
        };
        this.state.payments.unshift(newPayment);
        this.saveState();
        this.showToast(`Recorded settlement: ${s.fromName} paid ${s.toName} ₹${s.amount}!`);
      });

      this.settlementList.appendChild(item);
    });
  }

  renderTransactions() {
    this.txCountBadge.innerText = `${this.state.payments.length} payment${this.state.payments.length === 1 ? '' : 's'}`;
    this.transactionList.innerHTML = '';

    if (this.state.payments.length === 0) {
      this.transactionList.innerHTML = `
        <div class="empty-state">No payments recorded yet.</div>
      `;
      return;
    }

    this.state.payments.forEach(p => {
      const payer = this.state.participants.find(m => m.id === p.payerId);
      const payerName = payer ? payer.name : 'Unknown';
      let beneficiaryText = '';
      if (p.beneficiaryId) {
        const ben = this.state.participants.find(m => m.id === p.beneficiaryId);
        if (ben) {
          beneficiaryText = ` (Covering ${ben.name})`;
        }
      }

      const row = document.createElement('div');
      row.className = 'tx-item';
      row.innerHTML = `
        <div class="tx-details">
          <strong>${payerName}${beneficiaryText}</strong>
          <span>${p.note || 'Contribution'} &bull; ${p.date || 'Recent'}</span>
        </div>
        <div class="tx-amount-del">
          <span class="tx-amount">+₹${p.amount.toLocaleString('en-IN')}</span>
          <button class="tx-del-btn" data-id="${p.id}" title="Delete payment">&times;</button>
        </div>
      `;

      row.querySelector('.tx-del-btn').addEventListener('click', () => this.deletePayment(p.id));
      this.transactionList.appendChild(row);
    });
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
