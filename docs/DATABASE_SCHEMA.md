# Database Schema - RBAC Architecture

## Overview

This document describes the scalable Role-Based Access Control (RBAC) database schema for the Evergreen backend application.

## Database Schema Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     users       │       │   user_types    │
├─────────────────┤       ├─────────────────┤
│ id (ObjectId)   │◄──────│ id (ObjectId)   │
│ uuid (String)   │       │ name (String)   │
│ email (String)  │       │ description     │
│ passwordHash    │       │ created_at      │
│ firstName       │       └─────────────────┘
│ lastName        │
│ phoneNumber     │       ┌─────────────────┐
│ profileImage    │       │      roles      │
│ userTypeId      │◄──────├─────────────────┤
│ status          │       │ id (ObjectId)   │
│ emailVerified   │       │ name (String)   │
│ lastLoginAt     │       │ description     │
│ schoolId        │       │ isActive        │
│ created_at      │       │ schoolId        │
│ updated_at      │       │ created_at      │
└─────────────────┘       │ updated_at      │
         │                └─────────────────┘
         │                         │
         │                ┌─────────────────┐
         │                │  user_roles     │
         │                ├─────────────────┤
         │                │ userId          │
         │                │ roleId          │
         │                │ assignedBy      │
         │                │ assignedAt      │
         │                │ expiresAt       │
         │                │ isActive        │
         │                └─────────────────┘
         │                         │
         │                ┌─────────────────┐
         │                │ role_permissions│
         │                ├─────────────────┤
         │                │ roleId          │
         │                │ permissionId    │
         │                │ assignedBy      │
         │                │ assignedAt      │
         │                │ isActive        │
         │                └─────────────────┘
         │                         │
         │                ┌─────────────────┐
         │                │  permissions    │
         │                ├─────────────────┤
         │                │ id (ObjectId)   │
         │                │ name (String)   │
         │                │ description     │
         │                │ resource        │
         │                │ action          │
         │                │ isActive        │
         │                │ created_at      │
         │                │ updated_at      │
         │                └─────────────────┘
         │
┌─────────────────┐
│ refresh_tokens  │
├─────────────────┤
│ id (ObjectId)   │
│ token (String)  │
│ userId          │
│ schoolId        │
│ expiresAt       │
│ isRevoked       │
│ revokedAt       │
│ revokedReason   │
│ userAgent       │
│ ipAddress       │
│ family          │
│ created_at      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│  login_audit    │
├─────────────────┤
│ id (ObjectId)   │
│ userId          │
│ email           │
│ userTypeId      │
│ schoolId        │
│ action          │
│ ipAddress       │
│ userAgent       │
│ success         │
│ failureReason   │
│ sessionId       │
│ tokenFamily     │
│ location        │
│ device          │
│ browser         │
│ os              │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

## Table Definitions

### 1. user_types

Defines different categories of users in the system.

**Fields:**
- `id`: ObjectId (Primary Key)
- `name`: String (Required, Unique, Uppercase) - ADMIN, STAFF, CUSTOMER, PARTNER
- `description`: String (Required, Max 500 chars)
- `created_at`: Date (Auto-generated)
- `updated_at`: Date (Auto-generated)

**Indexes:**
- Unique index on `name`

### 2. users

Main user table with enhanced fields for scalability.

**Fields:**
- `id`: ObjectId (Primary Key)
- `uuid`: String (Required, Unique) - UUID for external references
- `email`: String (Required, Unique, Lowercase)
- `passwordHash`: String (Required, Min 6 chars)
- `firstName`: String (Required, Max 50 chars)
- `lastName`: String (Required, Max 50 chars)
- `phoneNumber`: String (Optional, Phone format)
- `profileImage`: String (Optional, URL)
- `userTypeId`: ObjectId (Foreign Key → user_types.id)
- `status`: String (Required, Enum: ACTIVE, SUSPENDED, DELETED)
- `emailVerified`: Boolean (Default: false)
- `lastLoginAt`: Date (Optional)
- `passwordResetToken`: String (Optional)
- `passwordResetExpires`: Date (Optional)
- `emailVerificationToken`: String (Optional)
- `schoolId`: ObjectId (Optional, Foreign Key → schools.id)
- `created_at`: Date (Auto-generated)
- `updated_at`: Date (Auto-generated)

**Indexes:**
- Unique index on `email`
- Index on `userTypeId`
- Index on `status`
- Index on `uuid`
- Index on `schoolId`
- Index on `created_at` (descending)

### 3. roles

Defines roles that can be assigned to users.

**Fields:**
- `id`: ObjectId (Primary Key)
- `name`: String (Required, Unique, Uppercase) - SUPER_ADMIN, ADMIN, MANAGER, EDITOR, USER
- `description`: String (Required, Max 500 chars)
- `isActive`: Boolean (Default: true)
- `schoolId`: ObjectId (Optional, Foreign Key → schools.id)
- `created_at`: Date (Auto-generated)
- `updated_at`: Date (Auto-generated)

**Indexes:**
- Unique index on `name`
- Index on `schoolId`
- Index on `isActive`

### 4. permissions

Defines granular permissions in the system.

**Fields:**
- `id`: ObjectId (Primary Key)
- `name`: String (Required, Unique, Uppercase) - e.g., CREATE_USER, VIEW_REPORTS
- `description`: String (Required, Max 500 chars)
- `resource`: String (Required, Uppercase) - e.g., USER, ROLE, PERMISSION
- `action`: String (Required, Enum: CREATE, READ, UPDATE, DELETE, MANAGE)
- `isActive`: Boolean (Default: true)
- `created_at`: Date (Auto-generated)
- `updated_at`: Date (Auto-generated)

**Indexes:**
- Unique index on `name`
- Composite index on `resource` and `action`
- Index on `isActive`

### 5. user_roles (Junction Table)

Many-to-many relationship between users and roles.

**Fields:**
- `id`: ObjectId (Primary Key)
- `userId`: ObjectId (Foreign Key → users.id)
- `roleId`: ObjectId (Foreign Key → roles.id)
- `assignedBy`: ObjectId (Foreign Key → users.id)
- `assignedAt`: Date (Default: current date)
- `expiresAt`: Date (Optional - for temporary role assignments)
- `isActive`: Boolean (Default: true)
- `created_at`: Date (Auto-generated)
- `updated_at`: Date (Auto-generated)

**Indexes:**
- Unique composite index on `userId` and `roleId`
- Index on `userId` and `isActive`
- Index on `roleId` and `isActive`
- TTL index on `expiresAt` (auto-cleanup)

### 6. role_permissions (Junction Table)

Many-to-many relationship between roles and permissions.

**Fields:**
- `id`: ObjectId (Primary Key)
- `roleId`: ObjectId (Foreign Key → roles.id)
- `permissionId`: ObjectId (Foreign Key → permissions.id)
- `assignedBy`: ObjectId (Foreign Key → users.id)
- `assignedAt`: Date (Default: current date)
- `isActive`: Boolean (Default: true)
- `created_at`: Date (Auto-generated)
- `updated_at`: Date (Auto-generated)

**Indexes:**
- Unique composite index on `roleId` and `permissionId`
- Index on `roleId` and `isActive`
- Index on `permissionId` and `isActive`

### 7. refresh_tokens

Stores refresh tokens for JWT authentication.

**Fields:**
- `id`: ObjectId (Primary Key)
- `token`: String (Required, Unique)
- `userId`: ObjectId (Foreign Key → users.id)
- `schoolId`: ObjectId (Optional, Foreign Key → schools.id)
- `expiresAt`: Date (Required)
- `isRevoked`: Boolean (Default: false)
- `revokedAt`: Date (Optional)
- `revokedReason`: String (Enum: logout, token_rotation, security, admin_action)
- `userAgent`: String (Optional)
- `ipAddress`: String (Optional)
- `family`: String (Required) - For token rotation detection
- `created_at`: Date (Auto-generated)
- `updated_at`: Date (Auto-generated)

**Indexes:**
- Index on `userId`
- Unique index on `token`
- Index on `family`
- TTL index on `expiresAt` (auto-cleanup)

### 8. login_audit

Tracks login attempts and authentication events.

**Fields:**
- `id`: ObjectId (Primary Key)
- `userId`: ObjectId (Foreign Key → users.id)
- `email`: String (Required)
- `userTypeId`: ObjectId (Foreign Key → user_types.id)
- `schoolId`: ObjectId (Optional, Foreign Key → schools.id)
- `action`: String (Required, Enum: login_success, login_failed, logout, token_refresh, password_reset)
- `ipAddress`: String (Required)
- `userAgent`: String (Optional)
- `success`: Boolean (Required)
- `failureReason`: String (Optional, Enum: invalid_credentials, account_deactivated, account_locked, token_expired, invalid_token)
- `sessionId`: String (Optional)
- `tokenFamily`: String (Optional)
- `location`: Object (Optional - country, city, timezone)
- `device`: String (Enum: desktop, mobile, tablet, unknown)
- `browser`: Object (Optional - name, version)
- `os`: Object (Optional - name, version)
- `created_at`: Date (Auto-generated)
- `updated_at`: Date (Auto-generated)

**Indexes:**
- Composite index on `userId` and `created_at` (descending)
- Composite index on `email` and `created_at` (descending)
- Index on `action` and `created_at` (descending)
- Index on `ipAddress` and `created_at` (descending)
- Index on `success` and `created_at` (descending)
- Index on `schoolId` and `created_at` (descending)
- Index on `userTypeId` and `created_at` (descending)
- TTL index on `created_at` (auto-cleanup after 1 year)

## Relationships

### User Relationships
- `user` → `user_types` (Many-to-One)
- `user` → `user_roles` (One-to-Many)
- `user` → `refresh_tokens` (One-to-Many)
- `user` → `login_audit` (One-to-Many)

### Role Relationships
- `role` → `user_roles` (One-to-Many)
- `role` → `role_permissions` (One-to-Many)

### Permission Relationships
- `permission` → `role_permissions` (One-to-Many)

### Junction Table Relationships
- `user_roles` joins `users` and `roles`
- `role_permissions` joins `roles` and `permissions`

## Data Flow

1. **User Registration**: User created with user type, roles assigned via user_roles
2. **Authentication**: Login attempts logged in login_audit, refresh tokens stored
3. **Authorization**: User permissions derived through user → user_roles → role_permissions → permissions
4. **Role Management**: Roles can be created/updated, permissions assigned via role_permissions
5. **Permission Management**: Granular permissions can be created and assigned to roles

## Security Considerations

1. **Password Security**: Passwords hashed with bcrypt (12 rounds)
2. **Token Security**: JWT access tokens + refresh tokens with rotation
3. **Audit Trail**: All authentication events logged
4. **Soft Deletes**: Users and roles marked as inactive instead of deletion
5. **TTL Indexes**: Automatic cleanup of expired tokens and old audit logs
6. **Input Validation**: All inputs validated at model and API level

## Scalability Features

1. **UUID Support**: Users have UUID for external system integration
2. **Flexible RBAC**: Many-to-many relationships allow complex permission structures
3. **Temporary Roles**: Role assignments can have expiration dates
4. **Multi-tenancy**: SchoolId allows data segregation
5. **Audit Logging**: Comprehensive audit trail for compliance
6. **Index Optimization**: Strategic indexes for query performance

## Migration Strategy

1. **Phase 1**: Create new tables (user_types, permissions, junction tables)
2. **Phase 2**: Migrate existing users to new schema
3. **Phase 3**: Update role assignments to use junction tables
4. **Phase 4**: Populate permissions and role-permission mappings
5. **Phase 5**: Update application code to use new RBAC system
6. **Phase 6**: Remove old role field from users table
