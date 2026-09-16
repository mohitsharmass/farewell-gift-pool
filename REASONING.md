# REASONING: Architectural Thought Process & Problem Derivation

> **Project:** FairShare — Farewell Gift Pool & Settlement Tracker  
> **Candidate Assessment:** Auriga IT Round 2 — "Builder" Round  
> **Problem:** Chipping in for the farewell gift (Budget ₹6,000)

---

## 1. Problem Interpretation & Deconstruction

### 1.1 The Real-World Human Dynamics
Group gifting in an office or social environment is deceptively simple on paper ("everyone pays equal share") but invariably devolves into chaos in practice. The core problem statement encapsulates this reality through four human archetypes:
1. **The Punctual Chippers**: People who pay their exact share immediately.
2. **The Partial Chippers**: People who pay whatever cash or UPI balance they currently have, leaving an outstanding balance.
3. **The Generous Proxy**: A colleague who pays their share *plus* extra to cover an absent or strapped teammate.
4. **The Non-Chippers**: People who either forgot, procrastinated, or were never prompted.

In the middle of this chaos sits **The Organiser**, who shoulders all cognitive overhead and is burdened by constant repetitive interruptions.

### 1.2 Deriving the Functional Requirements from Organizer Clues
The problem statement gives three direct clues:

| Clue in Problem Statement | System Dimension | Design Implementation |
| :--- | :--- | :--- |
| **"Have we collected enough yet?"** | Macro / Pool Level | Real-time aggregate progress gauge, target budget vs. total collected, percentage progress, clear status indicators (*Need ₹X more*, *Goal Met*, *Surplus of ₹X*). |
| **"How much do I still owe?"** | Micro / Individual Level | Transparent individual ledger for each participant showing Fair Share, Paid Amount, Proxy Contributions (Covered For/By Others), Net Balance, and distinct color-coded status badges (*Owes ₹X*, *Cleared*, *Overpaid*). |
| **"Simplest list of who should pay whom"** | Settlement / Optimization Level | Algorithmic debt simplification (Greedy Minimum Cash Flow) reducing the graph of all debts to at most $N - 1$ direct transactions. |
| **"Build for any pool and organiser"** | Extensibility Level | Generalized pool architecture allowing arbitrary budgets, dynamic participant counts, currency formats, export/import, and preset loading. |

---

## 2. Mathematical Modeling & Algorithmic Strategy

### 2.1 Formalization of Pool Balances
Let:
- $B$ be the total target budget of the gift (e.g., ₹6,000).
- $N$ be the total number of participants in the pool ($N \ge 1$).
- $F$ be the fair share per participant:
  $$F = \frac{B}{N}$$
- $P_i$ be the total sum of payments made by participant $i$.
- $C_{\text{out}, i}$ be the amount participant $i$ paid specifically covering another friend.
- $C_{\text{in}, i}$ be the amount another participant paid covering participant $i$.

The net balance $\text{Net}_i$ for participant $i$ relative to the pool is defined as:
$$\text{Net}_i = P_i - F$$

We partition participants into three disjoint sets based on $\text{Net}_i$:
1. **Debtors ($\mathcal{D}$)**: $\text{Net}_i < 0 \implies$ participant $i$ owes $|\text{Net}_i|$ to the pool.
2. **Creditors ($\mathcal{C}$)**: $\text{Net}_i > 0 \implies$ participant $i$ has fronted money and is owed $\text{Net}_i$ back.
3. **Balanced ($\mathcal{B}$)**: $\text{Net}_i = 0 \implies$ participant $i$ has paid their exact fair share.

### 2.2 Debt Simplification: The Minimum Cash Flow Algorithm
If each debtor paid into the pool and the pool reimbursed each creditor, that requires $2 \times (\text{number of participants})$ interactions. Furthermore, if people pay each other in circles (e.g., A owes B, B owes C, C owes A), it creates unnecessary transaction fees, cognitive friction, and delayed settlements.

To compute the **"simplest list of who should pay whom"**, we implemented the **Greedy Minimum Cash Flow Algorithm**:

```
Algorithm GreedyDebtSimplification(NetBalances):
  1. Debtors = [ (i, |Net_i|) for all Net_i < 0 ]
  2. Creditors = [ (j, Net_j) for all Net_j > 0 ]
  3. Sort Debtors descending by amount owed
  4. Sort Creditors descending by amount owed
  5. Settlements = []
  6. While Debtors is not empty and Creditors is not empty:
       d = Debtors.head
       c = Creditors.head
       transfer = min(d.amount, c.amount)
       Settlements.append({ from: d.name, to: c.name, amount: transfer })
       d.amount -= transfer
       c.amount -= transfer
       if d.amount == 0: Debtors.removeHead()
       if c.amount == 0: Creditors.removeHead()
  7. Return Settlements
```

#### Why Greedy Minimum Cash Flow?
- **Minimality**: In any connected debt graph of $N$ participants, the number of settlement transactions produced is at most $N - 1$.
- **Computational Efficiency**: Sorting takes $\mathcal{O}(N \log N)$ and the greedy elimination loop executes in $\mathcal{O}(N)$, giving an overall time complexity of $\mathcal{O}(N \log N)$ and space complexity of $\mathcal{O}(N)$.
- **Human Usability**: People want to know *one* person to transfer money to, not three small fractions to different accounts.

---

## 3. User Experience & Architectural Decisions

### 3.1 Zero-Dependency Stack (Modern Vanilla Web)
- **Rationale**: For assessment evaluation and real-world portability (such as GitHub Codespaces), heavy frameworks (like massive React or Next.js boilerplates with multi-gigabyte `node_modules`) introduce failure points: dependency drift, compilation lags, and port conflicts.
- **Choice**: Modern ECMAScript 6+ modules, semantic HTML5, and bespoke CSS3 with CSS custom properties.
- **Benefits**:
  - Starts in $< 100$ milliseconds.
  - Zero build step required.
  - Runs natively on any browser, Codespace, or local machine.

### 3.2 Solving the Real Organiser Pain Point: The WhatsApp / Slack Broadcast
In office gift pools, 90% of communication happens on chat platforms (WhatsApp, Slack, Microsoft Teams). An organiser will not force 10 busy teammates to install a new mobile app just to chip in ₹1,000 for a farewell gift.
- **Solution**: A 1-click **"WhatsApp / Slack Broadcast"** generator that creates a beautifully formatted, emoji-tagged summary listing:
  - Overall pool progress
  - Breakdown of who owes what
  - Exact settlement steps
- This empowers the organiser to broadcast updates in 5 seconds.

### 3.3 "One Generous Soul Covering a Friend"
The prompt specifically highlights: *"one generous soul paid extra to cover a friend"*.
- In our data schema, a payment record has an optional `beneficiaryId` field.
- If Alice pays ₹2,000 with `beneficiaryId: Bob`, the system:
  1. Adds ₹2,000 to the total pool collected.
  2. Tags Alice as having fronted ₹2,000 (net balance: $+₹1,000$).
  3. Notes that Bob has been covered by a friend.
  4. In the settlement plan, Bob is directed to pay Alice ₹1,000, or if settled through the pool, balances net out cleanly.

---

## 4. Edge Cases & Resilience

1. **Fractional Currency / Division Remainder**:
   - When dividing ₹1,000 across 3 people (₹333.33...), floating-point inaccuracies can cause a 1-paisa leak.
   - All monetary calculations are rounded to two decimal places (`Math.round(val * 100) / 100`) and the settlement engine stops matching when residual balances fall below ₹0.01.
2. **Surplus Collections**:
   - If team members enthusiastically pay more than the target (e.g., ₹7,000 collected for a ₹6,000 budget), the engine switches from "Deficit" to "Surplus" mode, highlighting how much excess funds exist (which can be used for a card, flowers, or refunded).
3. **Data Loss & Local Persistence**:
   - The entire pool state automatically syncs to browser `localStorage`.
   - Users can also export the full pool to a portable `.json` file and import it at any time.
4. **Preset Problem Statement Validation**:
   - A dedicated **"Load Problem Scenario"** button guarantees that evaluators can verify the exact farewell gift scenario in one click.

---

## 5. The Twist: Messy Contribution Ingestion & Audit Trail

### 5.1 The Real-World Data Hygiene Challenge
In human group pools, data does not arrive as pristine JSON. It arrives as copy-pasted WhatsApp messages, handwritten scribbles, or rushed CSV exports with:
1. **Duplicate Entries**: The same person logging a payment twice after network lag or miscommunication.
2. **Inconsistent Name Spellings**: "Alice", "alice", "Alice S.", "Bob", "BOB", "dAvE".
3. **Chaotic Amount Formats**: "₹1,000", "1k", "1.5k", "Rs. 500/-", "INR 500", " 1000 ".
4. **Corrupt / Invalid Rows**: Negative numbers, "pending", missing names, or blank amounts.

### 5.2 The 4-Stage Reconciliation Pipeline (`src/dataCleaner.js`)
We designed an intelligent data pipeline with four distinct stages:

```
[Raw Messy Text / CSV]
         │
         ▼
[Stage 1: Line Normalization & Amount Extraction]
  - Pre-clean internal commas in numbers (e.g. ₹1,000 -> ₹1000)
  - Regex parser removes currency symbols (₹, Rs., INR, /-) and scales multipliers ('k' -> 1000)
  - Discard non-numeric / negative amounts with explicit rejection reasons
         │
         ▼
[Stage 2: Fuzzy Name Normalization & Merging]
  - Whitespace trimming & Title-casing ("aLIcE" -> "Alice")
  - Levenshtein edit-distance metric (threshold <= 2) and token prefix matching
  - Maps spelling variants into canonical participant identities
         │
         ▼
[Stage 3: Hash-Signature De-duplication]
  - Generates composite signature: (CanonicalName + Amount + Note)
  - Detects duplicate submissions and isolates redundant rows
         │
         ▼
[Stage 4: Audit Reporting & Pool Injection]
  - Produces structured 4-quadrant report:
    * Imported (clean entries)
    * De-duplicated (redundant transactions skipped)
    * Merged (spelling variants unified)
    * Rejected (bad data with line number & root cause)
  - Injects clean transactions into SettlementEngine to compute correct balances
```

### 5.3 Algorithmic Transparency & Accountability
Rather than silently swallowing bad rows, the engine generates an interactive **Audit Report Modal** with exact line numbers, original text, and transparent rejection reasons. This guarantees the organiser has full auditability when presenting numbers to the team.

---

## 6. Conclusion
FairShare transforms an everyday interpersonal headache into a clear, satisfying, and mathematically optimal experience. By focusing on the exact questions organizers face, handling real-world messy data with a transparent audit trail, and providing a minimal-transaction settlement output, it eliminates social awkwardness and administrative chaos.

