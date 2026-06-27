# Project Implemented Features & Modules Summary

This document summarizes the features, modules, and infrastructure that have been built for the Evergreen Backend Product so far, based on the current codebase structure.

## 1. Core Infrastructure & Security
- **Express.js Server:** Configured with robust routing and middleware (`src/app.js`, `src/server.js`).
- **Database & Caching:** Database connection management and Redis integration (`src/config/`).
- **Environment Validation:** Strict environment variable validation (`envSchema.js`, `validateEnv.js`).
- **Logging & Auditing:** Comprehensive logging systems and audit trails (`logger.js`, `AuditLog.js`, `LoginAudit.js`, `auditLogger.js`).
- **Security Middleware:** CORS, Rate Limiting, and Error Handling (`error.middleware.js`, `correlation.middleware.js`).

## 2. Authentication & Authorization (RBAC)
- **Authentication:** JWT-based login, password hashing, and refresh token rotation (`auth.service.js`, `jwt.js`, `password.js`).
- **User Management:** Full user lifecycle handling (`User.js`, `users/` module, `userController.js`).
- **Role-Based Access Control (RBAC):** Advanced permission management using Roles, Permissions, and UserTypes (`Role.js`, `Permission.js`, `UserRole.js`, `RolePermission.js`, `rbac.middleware.js`).
- **Action Auditing:** Tracking user logins and specific actions across the platform.

## 3. Evergreen / Plantation Management
This module handles the core environmental and tree-tracking features:
- **Plants & Trees Catalog:** Managing plant species and individual trees (`Plant.js`, `Tree.js`).
- **Plantation Events:** Organizing and tracking tree planting drives (`PlantationEvent.js`).
- **Supply Chain:** Managing plant requests and supplies (`PlantRequest.js`, `PlantSupply.js`).

## 4. Organization & Group Management
- **Organizations:** Multi-tenant or multi-org capabilities (`Organization.js`, `organizations/` module).
- **Groups:** Grouping users or entities (`Group.js`, `groups/` module).
- **Assignments:** Task or role assignments (`Assignment.js`, `assignments/` module).

## 5. Utilities & Tools
- **Swagger Documentation:** API documentation setup (`swagger.js`).
- **CSV Processing:** Services for handling CSV import/export (`csvService.js`).
- **Standardized Responses:** Formatted API and error responses (`apiResponse.js`, `errorResponse.js`).
- **Database Seeding:** Scripts to initialize database, seed auth, core data, and RBAC (`initDatabase.js`, `seedAuth.js`, `seedData.js`, `seedRbac.js`).
- **Testing:** Jest configuration and test setup (`jest.config.cjs`, `test/setup.js`).
