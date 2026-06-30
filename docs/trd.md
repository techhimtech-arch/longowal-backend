# Technical Requirement Document (TRD)

## 1. System Architecture & Tech Stack

The application is structured as a decoupled Single Page Application (SPA) frontend communicating with a RESTful backend API.

```
+------------------+           HTTP REST           +---------------------+
|   React SPA      |  <------------------------->  |   Node/Express API  |
|  Vite + TanStack |    (JSON / Bearer JWT)        |   Mongoose Models   |
+------------------+                               +---------------------+
                                                              |
                                                              v
                                                   +---------------------+
                                                   |    MongoDB Atlas    |
                                                   +---------------------+
```

### 1.1. Frontend Stack
- **Framework:** React 18 / TypeScript
- **Routing:** TanStack Router (Typesafe routes)
- **Data Fetching:** TanStack Query (React Query)
- **Styling:** Vanilla CSS & TailwindCSS (utility directives)
- **HTTP Client:** Axios (with dynamic interceptors for auth refresh)

### 1.2. Backend Stack
- **Runtime:** Node.js (v18+)
- **Web Framework:** Express.js
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Caching & Session:** Redis (optional caching config)
- **Security:** Helmet, CORS validation, Express Rate Limiter, Bcryptjs password hashing

---

## 2. Authentication & Authorization Flow

### 2.1. Dual-Token JWT Strategy
Access to the API requires bearer JSON Web Tokens (JWT). The system uses two types of tokens:
1. **Access Token:** Short-lived token (15 minutes expiry) passed in the `Authorization` header as `Bearer <token>`.
2. **Refresh Token:** Long-lived token (7 days expiry) stored in database and passed to `/auth/refresh-token` to retrieve a new Access Token when expired.

### 2.2. Frontend Axios Interceptor
The frontend implements an Axios response interceptor inside [api.ts](file:///h:/himtech/longowal%20project/longowal/src/lib/api.ts). If an API call fails with `401 Unauthorized` due to token expiration, the interceptor:
1. Queues the failed requests.
2. Calls `/api/v1/auth/refresh-token` to acquire a new access token using the stored refresh token.
3. If successful, updates the token headers and re-executes the queued requests.
4. If refresh fails, clears the auth state and redirects to `/login`.

---

## 3. Role-Based Access Control (RBAC)

### 3.1. Role Normalization Policy
To prevent authentication leakage and bypasses from inconsistent role names across different databases (e.g. "MD" vs "md" vs "Managing Director"), the system enforces strict **Role Normalization** on both frontend and backend.

- **Normalization Formula:**
  Strip all whitespace, hyphens, underscores, and convert to lowercase.
  ```javascript
  const normalizedRole = roleName.toLowerCase().replace(/[\s_-]/g, "");
  ```
- **Examples:**
  - `"Managing Director"` $\rightarrow$ `"managingdirector"`
  - `"Super Admin"` $\rightarrow$ `"superadmin"`
  - `"Accountant"` $\rightarrow$ `"accountant"`

### 3.2. Authorization Guards
- **Backend Middleware:** [auth.middleware.js](file:///h:/himtech/longowal%20project/longowal-backend-1/src/middleware/auth.middleware.js) intercepts routes, validates the JWT, and resolves the user's role from the populated `RoleId` collection.
- **Frontend Guards:** Feeds roles into boolean indicators (`isSuperAdminOrAdmin`, `isMD`, `isAccounts`, `isOperations`) to conditionally render action buttons and restrict route transitions.

---

## 4. API Standards & Error Handling

- **Response Envelope:** All APIs return a consistent envelope format:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Data retrieved successfully",
    "data": { ... }
  }
  ```
- **Error Handling Middleware:** Uncaught exceptions are intercepted by `error.middleware.js`, logged using Winston, and returned as clean JSON envelopes containing error message details rather than exposing stack traces in production.
