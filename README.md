# Case Ledger — Backend API

> REST API for the Human Rights Case Tracking System, built with Node.js, Express, and MongoDB.

**Classification: Public-SLIIT**

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Authentication](#authentication)
- [User Roles](#user-roles)
- [API Endpoint Documentation](#api-endpoint-documentation)
  - [Auth](#auth)
  - [Users](#users)
  - [Cases](#cases)
  - [Case Progress](#case-progress)
  - [Evidence](#evidence)
  - [Reports & Analytics](#reports--analytics)
- [Error Handling](#error-handling)

---

## Tech Stack

| Layer            | Technology             |
| ---------------- | ---------------------- |
| Runtime          | Node.js (ESM)          |
| Framework        | Express 5              |
| Database         | MongoDB via Mongoose 9 |
| Auth             | JWT (jsonwebtoken)     |
| Validation       | Celebrate / Joi        |
| File Uploads     | Multer + Cloudinary    |
| Password Hashing | bcryptjs               |
| Dev Server       | Nodemon                |
| Package Manager  | pnpm                   |

---

## Setup Instructions

### Prerequisites

- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **pnpm** v10+ — install with `npm install -g pnpm`
- **MongoDB Atlas** account (or a local MongoDB instance)
- **Cloudinary** account (for evidence file uploads)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd case-ledger-be
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) for the full list of required values.

### 4. Run the Development Server

```bash
pnpm run dev
```

The server starts on **`http://localhost:8080`** by default.
The API base URL is: **`http://localhost:8080/api/v1`**

### 5. Run in Production

```bash
pnpm start
```

---

## Environment Variables

Create a `.env` file in the project root with the following keys:

```env
# Server
PORT=8080
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Cloudinary (for evidence file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Project Structure

```
src/
├── config/          # App and Cloudinary configuration
├── controllers/     # Route handlers (thin layer, delegates to services)
├── database/        # MongoDB connection
├── middleware/       # Auth (JWT verify + role authorize), error, upload
├── models/          # Mongoose schemas (User, Case, CaseProgress, Evidence, Report)
├── repository/      # Data access layer (all DB queries live here)
├── routes/          # Express routers
├── services/        # Business logic layer
├── utils/           # NIC validation, password helpers
└── validations/     # Celebrate/Joi request schemas
```

---

## Authentication

All protected endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Tokens are obtained from the **Login** or **Register** endpoints and expire based on the `JWT_EXPIRES_IN` config value (default: 7 days).

---

## User Roles

| Role           | Description                                                               |
| -------------- | ------------------------------------------------------------------------- |
| `ADMIN`        | Full system access — manage users, cases, assignments, reports            |
| `NGO`          | Can create cases, assign investigators to their own cases, view own cases |
| `INVESTIGATOR` | Can view & update assigned cases, upload evidence, log progress           |

---

## API Endpoint Documentation

**Base URL:** `http://localhost:8080/api/v1`

---

### Auth

> **Public endpoints — no authentication required.**

#### `POST /auth/register`

Register a new user account.

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "role": "NGO",
  "phoneNumber": "0771234567",
  "organizationName": "Rights Watch LK"
}
```

| Field              | Type   | Required                    | Notes                                                  |
| ------------------ | ------ | --------------------------- | ------------------------------------------------------ |
| `name`             | string | ✅                          |                                                        |
| `email`            | string | ✅                          | Must be a valid email                                  |
| `password`         | string | ✅                          | Min 6 characters                                       |
| `role`             | string | ❌                          | `ADMIN`, `INVESTIGATOR`, or `NGO`. Defaults to `NGO`   |
| `phoneNumber`      | string | ❌                          | 10-digit number                                        |
| `organizationName` | string | Required for `NGO`          |                                                        |
| `nic`              | string | Required for `INVESTIGATOR` | Old format: `123456789V` or new format: `200012345678` |
| `dob`              | date   | Required for `INVESTIGATOR` | Must be in the past                                    |

**Response `201`:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "NGO"
    },
    "token": "<jwt_token>"
  }
}
```

---

#### `POST /auth/login`

Authenticate and receive a JWT token.

**Request Body:**

```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id": "...", "name": "Jane Doe", "role": "NGO" },
    "token": "<jwt_token>"
  }
}
```

---

### Users

> **All routes require authentication (`Bearer <token>`).**

#### `GET /users`

Get all users. **ADMIN only.**

**Response `200`:**

```json
{
  "success": true,
  "data": { "users": [{ "_id": "...", "name": "...", "role": "..." }] }
}
```

---

#### `GET /users/:id`

Get a user by ID. **ADMIN or the user themselves.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "...", "email": "...", "role": "..." }
  }
}
```

---

#### `PUT /users/:id`

Update a user's profile. **ADMIN or the user themselves.**

**Request Body** (all fields optional):

```json
{
  "name": "Jane Updated",
  "phoneNumber": "0779876543",
  "organizationName": "New Org Name"
}
```

---

#### `PUT /users/:id/role`

Update a user's role. **ADMIN only.**

**Request Body:**

```json
{
  "role": "INVESTIGATOR"
}
```

---

#### `DELETE /users/:id`

Soft-delete (deactivate) a user. **ADMIN only.**

**Response `200`:**

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### Cases

> **All routes require authentication.**

#### `POST /cases`

Create a new case. **NGO only.**

**Request Body:**

```json
{
  "title": "Unlawful Detention in Colombo",
  "description": "Victim was detained without warrant for 72 hours.",
  "category": "UNLAWFUL_DETENTION",
  "priority": "HIGH",
  "incidentDate": "2026-02-15",
  "location": "Colombo, Sri Lanka",
  "caseReferenceNumber": "PD/2026/001",
  "confidentialLevel": "INTERNAL"
}
```

| Field                 | Type   | Required | Values                                                                                                         |
| --------------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| `title`               | string | ✅       |                                                                                                                |
| `description`         | string | ✅       |                                                                                                                |
| `category`            | string | ✅       | `CUSTODIAL_VIOLENCE`, `DISCRIMINATION`, `UNLAWFUL_DETENTION`, `FREEDOM_OF_EXPRESSION`, `LABOR_RIGHTS`, `OTHER` |
| `priority`            | string | ❌       | `LOW`, `MEDIUM` (default), `HIGH`, `CRITICAL`                                                                  |
| `incidentDate`        | date   | ✅       | Cannot be in the future                                                                                        |
| `location`            | string | ✅       |                                                                                                                |
| `caseReferenceNumber` | string | ❌       | External reference                                                                                             |
| `confidentialLevel`   | string | ❌       | `PUBLIC`, `INTERNAL` (default), `CONFIDENTIAL`                                                                 |

**Response `201`:** Returns the created case object. `caseNumber` is auto-generated (e.g. `CASE-20260227-0001`).

---

#### `GET /cases`

Get cases. Role-based filtering is applied automatically:

- **NGO** — only sees own reported cases
- **INVESTIGATOR** — only sees assigned cases
- **ADMIN** — sees all cases

**Query Params:**

| Param      | Type   | Description                    |
| ---------- | ------ | ------------------------------ |
| `status`   | string | Filter by status               |
| `priority` | string | Filter by priority             |
| `category` | string | Filter by category             |
| `search`   | string | Search in case title           |
| `page`     | number | Page number (default: 1)       |
| `limit`    | number | Results per page (default: 10) |

---

#### `GET /cases/:id`

Get a single case by ID. Role-based access:

- **NGO** — only own cases
- **INVESTIGATOR** — only assigned cases
- **ADMIN** — any case

---

#### `PUT /cases/:id`

Update case details. **ADMIN or assigned INVESTIGATOR.** Cannot update status, assignment, or `caseNumber` through this endpoint.

**Request Body** (all fields optional):

```json
{
  "title": "Updated Title",
  "priority": "CRITICAL",
  "location": "Kandy, Sri Lanka"
}
```

---

#### `PUT /cases/:id/assign`

Assign an investigator to a case. **ADMIN or NGO.**

**Request Body:**

```json
{
  "investigatorId": "65f1a2b3c4d5e6f7a8b9c0d2"
}
```

> The referenced user must have the `INVESTIGATOR` role.

---

#### `PUT /cases/:id/status`

Update case status. **ADMIN or assigned INVESTIGATOR.**

**Request Body:**

```json
{
  "status": "UNDER_INVESTIGATION"
}
```

**Valid status transitions:**

```
REPORTED → UNDER_INVESTIGATION | REJECTED
UNDER_INVESTIGATION → EVIDENCE_COLLECTED | REJECTED
EVIDENCE_COLLECTED → RESOLVED | UNDER_INVESTIGATION
RESOLVED → CLOSED
REJECTED → (terminal)
CLOSED → (terminal)
```

---

#### `DELETE /cases/:id`

Soft-delete (archive) a case. **ADMIN only.**

---

### Case Progress

> **All routes require authentication.**

#### `POST /cases/:id/progress`

Add a progress update to a case. **Assigned INVESTIGATOR only.**

**Request Body:**

```json
{
  "note": "Witness statements collected from 3 individuals.",
  "status": "UNDER_INVESTIGATION"
}
```

---

#### `GET /cases/:id/progress`

Get the full progress timeline for a case (newest first). **Authenticated** — role-based access enforced internally.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "progress": [
      {
        "_id": "...",
        "note": "Witness statements collected.",
        "createdAt": "2026-02-27T10:00:00Z",
        "updatedBy": { "name": "John Smith" }
      }
    ]
  }
}
```

---

#### `PUT /progress/:id`

Update a progress entry. **ADMIN or assigned INVESTIGATOR** (INVESTIGATOR has a 15-minute edit window).

**Request Body:**

```json
{
  "note": "Corrected note text."
}
```

---

#### `DELETE /progress/:id`

Delete a progress entry. **ADMIN only.**

---

### Evidence

> **All routes require authentication.**

#### `POST /cases/:caseId/evidence`

Upload a new evidence file to a case. **ADMIN or INVESTIGATOR.**

**Request:** `multipart/form-data`

| Field         | Type   | Description                                       |
| ------------- | ------ | ------------------------------------------------- |
| `file`        | file   | The evidence file (uploaded to Cloudinary)        |
| `description` | string | Description of the evidence                       |
| `type`        | string | Evidence type (e.g. `PHOTO`, `DOCUMENT`, `VIDEO`) |

**Response `201`:** Returns the created evidence record including `cloudinaryUrl`.

---

#### `GET /cases/:caseId/evidence`

List all evidence for a case. **ADMIN, INVESTIGATOR, or NGO.**

---

#### `GET /evidence/:id`

Get a single evidence record by ID. **ADMIN, INVESTIGATOR, or NGO.**

---

#### `PUT /evidence/:id`

Update evidence metadata (description, type, etc.). **ADMIN or INVESTIGATOR.**

**Request Body:**

```json
{
  "description": "Updated description of the photo evidence."
}
```

---

#### `PUT /evidence/:id/verify`

Mark evidence as verified. **ADMIN only.**

**Response `200`:**

```json
{
  "success": true,
  "message": "Evidence verified successfully",
  "data": { "evidence": { "_id": "...", "isVerified": true } }
}
```

---

#### `DELETE /evidence/:id`

Soft-delete an evidence record and destroy the file from Cloudinary. **ADMIN only.**

---

### Reports & Analytics

> **All routes require authentication.**

#### Dashboard

| Method | Endpoint                     | Access | Description                      |
| ------ | ---------------------------- | ------ | -------------------------------- |
| `GET`  | `/reports/dashboard/summary` | ADMIN  | Overall system dashboard summary |

---

#### Case Analytics

| Method | Endpoint                     | Access     | Description                    |
| ------ | ---------------------------- | ---------- | ------------------------------ |
| `GET`  | `/reports/cases/by-status`   | ADMIN, NGO | Case count grouped by status   |
| `GET`  | `/reports/cases/by-priority` | ADMIN, NGO | Case count grouped by priority |
| `GET`  | `/reports/cases/by-category` | ADMIN, NGO | Case count grouped by category |
| `GET`  | `/reports/cases/monthly`     | ADMIN, NGO | Monthly case trend             |
| `GET`  | `/reports/cases/yearly`      | ADMIN, NGO | Yearly case trend              |

**Common Query Params** (for case analytics):

| Param       | Type | Description           |
| ----------- | ---- | --------------------- |
| `startDate` | date | Filter from this date |
| `endDate`   | date | Filter to this date   |

---

#### Resolution Analytics

| Method | Endpoint                                 | Access | Description                   |
| ------ | ---------------------------------------- | ------ | ----------------------------- |
| `GET`  | `/reports/cases/average-resolution-time` | ADMIN  | Average time to resolve cases |
| `GET`  | `/reports/cases/longest-open`            | ADMIN  | Cases open the longest        |

---

#### Investigator Performance

| Method | Endpoint                                | Access                          | Description                                   |
| ------ | --------------------------------------- | ------------------------------- | --------------------------------------------- |
| `GET`  | `/reports/investigator/:id/performance` | ADMIN (any), INVESTIGATOR (own) | Performance stats for a specific investigator |

---

#### Evidence Analytics

| Method | Endpoint                               | Access | Description                              |
| ------ | -------------------------------------- | ------ | ---------------------------------------- |
| `GET`  | `/reports/evidence/distribution`       | ADMIN  | Evidence count by type                   |
| `GET`  | `/reports/evidence/verification-ratio` | ADMIN  | Ratio of verified vs unverified evidence |

---

#### Saved Reports (CRUD)

| Method   | Endpoint       | Access | Description                       |
| -------- | -------------- | ------ | --------------------------------- |
| `POST`   | `/reports`     | ADMIN  | Save a report configuration       |
| `GET`    | `/reports`     | ADMIN  | List all saved report configs     |
| `GET`    | `/reports/:id` | ADMIN  | Get a saved report config by ID   |
| `PUT`    | `/reports/:id` | ADMIN  | Update a saved report config      |
| `DELETE` | `/reports/:id` | ADMIN  | Soft-delete a saved report config |

---

## Error Handling

All errors follow a consistent response format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": []
}
```

| Status Code | Meaning                                         |
| ----------- | ----------------------------------------------- |
| `400`       | Bad request / validation failure                |
| `401`       | Missing or invalid JWT token                    |
| `403`       | Authenticated but insufficient role permissions |
| `404`       | Resource not found                              |
| `500`       | Internal server error                           |
