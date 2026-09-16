# FairShare — Farewell Gift Pool & Fair Settlement Platform

> **Auriga IT Round 2 — "Builder" Round Assessment**  
> Problem Statement: *Chipping in for the farewell gift (Budget ₹6,000)*  
> Live Submission Form: [https://forms.gle/eEJNPdbrtr7Stu497](https://forms.gle/eEJNPdbrtr7Stu497)

---

## 📖 Problem Overview

The team is buying a farewell gift for their manager with a target budget of **₹6,000**. Everyone agreed to chip in equally, but in practice it is chaos:
- Some have paid their full share.
- A few paid only part.
- One generous soul paid extra to cover a friend.
- Two people haven’t paid at all.

The organiser is constantly fielding two core questions:
1. **"How much do I still owe?"**
2. **"Have we collected enough yet?"**

At the end, the organiser wants the **simplest list of who should pay whom** so everyone lands on their fair share with the minimum number of transactions.

**FairShare** is built to solve this exact chaos for this farewell gift and any future group pool.

---

## ✨ Key Features & Solutions to Clues

| Organizer Clue / Question | FairShare Solution |
| :--- | :--- |
| **"Have we collected enough yet?"** | **Dynamic Pool Progress Bar & Status Banner**: Instantly calculates total collected (e.g., ₹3,500 / ₹6,000), percentage (58%), and displays unambiguous status: *"Not yet. Still need ₹2,500 to reach goal."* Updates dynamically to *"Goal Reached"* or *"Surplus"* when targets change. |
| **"How much do I still owe?"** | **Individual Financial Cards & Smart Filters**: Real-time breakdown per person showing Fair Share (₹1,000), Amount Paid, Net Balance, and clear color-coded badges (`Owes ₹1,000`, `Owes ₹500`, `All Cleared`, `Overpaid by ₹1,000`). Filter tabs for *Unpaid*, *Partial*, and *Cleared*. |
| **"One generous soul paid extra to cover a friend"** | **Beneficiary / Cover Friend Tracking**: Payments explicitly support marking when one person covers another (e.g., Alice paying ₹2,000 covering herself and friend Bob). Credits are attributed properly and reflected in net balances. |
| **"Simplest list of who should pay whom"** | **Greedy Minimum Cash Flow Algorithm**: Solves the N-person debt simplification problem. Computes the minimal number of peer-to-peer transfers (at most $N - 1$) so members don't pass money in circles. Direct 1-click *"Settle Up"* button records transactions. |
| **Organiser Chaos & Communication** | **1-Click WhatsApp / Slack Broadcast**: Automatically formats a complete status update with pool summary, individual balances, and settlement instructions ready to paste into group chats. |
| **Instant Assessment Testing** | **"Load Problem Scenario" Button**: 1-click pre-loads the exact scenario from the problem statement (Alice covering Bob, Charlie paid full, Dave paid partial, Eve & Frank unpaid). |

---

## 🛠️ Technology Stack

- **Core Engine**: Pure ECMAScript 6+ (`src/settlement.js`), modular and reusable across Node.js and Browser environments.
- **Frontend / UI**: Clean semantic HTML5 and Vanilla CSS3 with luxury glassmorphism, responsive grid layout, and dark/light theme toggle.
- **Persistence**: Browser `localStorage` auto-save with JSON Export and Import capabilities.
- **Server**: Zero-dependency built-in Node.js HTTP server (`server.js`).
- **Testing**: Node.js native test runner (`node:test` and `node:assert`) with zero external test dependencies.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18.0.0 or higher recommended, tested on Node v22.18.0)
- Any modern web browser (Chrome, Edge, Firefox, Safari)

### 1. Running in GitHub Codespaces or Local Machine

Clone the repository (or open in GitHub Codespaces):
```bash
git clone <YOUR_REPO_URL>
cd Auri
```

Start the application:
```bash
npm start
```
*Alternatively, run:*
```bash
node server.js
```
The application will be live at: **http://localhost:3000**

> **Note**: Because FairShare is zero-dependency, you can also run `python -m http.server 3000` or simply double-click `index.html` in any web browser!

---

## 🧪 Automated Testing

Automated test cases test the exact problem statement, full upfront settlement, surplus/over-collection, and WhatsApp broadcast formatting:

```bash
npm test
```

Sample output:
```text
> fairshare-gift-pool-tracker@1.0.0 test
> node --test test/settlement.test.js

TAP version 13
# Subtest: Problem Statement Scenario: ₹6,000 budget with 6 people, partial, covered friend, and unpaid
ok 1 - Problem Statement Scenario: ₹6,000 budget with 6 people, partial, covered friend, and unpaid
# Subtest: Full Settlement: When total payments equal total budget
ok 2 - Full Settlement: When total payments equal total budget
# Subtest: Over-collection / Surplus Scenario
ok 3 - Over-collection / Surplus Scenario
# Subtest: Shareable WhatsApp message generation
ok 4 - Shareable WhatsApp message generation
1..4
# tests 4
# pass 4
# fail 0
```

---

## 📂 Project Structure

```text
├── index.html            # Main responsive web application interface
├── style.css             # Glassmorphic responsive styling & theme variables
├── app.js                # UI controller, state management, modal handlers
├── server.js             # Zero-dependency local development server
├── package.json          # Project metadata and test/start scripts
├── src/
│   └── settlement.js     # Core engine: Fair share math & Greedy Debt Simplification
├── test/
│   └── settlement.test.js# Automated unit tests (Node.js native test runner)
├── README.md             # Project documentation, setup, and instructions
├── REASONING.md          # Architectural thought process, algorithm derivation, UX design
└── AI_LOGS.md            # Complete, unedited AI session logs
```

---

## 🔍 Verification & Debugging

1. **Verify Default Scenario**: On initial load, verify that:
   - Target Budget displays `₹6,000`.
   - 6 participants are listed: Alice, Bob, Charlie, Dave, Eve, Frank.
   - Total collected is `₹3,500` (58%).
   - Status states: *"Not yet. Still need ₹2,500 to reach ₹6,000."*
   - Alice shows `Overpaid by ₹1,000` (Covered friend Bob).
   - Dave shows `Owes ₹500`.
   - Eve & Frank show `Owes ₹1,000`.
2. **Add a Payment**: Click **+ Record Payment**, select Dave, enter `500`, submit. Dave's status updates instantly to `Cleared`.
3. **Trigger Settlement**: Under **Simplest Settlement Plan**, notice how debtor transfers are matched to creditors to settle debts.
4. **Broadcast**: Click **📢 WhatsApp / Slack Update** to preview and copy the formatted broadcast message.

---

## 📝 Submission Checklist

- [x] Public GitHub Repository created.
- [x] `README.md` in root with setup, running, and debugging guide.
- [x] `REASONING.md` in root explaining derivation, algorithms, and trade-offs.
- [x] `AI_LOGS.md` in root with complete unaltered AI interaction transcript.
- [x] Tested in browser and terminal.
