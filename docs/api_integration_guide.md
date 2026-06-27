# Longowal OOMS API Integration Guide for Frontend Developers

Welcome! This guide outlines how to connect your frontend application to the **Longowal Order & Operations Management System (OOMS)** backend.

---

## 1. Global Setup & Authorization

### Base URL
- **Local Development:** `http://localhost:5000/api/v1`
- **Production:** (Replace with your actual deployed backend URL)

### Interactive Swagger Docs
An interactive API sandbox is available locally at:
👉 **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)**
*(Start the backend server and open this in your browser to view all schemas, test requests, and read parameters dynamically!)*

### Headers Requirement
All endpoints (except Login, Register, and Password Reset Requests) require authentication. You must pass a JWT access token in the `Authorization` header:

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <YOUR_ACCESS_TOKEN>",
  "X-Correlation-ID": "<RANDOM_UUID_FOR_LOGGING>" (Optional but recommended for tracing)
}
```

---

## 2. Authentication Flow (Silent Token Refresh)

The backend uses a two-token authentication system:
1. **Access Token (Short-lived):** Sent in headers, expires in 15 minutes.
2. **Refresh Token (Long-lived):** Used to obtain a new Access Token without logging the user out.

### Axios Interceptor Implementation (Highly Recommended)
Rather than checking for expired tokens in every API call manually, set up an Axios Response Interceptor. 

*Hinglish Note:* **Aapko har Component mein 401 error handles lagane ki zarurat nahi hai.** Bas niche diya code ek baar global axios instance mein set kar do.

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach access token automatically to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses to handle 401 Token Expirations silently
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error("No refresh token available");

        // Request a new access token
        const response = await axios.post('http://localhost:5000/api/v1/auth/refresh-token', {
          refreshToken
        });

        const newAccessToken = response.data.data.accessToken;
        const newRefreshToken = response.data.data.refreshToken;

        // Save new credentials
        localStorage.setItem('access_token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }

        // Retry the original failed request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        console.error("Session expired. Logging out...", refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login'; // Redirect to login page
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## 3. Endpoints & Payloads

### 🔑 Authentication Module
Prefix: `/auth`

#### A. User Registration
* **Endpoint:** `POST /auth/register`
* **Payload:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@longowal.com",
  "password": "Password123!",
  "role": "superadmin" // Options: superadmin, school_admin, teacher, accountant, parent, student
}
```

#### B. User Login
* **Endpoint:** `POST /auth/login`
* **Payload:**
```json
{
  "email": "john@longowal.com",
  "password": "Password123!"
}
```
* **Success Response:** Returns `accessToken` and `refreshToken` in `data.tokens`.

#### C. Logout
* **Endpoint:** `POST /auth/logout`
* **Payload:**
```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN_STRING"
}
```

#### D. Get Active Profile
* **Endpoint:** `GET /auth/profile`

#### E. Update Profile
* **Endpoint:** `PUT /auth/profile`
* **Payload:**
```json
{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "email": "john.new@longowal.com"
}
```

---

### 📈 Leads Module
Prefix: `/leads`

#### A. Fetch All Leads (With Filters)
* **Endpoint:** `GET /leads`
* **Query Params:** `?state=Punjab&city=Sangrur&status=New&leadSource=Web&assignedExecutiveId=<USER_ID>`

#### B. Get Specific Lead Details
* **Endpoint:** `GET /leads/:id`

#### C. Create a New Lead
* **Endpoint:** `POST /leads`
* **Payload:**
```json
{
  "companyName": "HimTech Cement Works",
  "contactPerson": "Rakesh Sharma",
  "designation": "Purchase Manager",
  "mobile": "9876543210",
  "alternateMobile": "9812345678",
  "email": "rakesh@himtech.com",
  "gstNumber": "02AAACH1234Z1ZA",
  "industryType": "Construction",
  "feedType": "Bulk",
  "monthlyConsumption": 500, // Number in Tons/Kg
  "productInterest": ["Portland Cement", "Flyash Cement"],
  "estimatedQuantity": 100,
  "address": {
    "line1": "Phase 3, Industrial Area",
    "line2": "Near Gate No. 2",
    "city": "Sangrur",
    "state": "Punjab",
    "country": "India",
    "pincode": "148001"
  },
  "leadSource": "Direct Referral",
  "priority": "High", // Options: Low, Medium, High
  "status": "New" // Options: New, Contacted, Qualified, Converted, Lost
}
```

#### D. Update Lead Details
* **Endpoint:** `PUT /leads/:id`
* **Payload:** Any field of the lead body.

#### E. Add a Followup
* **Endpoint:** `POST /leads/:id/followups`
* **Payload:**
```json
{
  "date": "2026-06-28T10:00:00.000Z",
  "type": "Call", // Options: Call, Meeting, Email
  "outcome": "Interested, asked to call back next week with quotation.",
  "notes": "Discussed bulk volume discounts",
  "nextFollowupDate": "2026-07-05T10:00:00.000Z",
  "status": "Contacted" // Update status of Lead (Optional)
}
```

---

### 👥 Customers Module
Prefix: `/customers`

#### A. Fetch Customers List
* **Endpoint:** `GET /customers`

#### B. Get Customer Details
* **Endpoint:** `GET /customers/:id`

#### C. Add a Customer
* **Endpoint:** `POST /customers`
* **Payload:**
```json
{
  "companyName": "Standard Feed Distributors",
  "gstNumber": "03BBBCH9876Z2ZB",
  "panNumber": "ABCDE1234F",
  "primaryContact": {
    "name": "Amit Patel",
    "mobile": "9876500123",
    "email": "amit@standardfeeds.com"
  },
  "secondaryContact": {
    "name": "Sanjay Singh",
    "mobile": "9887766554",
    "email": "sanjay@standardfeeds.com"
  },
  "billingAddress": {
    "line1": "Shop 12, Grain Market",
    "city": "Barnala",
    "state": "Punjab",
    "pincode": "148101"
  },
  "shippingAddress": {
    "line1": "Warehouse A, Bypass Road",
    "city": "Barnala",
    "state": "Punjab",
    "pincode": "148101"
  },
  "creditLimit": 250000, // maximum credit allowed
  "paymentTerms": "Net 30", // terms, e.g. advance, Net 15, Net 30
  "customerCategory": "Distributor",
  "status": "ACTIVE" // Options: ACTIVE, INACTIVE
}
```

---

### 🏢 Firms Module
Prefix: `/firms`
*(Represents your billing firms/entities)*

#### A. Fetch Active Firms
* **Endpoint:** `GET /firms`

#### B. Create a Firm
* **Endpoint:** `POST /firms`
* **Payload:**
```json
{
  "firmName": "Longowal Industrial Corp",
  "gstNumber": "03CCCDD1111A1ZA",
  "panNumber": "FGHIJ5678K",
  "address": {
    "line1": "Plots 44-46, Focal Point",
    "city": "Sangrur",
    "state": "Punjab",
    "pincode": "148001"
  },
  "bankDetails": {
    "bankName": "State Bank of India",
    "accountNumber": "123456789012",
    "ifscCode": "SBIN0001234",
    "branch": "Main Branch Sangrur"
  },
  "status": "ACTIVE"
}
```

---

### 📦 Orders Module
Prefix: `/orders`

#### A. Fetch Orders List
* **Endpoint:** `GET /orders`

#### B. Get Order by ID
* **Endpoint:** `GET /orders/:id`

#### C. Create a New Order
* **Endpoint:** `POST /orders`
* **Payload:**
```json
{
  "customerId": "64fb2c3d...", // Mongo ID of Customer
  "executionFirmId": "64fc3d4e...", // Mongo ID of Firm
  "salesExecutiveId": "64fd4e5f...", // Mongo ID of User (Sales Exec)
  "products": [
    {
      "productName": "Poultry Feed Mash",
      "quantity": 10,
      "unit": "tons",
      "rate": 22000,
      "total": 220000
    },
    {
      "productName": "Concentrate Feed",
      "quantity": 2,
      "unit": "tons",
      "rate": 35000,
      "total": 70000
    }
  ],
  "deliveryAddress": "Warehouse A, Bypass Road, Barnala, Punjab",
  "dispatchLocation": "Sangrur Factory Gate 1",
  "plantName": "Plant A",
  "requiredDeliveryDate": "2026-07-02T18:00:00.000Z",
  "estimatedFreight": 4500,
  "advanceAmount": 50000,
  "remarks": "Urgent delivery requested by customer",
  "status": "DRAFT" // Options: DRAFT, PENDING_MD_APPROVAL, APPROVED, REJECTED, etc.
}
```

#### D. Update Order Status
* **Endpoint:** `PUT /orders/:id/status`
* **Payload:**
```json
{
  "status": "APPROVED", // One of: DRAFT, PENDING_MD_APPROVAL, APPROVED, REJECTED, LOGISTICS_PENDING, DISPATCH_READY, DELIVERED, etc.
  "remarks": "MD Approved bulk rate exception"
}
```

#### E. Update Order Logistics (Logistics Desk)
* **Endpoint:** `PUT /orders/:id/logistics`
* **Payload:**
```json
{
  "logistics": {
    "transporterName": "Punjab Road Carrier",
    "vehicleNumber": "PB-13-AB-9876",
    "driverName": "Gurnam Singh",
    "driverMobile": "9417012345",
    "freightCost": 4200,
    "loadingCharges": 800,
    "otherCharges": 0,
    "lrNumber": "PRC-998877",
    "dispatchDate": "2026-06-29T08:00:00.000Z",
    "expectedDeliveryDate": "2026-07-01T12:00:00.000Z"
  }
}
```

---

### 🚚 Dispatches Module
Prefix: `/dispatches`

#### A. Record/Log a New Dispatch
* **Endpoint:** `POST /dispatches`
* **Payload:**
```json
{
  "orderId": "64fe5f6a...", // Order ID
  "firmId": "64fc3d4e...", // Firm ID
  "customerId": "64fb2c3d...", // Customer ID
  "transporterName": "Punjab Road Carrier",
  "vehicleNumber": "PB-13-AB-9876",
  "driverName": "Gurnam Singh",
  "driverMobile": "9417012345",
  "lrNumber": "PRC-998877",
  "dispatchDate": "2026-06-29T09:00:00.000Z",
  "expectedDeliveryDate": "2026-07-01T12:00:00.000Z",
  "invoiceUrl": "https://storage.provider.com/invoices/inv-001.pdf", // Uploaded document url
  "lrCopyUrl": "https://storage.provider.com/documents/lr-001.jpg", 
  "status": "DISPATCHED" // Options: PLANNED, DISPATCHED, IN_TRANSIT, DELIVERED
}
```

#### B. Update Dispatch Status (e.g. mark DELIVERED)
* **Endpoint:** `PUT /dispatches/:id/status`
* **Payload:**
```json
{
  "status": "DELIVERED",
  "actualDeliveryDate": "2026-06-30T16:30:00.000Z",
  "podUrl": "https://storage.provider.com/pod/proof-of-delivery.jpg", // Proof of delivery image url
  "remarks": "Received by Amit Patel, no damages."
}
```

---

### 💰 Finance Module
Prefix: `/finance`

#### A. Generate Invoice
* **Endpoint:** `POST /finance/invoices`
* **Payload:**
```json
{
  "invoiceNumber": "INV-2026-001",
  "orderId": "64fe5f6a...",
  "customerId": "64fb2c3d...",
  "firmId": "64fc3d4e...",
  "invoiceDate": "2026-06-29T10:00:00.000Z",
  "dueDate": "2026-07-29T10:00:00.000Z",
  "invoiceAmount": 290000,
  "invoicePdfUrl": "https://storage.provider.com/invoices/inv-001.pdf",
  "status": "GENERATED", // Options: GENERATED, PARTIAL, PAID, OVERDUE, CANCELLED
  "remarks": "Based on Order OR-1002"
}
```

#### B. Record Payment Receipt
* **Endpoint:** `POST /finance/payments`
* **Payload:**
```json
{
  "invoiceId": "64ff6g7h...", // Invoice ID
  "customerId": "64fb2c3d...", // Customer ID
  "amountReceived": 240000,
  "paymentDate": "2026-06-30T11:00:00.000Z",
  "paymentMode": "BANK_TRANSFER", // Options: CASH, BANK_TRANSFER, CHEQUE, UPI, CREDIT_CARD, OTHER
  "referenceNumber": "TXN9988776655",
  "remarks": "Part-payment received via NEFT",
  "status": "SUCCESS" // Options: PENDING, SUCCESS, FAILED, REFUNDED
}
```
*(Note: When a SUCCESS payment is recorded, the backend automatically updates the Invoice's `receivedAmount` & `outstandingAmount`, as well as the Customer's outstanding statistics!)*

---

## 4. Error Responses Format
The API returns a consistent error schema. Always display `error.response.data.message` in toast notifications or form helpers:

```json
{
  "success": false,
  "message": "Validation failed: Mobile number must be a 10-digit number",
  "errors": [
    {
      "field": "mobile",
      "msg": "Please enter a valid 10-digit phone number"
    }
  ]
}
```