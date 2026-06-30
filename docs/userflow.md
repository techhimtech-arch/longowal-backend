# User Flow & Process Diagrams

This document illustrates the step-by-step user journeys and status transitions for core system actions.

---

## 1. Lead Tracking to Customer Conversion Flow

This flow maps how a Salesperson captures customer inquiries and transitions them into permanent billing records.

```mermaid
graph TD
    A[New Inquiry Received] --> B[Create Lead in CRM]
    B --> C[Set Executive Owner & Follow-up Date]
    C --> D[Log Notes / Intermittent Follow-ups]
    D --> E{Interested in Ordering?}
    E -- No --> F[Mark Lead Dead / Cold]
    E -- Yes --> G[Convert Lead to Customer]
    G --> H[Generate Customer Code]
    H --> I[Assign Firm & Credit Limit]
    I --> J[Ready for Order Booking]
```

---

## 2. Order Pricing, Calculations & Approval Flow

This flow covers order creation, bidirectional pricing auto-calculations, and MD approval guards for rate overrides or low-margin transactions.

```mermaid
graph TD
    A[Start Order Creation] --> B[Select Customer & Execution Firm]
    B --> C[Add Products to Catalog Table]
    C --> D{Enter Selling Rate directly?}
    
    D -- Yes (Selling Rate Override) --> E["Back-calculate margin:<br>Margin = Selling Rate - Supply - Freight - GST"]
    D -- No (Cost-Plus Entry) --> F["Calculate Selling Rate:<br>Selling Rate = Supply + Freight + Margin + GST"]
    
    E --> G[Calculate Row Totals & Total Order Value]
    F --> G
    
    G --> H[Input Advance Amount & Estimated Freight]
    H --> I[Save Order as Draft]
    I --> J[Submit for Approval]
    
    J --> K{Requires MD Approval?}
    K -- No --> L[Status: LOGISTICS_PENDING]
    K -- Yes --> M[Status: PENDING_MD_APPROVAL]
    
    M --> N{MD Decides}
    N -- Reject --> O[Status: REJECTED / Return to Draft]
    N -- Approve --> L
```

---

## 3. Multi-Vehicle Logistics & Dispatch Flow

This flow covers physical logistics: planning vehicle dispatches, requesting approvals for freight cost exceptions, shipping, and delivery sync.

```mermaid
graph TD
    A[Order Status: LOGISTICS_PENDING] --> B[Logistics Desk views Order Tonnage]
    B --> C[Click 'Add Vehicle Dispatch']
    C --> D[Enter Transporter, Vehicle & Driver Info]
    D --> E[Specify Product Tons loaded in this Vehicle]
    E --> F[Enter Vehicle Freight Cost]
    
    F --> G{Freight matches Estimated Freight?}
    G -- Yes (Within limits) --> H[Mark Dispatch as PLANNED]
    G -- No (Higher rate) --> I[Mark Dispatch as FREIGHT_APPROVAL_PENDING]
    
    I --> J{MD Reviews Dispatch Freight}
    J -- Rejected --> K[Status: PLANNED / Reset Freight]
    J -- Approved --> L[Set isFreightApproved = true & Status: PLANNED]
    
    H --> M[Click 'Dispatch' on vehicle]
    L --> M
    
    M --> N[Dispatch Status: DISPATCHED / Order Status: SHIPPED]
    N --> O[Click 'Deliver' on vehicle delivery]
    O --> P[Dispatch Status: DELIVERED]
    
    P --> Q{Are ALL dispatches for this Order Delivered?}
    Q -- No --> R[Order Status remains: SHIPPED]
    Q -- Yes --> S[Order Status becomes: DELIVERED]
```

---

## 4. Invoice & Billing Ledger Flow

This flow describes how invoices are auto-generated from orders and how payments are applied against them.

```mermaid
graph TD
    A[Order Status: DISPATCH_READY / SHIPPED] --> B[Accounts Desk views Order]
    B --> C[Click 'Generate Invoice']
    C --> D[Generate PDF & Record Invoice Amount]
    D --> E[Invoice is Pending Payment]
    
    E --> F[Payment Received from Customer]
    F --> G[Record Payment in Ledger]
    G --> H[Select Payment Mode & input Ref #]
    H --> I[Link Payment to Invoice ID]
    I --> J[Update Net Outstanding Receivables Balance]
    J --> K{Invoice Fully Paid?}
    K -- Yes --> L[Invoice Status: PAID]
    K -- No --> M[Invoice Status: PARTIALLY_PAID]
```
