# Case Ledger — Backend API v1.1.0

> REST API for the Human Rights Case Tracking System, built with Node.js, Express 5, and MongoDB.

**Classification: Public-SLIIT**

---

## Table of Contents

- [Live URL](#live-url)
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
  - [Reference Data](#reference-data)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Live URL

The backend API is hosted on **Railway**.

> **Base URL:** `https://case-ledger-be-production.up.railway.app/api/v1`

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
| Logging          | Winston                |
| Dev Server       | Nodemon                |
| Package Manager  | pnpm                   |

---

## Setup Instructions

### Prerequisites

- **Node.js** v18+
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

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Fill in the required values — see [Environment Variables](#environment-variables) for the full list.

### 4. Start the Development Server

```bash
pnpm run dev
```

The server starts on `http://localhost:8080` by default.
API base URL: `http://localhost:8080/api/v1`

### 5. Start in Production Mode

```bash
pnpm start
```

---

## Environment Variables

| Variable                | Required | Description                                       |
| ----------------------- | -------- | ------------------------------------------------- |
| `PORT`                  | ✅       | Port the server listens on (default: `8080`)      |
| `NODE_ENV`              | ✅       | `development`, `test`, or `production`            |
| `MONGODB_URI`           | ✅       | MongoDB connection string (Atlas or local)        |
| `DB_MIN_POOL_SIZE`      | ❌       | Mongoose min connection pool size (default: `5`)  |
| `DB_MAX_POOL_SIZE`      | ❌       | Mongoose max connection pool size (default: `10`) |
| `JWT_SECRET`            | ✅       | Secret key for signing JWT tokens                 |
| `JWT_EXPIRES_IN`        | ✅       | Token expiry duration (e.g. `1d`, `7d`)           |
| `CLOUDINARY_CLOUD_NAME` | ✅       | Cloudinary cloud name                             |
| `CLOUDINARY_API_KEY`    | ✅       | Cloudinary API key                                |
| `CLOUDINARY_API_SECRET` | ✅       | Cloudinary API secret                             |

---

## Project Structure

```
src/
├── config/          # App config, Cloudinary config, env loading
├── controllers/     # Route handlers — thin layer delegating to services
├── database/        # MongoDB connection logic
├── middleware/      # JWT auth, role authorisation, error handler, file upload
├── models/          # Mongoose schemas: User, Case, CaseProgress, Evidence, Report
├── repository/      # Data access layer — all DB queries live here
├── routes/          # Express routers mounted under /api/v1
├── services/        # Business logic layer
├── utils/           # NIC validator, password helpers, Winston logger
└── validations/     # Celebrate/Joi request validation schemas
```

---

## Authentication

All protected endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Tokens are issued by `/auth/login` and `/auth/register` and expire according to `JWT_EXPIRES_IN`.

---

## User Roles

| Role           | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| `ADMIN`        | Full system access — manage users, cases, assignments, reports        |
| `NGO`          | Create cases, assign investigators to own cases, view own cases       |
| `INVESTIGATOR` | View and update assigned cases, upload evidence, log progress updates |

---

## API Endpoint Documentation

**Base URL:** `http://localhost:8080/api/v1`

All responses follow this envelope:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {}
}
```

---

### Auth

> Public endpoints — no authentication required.

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
| `email`            | string | ✅                          | Must be a valid email, unique                          |
| `password`         | string | ✅                          | Minimum 6 characters                                   |
| `role`             | string | ❌                          | `ADMIN`, `INVESTIGATOR`, or `NGO`. Defaults to `NGO`   |
| `phoneNumber`      | string | ❌                          | 10-digit Sri Lankan number                             |
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
      "_id": "...",
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

> All routes require authentication (`Authorization: Bearer <token>`).

#### `GET /users`

List all users with pagination and filters. **ADMIN only.**

**Query Params:**

| Param    | Type   | Description                                    |
| -------- | ------ | ---------------------------------------------- |
| `search` | string | Filter by name (case-insensitive)              |
| `type`   | string | Filter by role: `ADMIN`, `INVESTIGATOR`, `NGO` |
| `status` | string | `active` or `inactive`                         |
| `page`   | number | Page number (default: `1`)                     |
| `limit`  | number | Results per page (default: `10`)               |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "...",
        "name": "...",
        "email": "...",
        "role": "...",
        "isActive": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 25,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
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
    "user": {
      "_id": "...",
      "name": "...",
      "email": "...",
      "role": "...",
      "isActive": true
    }
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

**Response `200`:**

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": { "user": { "_id": "...", "name": "Jane Updated" } }
}
```

---

#### `PUT /users/:id/role`

Update a user's role. **ADMIN only.**

**Request Body:**

```json
{ "role": "INVESTIGATOR" }
```

---

#### `DELETE /users/:id`

Soft-delete (deactivate) a user. **ADMIN only.**

**Response `200`:**

```json
{ "success": true, "message": "User deleted successfully" }
```

---

### Cases

> All routes require authentication.

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
| `caseReferenceNumber` | string | ❌       | External reference number                                                                                      |
| `confidentialLevel`   | string | ❌       | `PUBLIC`, `INTERNAL` (default), `CONFIDENTIAL`                                                                 |

**Response `201`:** Returns the created case. `caseNumber` is auto-generated (e.g. `CASE-20260215-0001`).

---

#### `GET /cases`

Get cases with pagination. Role-filtered automatically:

- **NGO** — only cases they reported
- **INVESTIGATOR** — only cases assigned to them
- **ADMIN** — all cases

**Query Params:**

| Param      | Type   | Description                      |
| ---------- | ------ | -------------------------------- |
| `search`   | string | Search in case title             |
| `status`   | string | Filter by case status            |
| `priority` | string | Filter by priority               |
| `category` | string | Filter by category               |
| `page`     | number | Page number (default: `1`)       |
| `limit`    | number | Results per page (default: `10`) |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "_id": "...",
        "caseNumber": "CASE-20260215-0001",
        "title": "...",
        "status": "REPORTED"
      }
    ],
    "pagination": { "currentPage": 1, "totalPages": 2, "totalCount": 15 }
  }
}
```

---

#### `GET /cases/:id`

Get a single case by ID. Role-based access applies.

---

#### `PUT /cases/:id`

Update case details. **ADMIN or assigned INVESTIGATOR.**

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
{ "investigatorId": "65f1a2b3c4d5e6f7a8b9c0d2" }
```

> The referenced user must have the `INVESTIGATOR` role.

---

#### `PUT /cases/:id/status`

Update case status. **ADMIN or assigned INVESTIGATOR.**

**Request Body:**

```json
{ "status": "UNDER_INVESTIGATION" }
```

**Valid status transitions:**

```
REPORTED            → UNDER_INVESTIGATION | REJECTED
UNDER_INVESTIGATION → EVIDENCE_COLLECTED  | REJECTED
EVIDENCE_COLLECTED  → RESOLVED            | UNDER_INVESTIGATION
RESOLVED            → CLOSED
REJECTED            → (terminal)
CLOSED              → (terminal)
```

---

#### `DELETE /cases/:id`

Soft-delete (archive) a case. **ADMIN only.**

---

### Case Progress

> All routes require authentication.

#### `POST /cases/:id/progress`

Add a progress update to a case. **Assigned INVESTIGATOR only.**

**Request Body:**

```json
{
  "message": "Witness statements collected from 3 individuals.",
  "statusSnapshot": "UNDER_INVESTIGATION"
}
```

> Submitting a `statusSnapshot` also syncs the parent case's `status` field to that value.

---

#### `GET /cases/:id/progress`

Get the full progress timeline for a case (newest first).

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "progress": [
      {
        "_id": "...",
        "message": "Witness statements collected.",
        "statusSnapshot": "UNDER_INVESTIGATION",
        "createdAt": "2026-02-27T10:00:00Z",
        "updatedBy": { "name": "John Smith" }
      }
    ]
  }
}
```

---

#### `PUT /progress/:id`

Update a progress entry message. **ADMIN or the creating INVESTIGATOR** (INVESTIGATOR limited to a 15-minute edit window).

**Request Body:**

```json
{ "message": "Corrected note text." }
```

---

#### `DELETE /progress/:id`

Delete a progress entry. **ADMIN only.**

---

### Evidence

> All routes require authentication.

#### `POST /cases/:caseId/evidence`

Upload evidence to a case. **ADMIN or INVESTIGATOR.**

**Request:** `multipart/form-data`

| Field         | Type   | Required | Description                                    |
| ------------- | ------ | -------- | ---------------------------------------------- |
| `file`        | file   | ✅       | Evidence file (uploaded to Cloudinary)         |
| `description` | string | ✅       | Description of the evidence                    |
| `type`        | string | ✅       | `PHOTO`, `DOCUMENT`, `VIDEO`, `AUDIO`, `OTHER` |

**Response `201`:** Returns the created evidence record including `cloudinaryUrl`.

---

#### `GET /cases/:caseId/evidence`

List all evidence for a case. **ADMIN, INVESTIGATOR, or NGO.**

---

#### `GET /evidence/:id`

Get a single evidence record by ID.

---

#### `PUT /evidence/:id`

Update evidence metadata. **ADMIN or INVESTIGATOR.**

**Request Body:**

```json
{ "description": "Updated description." }
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

Soft-delete evidence and remove file from Cloudinary. **ADMIN only.**

---

### Reports & Analytics

> All routes require authentication.

#### `GET /reports/dashboard/summary`

Overall system dashboard summary. **ADMIN only.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "totalCases": 120,
    "totalUsers": 45,
    "totalInvestigators": 12,
    "totalNGOs": 8,
    "totalEvidence": 340,
    "casesByStatus": [
      { "status": "REPORTED", "count": 30 },
      { "status": "UNDER_INVESTIGATION", "count": 45 }
    ],
    "casesByPriority": [
      { "priority": "HIGH", "count": 25 },
      { "priority": "CRITICAL", "count": 10 }
    ]
  }
}
```

---

#### Case Analytics

| Method | Endpoint                                 | Access     | Description                    |
| ------ | ---------------------------------------- | ---------- | ------------------------------ |
| `GET`  | `/reports/cases/by-status`               | ADMIN, NGO | Case count grouped by status   |
| `GET`  | `/reports/cases/by-priority`             | ADMIN, NGO | Case count grouped by priority |
| `GET`  | `/reports/cases/by-category`             | ADMIN, NGO | Case count grouped by category |
| `GET`  | `/reports/cases/monthly`                 | ADMIN, NGO | Monthly case submission trend  |
| `GET`  | `/reports/cases/yearly`                  | ADMIN, NGO | Yearly case submission trend   |
| `GET`  | `/reports/cases/average-resolution-time` | ADMIN      | Average time to resolve a case |
| `GET`  | `/reports/cases/longest-open`            | ADMIN      | Cases open the longest         |

**Common Query Params:**

| Param       | Type | Description            |
| ----------- | ---- | ---------------------- |
| `startDate` | date | Filter from this date  |
| `endDate`   | date | Filter up to this date |

---

#### Investigator Performance

| Method | Endpoint                                | Access                          | Description                           |
| ------ | --------------------------------------- | ------------------------------- | ------------------------------------- |
| `GET`  | `/reports/investigator/:id/performance` | ADMIN (any), INVESTIGATOR (own) | Performance stats for an investigator |

---

#### Evidence Analytics

| Method | Endpoint                               | Access | Description                              |
| ------ | -------------------------------------- | ------ | ---------------------------------------- |
| `GET`  | `/reports/evidence/distribution`       | ADMIN  | Evidence count by type                   |
| `GET`  | `/reports/evidence/verification-ratio` | ADMIN  | Ratio of verified vs unverified evidence |

---

#### Saved Reports

| Method   | Endpoint       | Access | Description                                       |
| -------- | -------------- | ------ | ------------------------------------------------- |
| `POST`   | `/reports`     | ADMIN  | Save a report with a snapshot of the queried data |
| `GET`    | `/reports`     | ADMIN  | List all saved reports                            |
| `GET`    | `/reports/:id` | ADMIN  | Get a saved report by ID (includes `reportData`)  |
| `PUT`    | `/reports/:id` | ADMIN  | Update a saved report                             |
| `DELETE` | `/reports/:id` | ADMIN  | Soft-delete a saved report                        |

---

### Reference Data

> Authenticated endpoints for UI helper data.

#### `GET /ref/assignable-users`

Returns a list of active investigators for assignment dropdowns.

**Query Params:**

| Param    | Type   | Description                            |
| -------- | ------ | -------------------------------------- |
| `search` | string | Filter by name (case-insensitive)      |
| `limit`  | number | Max results (default: `10`, max: `50`) |

**Response `200`:**

```json
{
  "success": true,
  "data": [{ "_id": "...", "name": "John Smith", "email": "john@example.com" }]
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "message": "Human-readable error description",
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

---

## Testing

The test suite uses **Jest** with **mongodb-memory-server** for a fully isolated in-memory MongoDB instance — no external database is needed.

### Testing Environment Configuration

Test environment variables are automatically configured in `src/__tests__/helpers/envSetup.js` and loaded via `jest.config.js` `setupFiles`. No `.env` file is required to run tests.

```js
NODE_ENV              = test
JWT_SECRET            = test_jwt_secret_key_for_testing_only
JWT_EXPIRES_IN        = 1d
PORT                  = 0
CLOUDINARY_CLOUD_NAME = test
CLOUDINARY_API_KEY    = test
CLOUDINARY_API_SECRET = test
```

A `dbSetup.js` helper (loaded via `setupFilesAfterEnv`) connects each test suite to a fresh in-memory MongoDB instance and tears it down after the suite completes.

### Run All Tests

```bash
pnpm test
```

### Run with Coverage Report

```bash
pnpm run test:coverage
```

The HTML and LCOV coverage reports are written to `coverage/`. A text summary is printed to the console.

### Test Structure

```
src/__tests__/
├── helpers/
│   ├── envSetup.js       # Stubs env variables before any module loads
│   └── dbSetup.js        # Connects/disconnects in-memory MongoDB per suite
├── unit/
│   └── services/         # Service-layer unit tests with mocked repositories
└── integration/
    └── *.test.js         # Full HTTP tests via supertest against in-memory DB
```

### Run Only Unit Tests

```bash
pnpm test -- --testPathPattern=unit
```

### Run Only Integration Tests

```bash
pnpm test -- --testPathPattern=integration
```

---

## Deployment

The backend is deployed on **Railway**.

### Railway Deployment Steps

1. **Create a Railway project** and connect your GitHub repository.

2. **Set the following environment variables** in the Railway dashboard under _Variables_:

   | Variable                | Value                                |
   | ----------------------- | ------------------------------------ |
   | `NODE_ENV`              | `production`                         |
   | `MONGODB_URI`           | Your MongoDB Atlas connection string |
   | `JWT_SECRET`            | A strong random secret               |
   | `JWT_EXPIRES_IN`        | `1d`                                 |
   | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name           |
   | `CLOUDINARY_API_KEY`    | Your Cloudinary API key              |
   | `CLOUDINARY_API_SECRET` | Your Cloudinary API secret           |

   > Railway injects `PORT` automatically — do not set it manually.

3. **Set the start command** (Railway detects `pnpm start` from `package.json` automatically, or configure via _Settings → Deploy_):

   ```bash
   pnpm start
   ```

4. **Trigger a deploy** — Railway builds and deploys on every push to the connected branch.

5. **Verify** by hitting the health endpoint:

   ```
   GET https://<your-railway-domain>/api/v1/auth/login
   ```

---

## Changelog

### v1.1.0 — April 2026

**New Features**

- **Victim Role**: New `VICTIM` role with access-controlled endpoints. Victims can view public evidence on cases they are associated with.
- **Profile Photo Upload**: Users can upload a profile photo via `POST /users/:id/profile-photo`. Images are stored on Cloudinary with automatic 400×400 face-crop transformation.
- **Email Notifications**: Automated email alerts via Nodemailer (Gmail SMTP) for investigator assignment, victim assignment, case progress updates, and victim invitations.
- **Victim Assignment**: Cases can be assigned a victim from existing users or by sending an invitation email to an unregistered user.
- **Report CSV Download**: Generate and download filtered case data as CSV files (`GET /reports/cases/download`). Saved report configurations can also be exported (`GET /reports/:id/download`).
- **Seed Script**: Development seed script to populate 20 dummy cases and sample users across all roles.

**Bug Fixes**

- Evidence access for `VICTIM` role now correctly scoped to `PUBLIC` access-level items on associated cases only.
- Enhanced structured logging for all email service operations (attempt, success, failure).
- `GET /cases/:id` now returns both victim name and ID in the populated response.
- Victim assignment email and invitation email were not being sent — both are now triggered correctly.
