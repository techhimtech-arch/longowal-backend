# Frontend API Integration Guide

This document outlines the API endpoints, methods, and expected request payloads for the newly built modules in the HP Evergreen project. Frontend developers can use this guide to integrate the UI forms with the backend.

---

## 1. Group Module (Create New Group)
**Endpoint:** `/api/v1/groups`
**Method:** `POST`
**Headers:** `Authorization: Bearer <token>`
**Description:** Use this to submit the "Create New Group" form from the frontend.

### Request Payload (JSON)
```json
{
  "groupName": "Saraswati Mahila Mandal",
  "groupType": "Mahila Mandal",   // Allowed values: 'Mahila Mandal', 'Yuvak Mandal', 'Self Help Group', 'Other'
  "district": "Kangra",
  "panchayat": "Gram Panchayat Name",
  "village": "Village Name",
  "leaderName": "Sita Devi",
  "mobile": "9876543210",         // Must be 10 digits
  "membersCount": 10              // Number
}
```

### Success Response
```json
{
  "success": true,
  "data": {
    "_id": "64f...abc",
    "groupName": "Saraswati Mahila Mandal",
    "...": "..."
  }
}
```

---

## 2. Plant Catalog Module
**Description:** Master data for types of plants/trees available for planting.

### A. Fetch All Plants
**Endpoint:** `/api/v1/plants`
**Method:** `GET`
**Action:** Use this to populate dropdowns (e.g., "Select Plant Species") in the frontend.

### B. Add a New Plant Type
**Endpoint:** `/api/v1/plants`
**Method:** `POST`
**Headers:** `Authorization: Bearer <token>` (Admin Only)

**Request Payload (JSON)**
```json
{
  "name": "Neem",
  "scientificName": "Azadirachta indica",
  "category": "MEDICINAL",        // Allowed values: "FOREST", "FRUIT", "MEDICINAL", "ORNAMENTAL"
  "description": "Fast-growing evergreen tree",
  "image": "https://link-to-image.com/neem.jpg" // Optional
}
```

---

## 3. Tree Registration Module (Log a Planted Tree)
**Endpoint:** `/api/v1/trees`
**Method:** `POST`
**Headers:** `Authorization: Bearer <token>`
**Description:** Use this when a volunteer/user logs that they have planted a new tree (including Geo-tagging and Photos).

> Note: `plantedBy` and `plantedAt` are automatically captured by the backend based on the logged-in user's token.

### Request Payload (JSON)
```json
{
  "plantTypeId": "64fa1b2c...",   // Required: The _id of the Plant selected from the dropdown
  "eventId": "64fb2c3d...",       // Optional: If planted during a specific Plantation Event
  "location": "Near Panchayat Bhawan, Kangra",
  "latitude": 32.0998,            // Captured from GPS/Device
  "longitude": 76.2691,           // Captured from GPS/Device
  "photo": "https://storage-url.com/tree-proof.jpg", // Image URL after uploading to AWS/Cloudinary
  "status": "PLANTED"             // Allowed: "PLANTED", "GROWING", "DEAD" (Defaults to PLANTED)
}
```

### Fetching Registered Trees
**Endpoint:** `/api/v1/trees`
**Method:** `GET`
**Description:** Used to display a list/map of all trees planted. Returns populated data including the planter's name and plant category.

---

## Important Frontend Notes:
1. **Authentication:** All `POST`, `PUT`, and `DELETE` requests require a valid JWT token in the `Authorization` header (`Bearer <token>`).
2. **Error Handling:** Backend always returns standardized error responses. Frontend should catch API errors and display `error.response.data.message`.
