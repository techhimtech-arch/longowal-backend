# Implementation Guide & Developer Reference

This document provides developers with a structured overview of the codebase organization, implementation specifics, and key patterns.

---

## 1. Directory Structure

### 1.1. Backend (`longowal-backend-1`)
```
├── src
│   ├── config          # Environment validation, database & logging configs
│   ├── controllers     # Legacy/Template controller code
│   ├── middleware      # Error handler, JWT authentication, validation parser
│   ├── models          # Mongoose Database schemas (Order, Dispatch, User, etc.)
│   ├── modules         # Modular API resources
│   │   ├── auth        # Login, registration, token refresh APIs
│   │   ├── dispatches  # Vehicle dispatches, status sync, freight approvals
│   │   ├── orders      # Order pricing, MD approval overrides
│   │   └── ...         
│   ├── routes          # API routing declarations
│   ├── utils           # API response helpers, JWT generators, passwords
│   ├── app.js          # Express app initialization & middleware configuration
│   └── server.js       # App listener and MongoDB Atlas database connection
```

### 1.2. Frontend (`longowal`)
```
├── src
│   ├── components      # Global UI components (Dialogs, Tables, Inputs)
│   ├── lib             # Authentication store, global Axios API configuration
│   ├── routes          # File-based TanStack Router pages
│   │   ├── _layout     # Protected application layout wrap
│   │   │   ├── orders
│   │   │   │   ├── $orderId   # Order details, Logistics trips, payments
│   │   │   │   ├── new.tsx    # Order creation, bidirectional pricing table
│   │   │   │   └── index.tsx  # Order listing page
│   │   │   └── ...
│   │   └── __root.tsx  # Router root component, providers setup
│   ├── routeTree.gen.ts # Auto-generated typesafe routes config
│   └── styles.css      # TailwindCSS and custom CSS design tokens
```

---

## 2. Key Backend Implementation Patterns

### 2.1. Dynamic Pricing Calculations in pre-save hook
The `pre-save` hook in `models/Order.js` intercepts order creation/updates to calculate row totals and ensure pricing integrity at the database level:

```javascript
orderSchema.pre('save', function(next) {
  if (this.products && this.products.length > 0) {
    this.products.forEach(product => {
      // Skip logic if detail fields are missing (backward compatibility)
      if (product.supplyRate === undefined) return;
      
      const supplyRate = product.supplyRate || 0;
      const freight = product.freight || 0;
      const margin = product.margin || 0;
      const gstPercent = product.gstPercent || 0;
      
      // Calculate Base Rate and GST Amount
      const baseRate = supplyRate + freight + margin;
      const gstAmount = baseRate * (gstPercent / 100);
      
      // Update fields
      product.gstAmount = Number(gstAmount.toFixed(2));
      product.rate = Number((baseRate + gstAmount).toFixed(2));
      product.total = Number((product.quantity * product.rate).toFixed(2));
    });
    
    // Recalculate order total
    this.totalOrderValue = this.products.reduce((acc, p) => acc + (p.total || 0), 0);
    this.balanceAmount = this.totalOrderValue - (this.advanceAmount || 0);
  }
  next();
});
```

### 2.2. Modular Route Setup
Routes are mounted inside `routes/index.js` which loads module sub-routers.
Example for dispatches route setup:
```javascript
// routes/index.js
router.use('/dispatches', require('../modules/dispatches/dispatches.routes'));
```

---

## 3. Key Frontend Implementation Patterns

### 3.1. TanStack Query (React Query) Integration
All data requests are managed via React Query for automatic caching and re-validation.
Example query inside [index.tsx](file:///h:/himtech/longowal%20project/longowal/src/routes/_layout/orders/$orderId/index.tsx):
```typescript
const { data: dispatchesResponse, isLoading: isLoadingDispatches } = useQuery({
  queryKey: ["dispatches", orderId],
  queryFn: async () => {
    const res = await api.get(`/dispatches?orderId=${orderId}`);
    return res.data;
  },
  enabled: !!orderId,
});
```

### 3.2. Typesafe Route Parameters
Route parameters are parsed using TanStack Router hooks:
```typescript
const { orderId } = Route.useParams();
```
This guarantees compile-time check validation of URL parameter references.
