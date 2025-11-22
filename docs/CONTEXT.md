# Project Title: Secure Medical Lab Test Result Management System

## 1. Executive Summary

This project is a high-security web application designed to manage sensitive patient medical records. The system architecture prioritizes **Confidentiality, Integrity, and Availability (CIA)** by implementing a multi-layered access control model (MAC, DAC, RBAC, RuBAC, ABAC).

**Primary Objective:** To demonstrate advanced computer security concepts including encrypted logging, secure authentication flows, and zero-trust permission logic using **Node.js** and **MongoDB**.

---

## 2. Technology Stack & Tools

| Component          | Technology            | Purpose                                                    |
| :----------------- | :-------------------- | :--------------------------------------------------------- |
| **Runtime**        | Node.js               | Backend logic and middleware handling.                     |
| **Framework**      | Express.js            | API routing and HTTP server.                               |
| **Database**       | MongoDB (Mongoose)    | Flexible schema for storing JSON logs and User attributes. |
| **Authentication** | JWT + Passport.js     | Session management and Token-based auth.                   |
| **Hashing**        | Bcrypt.js             | Secure password hashing with salt.                         |
| **Encryption**     | Node Crypto (AES-256) | Encrypting Audit Logs before storage.                      |
| **MFA**            | Speakeasy + QRCode    | Time-based One-Time Password (TOTP).                       |
| **Validation**     | Express-Rate-Limit    | Preventing Brute Force and DDoS.                           |

---

## 3. Security Architecture (The 5 Layers)

The core of this project is the **Access Control Middleware**. Every request to view a file must pass through these 5 gates:

### 1. RBAC (Role-Based Access Control)

- **Definition:** Permissions based on static roles.
- **Implementation:**
  - **Admin:** Full system access.
  - **Doctor:** Can view assigned patients, create reports.
  - **Lab Tech:** Can upload files, cannot delete.
  - **Patient:** Read-only access to own data.

### 2. RuBAC (Rule-Based Access Control)

- **Definition:** Constraints based on context (Time/Location).
- **Rule:** _Lab Technicians cannot access the upload system between 10:00 PM and 06:00 AM._
- **Logic:** `if (User.role == 'LabTech' && (Hour > 22 || Hour < 6)) return DENY;`

### 3. MAC (Mandatory Access Control)

- **Definition:** System-enforced security clearance levels.
- **Levels:** `0: Public`, `1: Internal`, `2: Confidential`, `3: Top Secret`.
- **Logic:** `if (User.clearanceLevel < File.sensitivityLevel) return DENY;`

### 4. ABAC (Attribute-Based Access Control)

- **Definition:** Fine-grained control based on user attributes.
- **Logic:** `if (File.department == 'Virology' && User.department != 'Virology') return DENY;`

### 5. DAC (Discretionary Access Control)

- **Definition:** Owner-defined sharing.
- **Logic:** The file owner (Doctor) can add a UserID to the file's `sharedWith` array. If a user is in this array, they bypass ABAC checks.

---

## 4. Detailed Feature Breakdown and Implementation Plan

This section breaks down the project features into a step-by-step implementation plan, based on the project instructions.

### **Phase 1: Core Authentication and User Management**

#### **1.1. User Identification and Authentication**

- **User Registration:**
  - Create a secure registration form to collect necessary user information (e.g., name, email, role).
  - Implement email or phone number verification to confirm user identity. A verification token will be sent, which the user must provide to activate their account.
- **Password Authentication:**
  - **Password Policies:** Enforce strong password policies: minimum length (e.g., 12 characters), complexity (uppercase, lowercase, numbers, symbols). Provide clear guidance on the registration page.
  - **Password Hashing:** Use `bcrypt.js` to hash and salt passwords before storing them in the database. This protects against rainbow table attacks.
  - **Secure Password Transmission:** Ensure all communication is over HTTPS to encrypt data in transit.
  - **Password Change:** Implement a secure "change password" feature for authenticated users.
- **Account Lockout:**
  - Implement an account lockout policy after a certain number of failed login attempts (e.g., 5 attempts) to prevent brute-force attacks. The account can be locked for a period of time or require administrator intervention.
- **Bot Prevention:**
  - Integrate a user-friendly CAPTCHA (like Google's reCAPTCHA) on the registration page to prevent automated account creation.

#### **1.2. Token-Based Authentication & Session Management**

- **Token Implementation:**
  - Use JSON Web Tokens (JWT) for authentication. After a successful login, the server will issue a signed JWT to the client.
  - The JWT will contain user information (like user ID and roles) in its payload.
- **Session Management:**
  - The client will send the JWT in the `Authorization` header of subsequent requests.
  - Implement middleware to verify the JWT on protected routes.
  - Set a reasonable expiration time for tokens and implement a refresh token mechanism for better security and user experience.

#### **1.3. Multi-Factor Authentication (MFA)**

- **Implementation:**
  - After username/password authentication, prompt the user for a second factor.
  - Implement Time-based One-Time Passwords (TOTP) using a library like `speakeasy`. Users can set this up with an authenticator app (e.g., Google Authenticator).

### **Phase 2: Access Control Implementation**

#### **2.1. Role-Based Access Control (RBAC)**

- **Role Definition:** Define roles (e.g., Admin, Doctor, Lab Tech, Patient) in the database with associated permissions.
- **Role Assignment:** Develop a mechanism for administrators to assign and modify user roles.
- **Middleware:** Create middleware that checks if a user's role has the required permission for a specific route or action.

#### **2.2. Attribute-Based Access Control (ABAC)**

- **Attribute Definition:** Define user and resource attributes (e.g., user department, resource sensitivity).
- **Policy Engine:** Implement a policy engine that evaluates rules based on these attributes in real-time.
  - _Example Rule:_ `(user.role == 'Manager' && user.department == 'Finance')` can access `resource.type == 'FinancialReport'`.

#### **2.3. Rule-Based Access Control (RuBAC)**

- **Rule Definition:** Define rules based on contextual parameters like time or location.
- **Implementation:** The access control middleware will check these rules.
  - _Example Rule:_ Deny access for users with the 'Lab Tech' role outside of standard working hours (9 AM - 5 PM).

#### **2.4. Mandatory Access Control (MAC)**

- **Data Classification:** Classify data into sensitivity levels (e.g., Public, Internal, Confidential).
- **Security Labels:** Assign security clearance levels to users.
- **Enforcement:** The system will enforce access by comparing the user's clearance with the data's sensitivity level. Only administrators can change these levels.

#### **2.5. Discretionary Access Control (DAC)**

- **Ownership:** Assign an "owner" to each resource (e.g., the doctor who created a patient report).
- **Permission Control:** Allow resource owners to grant or revoke access to other users for specific resources they own.
- **Logging:** Log all permission changes (who granted/revoked access and when).

### **Phase 3: Auditing, Logging, and Data Integrity**

#### **3.1. Audit Trails and Logging**

- **User Activity Logging:** Log all significant user actions (e.g., login, logout, file access, data modification) with details like username, timestamp, and IP address.
- **System Event Logging:** Log critical system events (e.g., startup, shutdown, configuration changes).
- **Log Encryption:** Encrypt log files before storing them to protect their contents.
- **Centralized Logging:** Aggregate logs from all parts of the system into a single, secure location for easier monitoring.
- **Alerting:** Set up alerts for suspicious activities or critical events (e.g., multiple failed login attempts).

#### **3.2. Data Backups**

- **Backup Strategy:** Implement a strategy for regular, automated backups of the database.
- **Recovery Plan:** Define and test a process for restoring data from backups in case of data loss.

---

## 5. Database Schema (MongoDB)

This section outlines the MongoDB schema design, structured to support the project's complex access control requirements.

### **User Collection (`users`)**

Stores user credentials, profile information, and attributes for access control.

```json
{
  "_id": "ObjectId",
  "username": { "type": "String", "required": true, "unique": true },
  "email": { "type": "String", "required": true, "unique": true },
  "password": { "type": "String", "required": true },
  "roles": [{ "type": "ObjectId", "ref": "Role" }],
  "isActive": { "type": "Boolean", "default": false },
  "isLocked": { "type": "Boolean", "default": false },
  "loginAttempts": { "type": "Number", "default": 0 },
  "mfaSecret": { "type": "String" },
  "mfaEnabled": { "type": "Boolean", "default": false },

  "attributes": {
    "department": { "type": "String", "required": true },
    "location": { "type": "String" }
  },

  "clearanceLevel": { "type": "Number", "required": true, "default": 0 },

  "createdAt": { "type": "Date", "default": "Date.now" },
  "updatedAt": { "type": "Date", "default": "Date.now" }
}
```

### **Role Collection (`roles`)**

Defines a set of permissions for each role.

```json
{
  "_id": "ObjectId",
  "name": { "type": "String", "required": true, "unique": true },
  "permissions": [{ "type": "String" }]
}
```

### **TestResult Collection (`test_results`)**

Stores medical test results with associated security and ownership attributes.

```json
{
  "_id": "ObjectId",
  "patientId": { "type": "ObjectId", "ref": "User", "required": true },
  "testName": { "type": "String", "required": true },
  "resultData": { "type": "Object", "required": true },
  "uploadedBy": { "type": "ObjectId", "ref": "User" },

  "sensitivityLevel": { "type": "Number", "required": true, "default": 2 },

  "owner": { "type": "ObjectId", "ref": "User", "required": true },
  "sharedWith": [
    {
      "userId": { "type": "ObjectId", "ref": "User" },
      "permissions": [{ "type": "String", "enum": ["read", "write"] }]
    }
  ],

  "department": { "type": "String", "required": true },

  "createdAt": { "type": "Date", "default": "Date.now" }
}
```

### **AuditLog Collection (`audit_logs`)**

Records all significant user and system activities for security auditing.

```json
{
  "_id": "ObjectId",
  "encryptedData": { "type": "String", "required": true }, // Encrypted log entry
  "iv": { "type": "String", "required": true }, // Initialization Vector for decryption
  "timestamp": { "type": "Date", "default": "Date.now" }
}
```

---

## 6. Optimal Folder Structure

This structure organizes the application by feature, which is a modern and scalable approach for Node.js projects.

```
/medical_lab_management_system
|-- /src
|   |-- /api                 # API routes organized by version
|   |   |-- /v1
|   |   |   |-- auth.routes.js
|   |   |   |-- user.routes.js
|   |   |   |-- test.routes.js
|   |-- /config              # Environment variables and configuration
|   |   |-- index.js
|   |   |-- db.js
|   |-- /controllers         # Request handling logic for each route
|   |   |-- auth.controller.js
|   |   |-- user.controller.js
|   |-- /middleware          # Express middleware
|   |   |-- auth.middleware.js   # (JWT verification)
|   |   |-- rbac.middleware.js
|   |   |-- abac.middleware.js
|   |   |-- mac.middleware.js
|   |   |-- dac.middleware.js
|   |   |-- rubac.middleware.js
|   |   |-- error.handler.js
|   |-- /models              # Mongoose database models
|   |   |-- user.model.js
|   |   |-- role.model.js
|   |   |-- testResult.model.js
|   |   |-- auditLog.model.js
|   |-- /services            # Business logic and external service integrations
|   |   |-- auth.service.js
|   |   |-- log.service.js
|   |   |-- encryption.service.js
|   |-- /utils               # Utility functions
|   |   |-- api.response.js
|   |-- app.js               # Express app setup
|   |-- server.js            # Server entry point
|-- /docs
|   |-- CONTEXT.md
|-- .env                   # Environment variables
|-- .gitignore
|-- package.json
```
