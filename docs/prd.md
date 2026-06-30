# Product Requirement Document (PRD)

## 1. Executive Summary & Goal
The project is a custom Enterprise Resource Planning (ERP) and Customer Relationship Management (CRM) system designed for industrial manufacturing and distribution operations. It supports managing sales leads, customer onboarding, multi-product order booking, multi-vehicle logistics dispatch, automated invoicing, customer payment ledger tracking, and detailed role-based access control (RBAC).

The core objective is to streamline the sales-to-delivery lifecycle, ensure precise financial calculations (including profit margins and GST), track physical goods dispatches across multiple truckloads with different freights, and enforce executive approval controls for rate exceptions and custom freight rates.

---

## 2. Target Personas & Core User Stories

| Persona | Role in the System | Key Objectives |
| :--- | :--- | :--- |
| **Salesperson** | Frontend sales generator | Register leads, convert them to customers, create orders, input estimated product costs (supply, freight, margin), and check dispatch status. |
| **Logistics Executive** | Logistics desk operator | Secures vehicles for orders, manages loaded capacities, requests freight cost exceptions from MD, and marks trips as dispatched or delivered. |
| **Accounts Executive** | Financial operations manager | Views order billing balances, generates invoices, records customer payments against invoices, and tracks outstanding accounts receivables. |
| **Managing Director (MD/CMD)** | Business owner / Approver | Reviews order bookings with custom margins, approves rate overrides, approves individual vehicle freight rates, and holds editing permissions. |
| **Administrator** | Superadmin / System manager | Setup firms, manage roles, create users, inspect system audit logs, and configure base settings. |

---

## 3. Core Modules & Functional Scope

### 3.1. Leads & Customer Management
- Capture lead info: company name, contact person, mobile, email, requirements, and assign to executives.
- Follow up tracking and notes history.
- Convert lead to customer, generating unique customer codes and establishing credit limits/firm mappings.

### 3.2. Order Booking & Pricing
- Multi-product selection from standard catalog.
- Bidirectional price calculations:
  - **Cost-Plus Entry:** Salesperson inputs *Supply Rate* (base cost), *Freight*, *Margin*, and *GST %*. The system auto-calculates the *Selling Price* and *GST Amount*.
  - **Selling Price Entry:** Salesperson inputs final *Selling Price* directly. The system back-calculates the *Margin* based on input *Supply Rate*, *Freight*, and *GST %*.
- Save as draft or submit for approval.

### 3.3. Approval Workflow (MD Overrides)
- Orders with pricing deviations, manual overrides, or specific margins require MD approval before transitioning to active states.
- Normal order edit controls are restricted to the MD/Admin once orders are submitted or approved.
- MD can approve or reject orders with custom notes, logged in the status history timeline.

### 3.4. Multi-Vehicle Dispatch & Capacity Tracking
- For large orders (e.g. 100 tons), dispatches are managed per-vehicle trip.
- Each vehicle trip (Dispatch) captures:
  - Transporter name, vehicle number, driver details, Lorry Receipt (LR) number.
  - Tonnage loaded (capacity loader breakdown per product).
  - Freight cost and loading charges for that specific vehicle.
- **Freight Approval Exception:** If logistics cannot secure a vehicle within the estimated freight rate, they input the actual rate and request **MD Freight Approval**. The trip goes into `FREIGHT_APPROVAL_PENDING` status. The MD reviews and approves/rejects the rate. Once approved, the trip returns to `PLANNED` and can be marked `DISPATCHED` or `DELIVERED`.

### 3.5. Invoices & Payments Ledger
- Auto-generate GST-compliant invoices based on order values or dispatch runs.
- Log payments: transaction date, amount received, reference number, and payment mode (Bank Transfer, Cash, Check).
- Automatically deduct payment amounts from outstanding invoices and calculate real-time accounts receivable balances.

---

## 4. Key Business Rules & Formulas

### 4.1. Bidirectional Pricing Model
For each product row:
1. **Base Cost Rate:**
   $$\text{Base Cost} = \text{Supply Rate} + \text{Freight} + \text{Margin}$$
2. **GST Amount:**
   $$\text{GST Amount} = \text{Base Cost} \times \left(\frac{\text{GST \%}}{100}\right)$$
3. **Selling Price (Rate):**
   $$\text{Rate (Selling Price)} = \text{Base Cost} + \text{GST Amount}$$
4. **Rate Override Back-Calculation:**
   $$\text{Base Cost} = \frac{\text{Rate}}{1 + \frac{\text{GST \%}}{100}}$$
   $$\text{Margin} = \text{Base Cost} - \text{Supply Rate} - \text{Freight}$$

### 4.2. Financial Ledger Calculations
- **Total Billing Value:**
  $$\text{Total Billing Value} = \text{Total Products Value} + \sum(\text{Actual Dispatched Freight}) + \sum(\text{Actual Loading Charges}) + \text{Other Charges}$$
- **Outstanding Balance:**
  $$\text{Outstanding Balance} = \text{Total Billing Value} - \text{Advance Amount} - \sum(\text{Received Invoice Payments})$$
