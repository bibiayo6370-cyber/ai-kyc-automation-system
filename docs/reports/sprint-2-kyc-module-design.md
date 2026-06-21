# Sprint 2 – KYC Application Management Module Design Review

## Sprint Information

### Sprint Name

Sprint 2 – KYC Application Management Module

### Sprint Duration

26/06/2026 – 02/07/2026

### Sprint Objective

Design and implement the KYC Application Management Module that enables authenticated customers to submit Know Your Customer (KYC) applications, track application status, and provide the foundation for future administrative review, risk assessment, and approval workflows.

---

# Business Context

The primary objective of the AI-Driven KYC Automation System is to streamline customer onboarding within financial institutions by automating the collection, verification, and assessment of customer information.

Following the successful completion of Sprint 1, which implemented authentication and user management, Sprint 2 focuses on the first core business process within the system: KYC application submission and management.

The module will enable authenticated users to submit personal information required for customer onboarding while ensuring proper ownership, security, and lifecycle management of KYC applications.

---

# Design Review Decisions

## 1. Application Ownership Model

### Decision

Each KYC application shall belong to exactly one authenticated user.

### Relationship

```text
User
  │
  └───< KYC Application
```

### Implementation

Each application record shall contain a reference to the user who created it through the `userId` field.

### Justification

* Supports multi-user operation.
* Aligns with the approved ERD.
* Enables ownership validation.
* Supports future administrative review workflows.

### Status

Approved ✅

---

## 2. Application Status Workflow

### Decision

Each KYC application shall follow the lifecycle below:

```text
pending
    ↓
under_review
    ↓
approved
```

or

```text
pending
    ↓
under_review
    ↓
rejected
```

### Workflow Description

#### Pending

Assigned automatically when a customer submits a KYC application.

Meaning:

* Application successfully submitted.
* Awaiting administrative review.
* No assessment has yet been performed.

#### Under Review

Assigned when an administrator begins reviewing the application.

Meaning:

* Application is actively being reviewed.
* Verification and compliance checks are in progress.

#### Approved

Assigned after successful review.

Meaning:

* Customer onboarding requirements have been satisfied.
* Application has been accepted.

#### Rejected

Assigned when review requirements are not met.

Meaning:

* Application failed review.
* Customer onboarding cannot proceed.

### Status Transition Triggers

| Status       | Trigger                            |
| ------------ | ---------------------------------- |
| Pending      | Customer submits application       |
| Under Review | Administrator initiates review     |
| Approved     | Administrator approves application |
| Rejected     | Administrator rejects application  |

### Sprint 2 Scope

Only the **Pending** state will be operational during Sprint 2.

The **Under Review**, **Approved**, and **Rejected** states will be implemented during Sprint 5 when administrative review functionality becomes available.

### Status

Approved ✅

---

## 3. Customer Data Capture Requirements

### Decision

The following customer information shall be collected during application submission.

### Customer Fields

* fullName
* dateOfBirth
* gender
* nationality
* residentialAddress
* phoneNumber
* occupation

### Justification

These fields provide sufficient information for:

* Customer onboarding.
* Identity verification.
* Future OCR validation.
* Future risk assessment.

### Status

Approved ✅

---

## 4. One Application Per User Policy

### Decision

Each customer may maintain only one active KYC application within the MVP.

### Business Rule

If a customer already has an existing application, the system shall reject subsequent submissions.

### Expected Response

```http
409 Conflict
```

### Justification

* Simplifies MVP scope.
* Matches typical onboarding processes.
* Prevents duplicate records.
* Simplifies future review workflows.

### Status

Approved ✅

---

## 5. Customer Modification Policy

### Decision

Customers shall not be permitted to modify submitted KYC applications.

### Business Rule

Once submitted, an application becomes read-only from the customer's perspective.

### Exception Process

If a customer discovers an error after submission, such as:

* Name spelling mistakes
* Incorrect date of birth
* Incorrect address
* Incorrect phone number
* Other data entry errors

the customer will be instructed to contact a designated support email address to request a correction.

Any correction request shall be reviewed and processed by authorized administrative personnel.

### Future Enhancement

A future version of the system may support formal amendment requests and approval workflows.

### Justification

* Reduces implementation complexity.
* Preserves application integrity.
* Aligns with common KYC operational practices.
* Keeps MVP scope manageable.

### Status

Approved ✅

---

## 6. KYC Application Schema Design

### Decision

The KYC Application schema shall contain the following fields.

### Ownership Fields

* userId

### Customer Information Fields

* fullName
* dateOfBirth
* gender
* nationality
* residentialAddress
* phoneNumber
* occupation

### Workflow Fields

* applicationStatus
* reviewedBy
* reviewDate
* reviewComments

### System Fields

* createdAt
* updatedAt

### Future Usage

The following fields are included now to support future administrative review functionality:

* reviewedBy
* reviewDate
* reviewComments

These fields will become active during Sprint 5.

### Status

Approved ✅

---

## 7. API Endpoints

### Create Application

```http
POST /api/v1/applications
```

Purpose:

Create a new KYC application.

Authentication:

Required.

---

### Get My Applications

```http
GET /api/v1/applications
```

Purpose:

Retrieve the authenticated user's application.

Authentication:

Required.

---

### Get Application Details

```http
GET /api/v1/applications/:id
```

Purpose:

Retrieve a specific application.

Authentication:

Required.

### Status

Approved ✅

---

## 8. Architectural Decisions

The module shall continue using the project's approved layered architecture.

```text
Route
   ↓
Middleware
   ↓
Controller
   ↓
Service
   ↓
Model
   ↓
MongoDB
```

### Benefits

* Separation of concerns.
* Reusability.
* Maintainability.
* Scalability.
* Consistency with Chapter 3 design.

### Status

Approved ✅

---

# Deliverables

The following components shall be implemented during Sprint 2.

## Models

```text
src/models/KYCApplications.js
```

## Services

```text
src/services/kycService.js
```

## Controllers

```text
src/controllers/kycController.js
```

## Routes

```text
src/routes/kycRoutes.js
```

## Integration

```text
src/server.js
```

---

# Risks Identified

## Duplicate Applications

Mitigation:

One application per user validation.

---

## Unauthorized Access

Mitigation:

JWT authentication middleware.

---

## Invalid Data Submission

Mitigation:

Mongoose validation and business rule validation.

---

# Testing Strategy

| Test Case             | Expected Result                 |
| --------------------- | ------------------------------- |
| Create Application    | 201 Created                     |
| Duplicate Application | 409 Conflict                    |
| Retrieve Application  | 200 OK                          |
| Unauthorized Access   | 401 Unauthorized                |
| MongoDB Persistence   | Application stored successfully |

---

# Evidence Collection Plan

The following screenshots shall be captured during implementation:

```text
kyc_application_project_structure.png

kyc_application_created.png

duplicate_application_rejected.png

kyc_application_retrieved.png

mongodb_kyc_application_document.png

github_commit_history_sprint2.png
```

---

# Sprint 2 Success Criteria

Sprint 2 shall be considered complete when:

* KYC application schema is implemented.
* Application submission endpoint is operational.
* Application retrieval endpoint is operational.
* Duplicate application validation is functioning.
* JWT protection is enforced.
* MongoDB persistence is verified.
* Testing evidence has been captured.
* Sprint report has been completed.

---

# Sprint 2 Design Review Outcome

Status: Approved

Recommendation: Proceed to implementation.

Next Task:

Create and review the `KYCApplications.js` schema implementation.
