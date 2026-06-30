# Development Rules & Coding Standards

This document establishes the code quality guidelines, security practices, and development rules for the project repository.

---

## 1. Role Authorization Rules

### 1.1. Role Normalization Mandate
Developers must NEVER verify role names using exact string comparisons directly against raw database role fields. Role strings can be entered with varying casings or spacing (e.g. "Super Admin" vs "super_admin").
- **Required Normalization Regex:**
  ```javascript
  const normalizedRole = roleName.toLowerCase().replace(/[\s_-]/g, "");
  ```
- **Authorized Role Comparison Enums:**
  - **MD / Management:** `['md', 'cmd', 'managingdirector']`
  - **Superadmin:** `['superadmin']`
  - **Admin:** `['admin', 'superadmin']`
  - **Logistics:** `['logistics', 'operation', 'operations', 'dispatcher']`
  - **Accounts:** `['accounts', 'accountant', 'finance']`

---

## 2. API Design & Security Standards

### 2.1. Envelope Consistency
Every API response must use the standard response utility envelope. Do not send raw values or custom object layouts directly from controllers.
- **Success Responses:**
  ```javascript
  const { sendSuccess } = require('../../utils/response');
  return sendSuccess(res, 200, 'Success message', data);
  ```
- **Error Responses:**
  ```javascript
  const { sendError } = require('../../utils/response');
  return sendError(res, 400, 'Error explanation message');
  ```

### 2.2. JWT Verification and Token Handling
- All access-protected endpoints must include the `authenticate` middleware to check the Bearer token.
- Expired tokens must return `401 Unauthorized` status with validation error keys, trigger client-side Axios retry interceptors, and never throw uncaught 500 exceptions.

### 2.3. Audit History Logging
All status transitions and sensitive actions (order approvals, payment updates, user edits) must write trace logs to `statusHistory` or trigger audit database records using `LoginAudit.js` or `AuditLog.js`.

---

## 3. Frontend Component Standards

### 3.1. TanStack Query Usage
- Do not perform asynchronous `fetch` or direct Axios requests inside React components using `useEffect`. Always delegate data fetching to TanStack Query `useQuery` hooks.
- Operations that modify data (POST, PUT, DELETE) must use `useMutation` hooks and properly invalidate query keys inside `onSuccess` handlers to force real-time updates.

### 3.2. Typesafe URL Parameters
- Ensure route-level state is tracked using router search query params or typesafe route params.
- Always use `Route.useParams()` to fetch URL variables to preserve TypeScript safety.
