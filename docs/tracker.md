# Feature Tracker & Backlog Board

This tracking board outlines completed tasks, active developments, and future roadmap backlogs.

---

## 1. Feature Status Dashboard

| Module | Feature Description | Status | Target Release |
| :--- | :--- | :--- | :--- |
| **Leads & CRM** | Capture sales leads, track follows ups, convert to customer | **Completed** | v1.0.0 |
| **Customer Directory** | Customer list, customer codes, credit limits, firm mapping | **Completed** | v1.0.0 |
| **Order Pricing Math** | Dynamic bidirectional cost & selling rate calculations, GST | **Completed** | v1.1.0 |
| **MD Approval Workflow** | Restrict editing, approve order exceptions & deviations | **Completed** | v1.1.0 |
| **Multi-Vehicle Logistics** | Track dispatches in multiple vehicles, tonnage trackers | **Completed** | v1.2.0 |
| **Vehicle Freight Exception**| Request MD approval for high freight rates per vehicle trip | **Completed** | v1.2.0 |
| **Billing & Invoices** | Invoice generation from orders or dispatch runs | **Completed** | v1.0.0 |
| **Payments Ledger** | Log bank transfer, UPI, check receipts; net dues tracker | **Completed** | v1.0.0 |
| **Audit Logs** | System log tracking for access and data changes | **Completed** | v1.0.0 |
| **Analytics Dashboard** | Revenue, margins, outstanding collections visualizations | *In Progress*| v1.3.0 |
| **SMS/Email Alerts** | Auto-notifying dispatch events and payment receipts | *Backlog* | v1.4.0 |

---

## 2. Kanban Board

### Done (v1.0.0 - v1.2.0)
- [x] **Lead to Customer Conversion:** Basic CRM pipeline setup.
- [x] **GST Calculation System:** Row-level tax calculations in Mongoose save middleware.
- [x] **Bidirectional Pricing Logic:** Frontend rates auto-calculates base rates/margins.
- [x] **MD Role Permissions:** Normalized role parsing so MD users hold order editing rights.
- [x] **Multi-Vehicle Dispatches:** Extended `Dispatch` schemas and built vehicle lists in logistics desk.
- [x] **Tonnage Load Checkers:** Live calculations of loaded vs remaining order weights.
- [x] **Individual Freight Approvals:** MD actions to approve/reject specific dispatch costs.

### In Progress (v1.3.0)
- [ ] **Analytics Overview:** Building cards for Monthly Revenue, Net Margins Earned, and Total Outstanding Accounts Receivables.
- [ ] **Reports Export:** Generating PDF reports of customer ledger and order details.

### Backlog (Future Releases)
- [ ] **Notification Center:** Adding alerts for logistics desk when MD approves freight rate.
- [ ] **Advanced Credit Locks:** Preventing order booking if customer's outstanding balance exceeds their credit limit.
