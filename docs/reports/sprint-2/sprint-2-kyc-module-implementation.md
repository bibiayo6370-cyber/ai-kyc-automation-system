# Sprint 2 – KYC Application Management Module

## 1. Sprint Information

### Sprint Name

Sprint 2 – KYC Application Management Module

### Sprint Duration

July 16, 2026 – July 18,2026

### Sprint Status

Completed Successfully

### Sprint Objective

The objective of Sprint 2 was to design, implement, secure, and test the KYC Application Management Module. The module enables authenticated customers to submit a KYC application, retrieve their submitted application, and view application details while enforcing application ownership, data integrity, and access control.

Sprint 2 also established the application workflow and data structures required for future OCR processing, risk assessment, and administrative review functionality.

---

## 2. Sprint Scope

Sprint 2 covered the following capabilities:

- KYC application schema design and implementation.
- Authenticated KYC application submission.
- One-application-per-customer enforcement.
- Automatic assignment of the initial application status.
- Retrieval of the authenticated customer's application.
- Retrieval of application details by application ID.
- Prevention of unauthorized cross-customer access.
- Input and identifier validation.
- API security and regression testing.
- Evidence capture and sprint documentation.

The sprint did not include document upload, OCR processing, automated risk scoring, administrative review, approval, or rejection. These capabilities are scheduled for subsequent sprints.

---

## 3. Design Review Decisions

### 3.1 Application Ownership

Each KYC application belongs to one authenticated customer.

The application schema stores the customer's MongoDB ObjectId using the `userId` field, which references the `User` model.

Application ownership is derived from the authenticated user context:

```text
JWT token
    ↓
Authentication middleware
    ↓
req.user._id
    ↓
KYC controller
    ↓
KYC service
    ↓
KYC application userId
```

The API does not trust a `userId` supplied in the request body.

---

### 3.2 One Application Per Customer

The MVP permits only one KYC application per customer.

This rule is enforced through:

- A service-layer existence check.
- A unique MongoDB index on `userId`.
- Duplicate-key error handling for simultaneous submissions.

A repeated submission by the same authenticated customer returns:

```http
409 Conflict
```

---

### 3.3 Application Status Workflow

The approved application lifecycle is:

```text
pending
    ↓
under_review
    ↓
approved
```

or:

```text
pending
    ↓
under_review
    ↓
rejected
```

The transition triggers are:

| Status       | Trigger                                                         |
| ------------ | --------------------------------------------------------------- |
| Pending      | Customer submits a KYC application                              |
| Under Review | Administrator begins reviewing the application                  |
| Approved     | Administrator completes the review and approves the application |
| Rejected     | Administrator completes the review and rejects the application  |

Only the `pending` status became operational during Sprint 2. Administrative transitions will be implemented during the Admin Dashboard sprint.

---

### 3.4 Customer Modification Policy

Customers cannot edit a KYC application after submission.

This decision preserves the integrity of submitted information and controls the scope of the MVP.

Customers who discover errors after submission will be directed to a designated support email address to request an amendment. Administrative amendment workflows remain outside the current MVP scope.

---

### 3.5 Review Workflow Fields

The schema includes the following future administrative review fields:

- `reviewedBy`
- `reviewDate`
- `reviewComments`

These fields default to `null` and will become operational when administrative review functionality is implemented.

---

### 3.6 Model Naming Convention

The project standardized Mongoose model filenames to singular entity names.

The approved convention is:

```text
models/
├── User.js
├── KYCApplication.js
├── Document.js
└── RiskAssessment.js
```

The Mongoose model names also remain singular, while MongoDB automatically creates plural collection names.

---

### 3.7 Layered Architecture

Sprint 2 maintained the architecture approved in Chapter 3:

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

This separation ensures that:

- Routes define endpoints.
- Middleware handles authentication.
- Controllers manage HTTP requests and responses.
- Services implement business rules.
- Models define data structures and database constraints.
- MongoDB provides persistent storage.

---

## 4. Implementation Activities

### 4.1 KYC Application Schema

The `KYCApplication.js` model was created with the following fields:

#### Ownership

- `userId`

#### Customer Information

- `fullName`
- `dateOfBirth`
- `gender`
- `nationality`
- `residentialAddress`
- `phoneNumber`
- `occupation`

#### Workflow

- `applicationStatus`
- `reviewedBy`
- `reviewDate`
- `reviewComments`

#### System Fields

- `createdAt`
- `updatedAt`

Mongoose timestamps were enabled to automatically record submission and modification times.

The `userId` field was configured as unique to enforce one application per customer.

---

### 4.2 KYC Application Creation Service

The KYC creation service was implemented to:

- Confirm that an authenticated user ID exists.
- Check whether the customer already has an application.
- Extract only approved customer fields.
- Ignore client-supplied workflow and ownership fields.
- Assign `pending` as the initial application status.
- Handle MongoDB duplicate-key errors.
- Return a controlled `409 Conflict` response for duplicate submissions.

The service explicitly selects permitted fields instead of spreading the complete request body. This prevents customers from setting protected properties such as:

```text
userId
applicationStatus
reviewedBy
reviewDate
reviewComments
```

---

### 4.3 KYC Application Controller

The KYC application controller was implemented to:

- Obtain the authenticated customer ID from `req.user._id`.
- Pass customer data to the service layer.
- Return `201 Created` after successful submission.
- Return `400 Bad Request` for schema validation errors.
- Return `409 Conflict` for duplicate applications.
- Return safe responses for unexpected server failures.

The controller does not obtain application ownership from the request body.

---

### 4.4 Protected KYC Application Routes

A protected KYC router was created.

Authentication was applied at router level:

```js
router.use(authenticate)
```

This ensures that all current and future KYC application routes require a valid JWT.

The following routes were implemented:

```http
POST /api/v1/applications
GET  /api/v1/applications
GET  /api/v1/applications/:id
```

---

### 4.5 Express Route Registration

The KYC router was registered in the Express application using:

```js
app.use('/api/v1/applications', kycRoutes)
```

An unauthenticated request to the endpoint returned `401 Unauthorized`, confirming that the route was correctly registered and protected.

---

### 4.6 Authenticated Application Submission

The application submission endpoint was tested using a valid customer JWT.

The request intentionally included a false `userId` value to verify ownership protection.

The system ignored the request-body `userId` and stored the ObjectId of the authenticated customer.

The successful request returned:

```http
201 Created
```

The created application contained:

- The authenticated customer's user ID.
- `pending` application status.
- Null administrative review fields.
- Automatic timestamps.

MongoDB Atlas confirmed the application was persisted correctly.

---

### 4.7 Duplicate Application Prevention

The same authenticated customer attempted to submit another KYC application.

The API returned:

```http
409 Conflict
```

with the message:

```text
A KYC application already exists for this user
```

This confirmed that the one-application-per-customer rule was correctly enforced.

---

### 4.8 Authenticated Application Retrieval

The following endpoint was implemented:

```http
GET /api/v1/applications
```

The service queried the database using the authenticated customer ID:

```js
KYCApplication.findOne({ userId })
```

The endpoint returned only the application belonging to the authenticated customer.

A customer without an application received:

```http
404 Not Found
```

---

### 4.9 Application Details Retrieval

The following endpoint was implemented:

```http
GET /api/v1/applications/:id
```

The service validates the application ID before querying MongoDB.

The query combines the application ID and authenticated customer ID:

```js
KYCApplication.findOne({
  _id: applicationId,
  userId,
})
```

This prevents one customer from retrieving another customer's application.

A valid owned application returned:

```http
200 OK
```

A malformed application ID returned:

```http
400 Bad Request
```

A missing application or application owned by another customer returned:

```http
404 Not Found
```

Using the same response for missing and unauthorized records prevents the API from revealing whether another customer's application exists.

---

## 5. API Endpoints Completed

| Method | Endpoint                   | Purpose                                           | Authentication |
| ------ | -------------------------- | ------------------------------------------------- | -------------- |
| POST   | `/api/v1/applications`     | Submit a KYC application                          | Required       |
| GET    | `/api/v1/applications`     | Retrieve the authenticated customer's application | Required       |
| GET    | `/api/v1/applications/:id` | Retrieve owned application details                | Required       |

Customer update endpoints were intentionally excluded because submitted applications are read-only within the MVP.

---

## 6. Testing Results

| Test Case                                  |              Expected Result | Outcome |
| ------------------------------------------ | ---------------------------: | ------: |
| Application submission without token       |             401 Unauthorized |    Pass |
| Application submission with valid token    |                  201 Created |    Pass |
| Client-supplied user ID ignored            | Authenticated user ID stored |    Pass |
| Default application status                 |                      Pending |    Pass |
| Administrative fields after submission     |                         Null |    Pass |
| MongoDB application persistence            |              Document stored |    Pass |
| Duplicate application submission           |                 409 Conflict |    Pass |
| Authenticated application retrieval        |                       200 OK |    Pass |
| Retrieval without token                    |             401 Unauthorized |    Pass |
| Retrieval with invalid token               |             401 Unauthorized |    Pass |
| Application details with valid ID          |                       200 OK |    Pass |
| Application details with malformed ID      |              400 Bad Request |    Pass |
| Cross-customer application access          |                404 Not Found |    Pass |
| Customer without an application            |                404 Not Found |    Pass |
| Invalid application data                   |              400 Bad Request |    Pass |
| Sprint 1 health regression test            |                       200 OK |    Pass |
| Sprint 1 login regression test             |                       200 OK |    Pass |
| Sprint 1 protected profile regression test |                       200 OK |    Pass |

All planned Sprint 2 functional, validation, authentication, authorization, ownership, and regression tests passed.

---

## 7. Security Controls Verified

Sprint 2 verified the following controls:

- JWT authentication for all KYC endpoints.
- Ownership derived from `req.user._id`.
- Client-supplied ownership data ignored.
- Cross-customer access prevented.
- Generic not-found responses used to reduce information disclosure.
- Protected workflow fields excluded from customer input.
- Duplicate records prevented at service and database levels.
- Invalid MongoDB ObjectIds rejected before database queries.
- Mongoose validation errors converted into controlled HTTP responses.
- Internal database errors not exposed to clients.

---

## 8. Issues and Design Adjustments

### 8.1 Model Filename Convention

The project initially used plural model filenames.

During Sprint 2, the convention was reviewed and standardized to singular filenames because each file exports one entity model.

The files were renamed from plural to singular without affecting MongoDB collection names.

---

### 8.2 Redundant Environment Loader

The server contained:

```js
import 'dotenv/config'
```

The project already uses Node.js native environment-file support:

```bash
node --watch --env-file=.env src/server.js
```

The redundant dotenv loader was removed.

Environment variables deployed on Render will be injected directly into `process.env`.

---

### 8.3 Evidence Attachment Limitation

A temporary attachment issue prevented one screenshot from being uploaded for immediate review.

The test result was verified through its returned HTTP status and JSON response, and the screenshot was preserved locally in the project evidence folder.

This issue did not affect the implementation or testing outcome.

---

## 9. Lessons Learned

### Technical Lessons

- Application ownership must be derived from authenticated server-side context rather than client input.
- A unique database index should support, but not replace, service-layer business validation.
- Explicitly selecting permitted request fields prevents mass-assignment vulnerabilities.
- Router-level middleware provides reusable protection for groups of endpoints.
- Combining an application ID and authenticated user ID in a query provides efficient ownership enforcement.
- Returning the same response for missing and unauthorized resources reduces information disclosure.
- MongoDB ObjectId validation should occur before database queries.
- Regression testing is necessary before and after introducing a new application module.

### Project Management Lessons

- A clean Git working tree provides a reliable starting point for each task.
- Small commits make the implementation history easier to review.
- Descriptive screenshot filenames simplify future Chapter 4 compilation.
- Kanban acceptance criteria help distinguish code completion from end-to-end requirement verification.
- Consolidating sprint notes at closure produces a clearer report than maintaining fragmented updates.
- Capturing evidence during implementation prevents reconstruction work later.

---

## 10. Sprint Retrospective

### What Went Well

- All Sprint 2 objectives were achieved.
- The layered architecture remained consistent.
- Authentication middleware was reused successfully.
- Application ownership was verified end to end.
- Duplicate submissions were correctly prevented.
- Positive and negative test cases were completed.
- Security controls were validated using two customer accounts.
- Existing Sprint 1 functionality remained stable.
- Git commits, screenshots, and Kanban tasks remained synchronized.
- MongoDB Atlas persistence was verified.

### What Could Be Improved

- Reusable application error handling should eventually be moved into a shared error class.
- Controller error handling contains some repeated logic and may later be centralized.
- Mongoose's internal `__v` field is still included in API responses.
- Formal automated tests have not yet replaced manual Postman testing.
- A shared Postman collection and environment should eventually be exported into the repository.
- Validation middleware may be introduced before controllers to provide earlier request rejection.

### Actions for Future Sprints

- Preserve the same layered architecture.
- Continue deriving ownership and authorization from authenticated user context.
- Introduce reusable error-handling utilities when repetition becomes significant.
- Hide unnecessary internal fields from external API responses.
- Export Postman collections for reproducible testing.
- Continue capturing implementation and test evidence.
- Maintain regression tests for authentication and KYC functionality.

---

## 11. Improvement Backlog

The following improvements were identified but are not required to close Sprint 2:

1. Hide the Mongoose `__v` field from API responses.
2. Introduce a reusable custom application error class.
3. Add centralized Express error-handling middleware.
4. Add dedicated request-validation middleware.
5. Export and version the Postman collection and local environment.
6. Introduce automated integration tests.
7. Add pagination if multiple KYC applications are supported in a future version.
8. Add a formal customer amendment-request workflow.
9. Add structured application logging.
10. Add rate limiting to authentication and KYC submission endpoints.

---

## 12. Evidence Captured

The following evidence was captured and tracked:

```text
01-kyc_application_schema_implementation.png
02-kyc_application_creation_service.png
03-kyc_application_controller.png
04-protected_kyc_application_routes.png
05-kyc_application_route_no_token_denied.png
06-kyc_application_created.png
07-mongodb_kyc_application_owner_verified.png
08-duplicate_kyc_application_rejected.png
09-kyc_application_retrieved.png
10-kyc_application_details_retrieved.png
11-invalid_kyc_application_id_rejected.png
12-kyc_application_retrieval_no_token_denied.png
13-kyc_application_invalid_token_denied.png
14-cross_customer_kyc_access_denied.png
15-customer_without_kyc_application.png
16-kyc_application_validation_failed.png
17-kyc_module_project_structure.png
```

The GitHub Sprint 2 commit-history screenshot will be captured after the Sprint 2 closure report is committed.

---

## 13. Sprint Acceptance Checklist

| Requirement                                      |    Status |
| ------------------------------------------------ | --------: |
| KYC application schema implemented               | Completed |
| Authenticated application submission implemented | Completed |
| One application per customer enforced            | Completed |
| Ownership derived from JWT user                  | Completed |
| Pending status assigned automatically            | Completed |
| Protected review fields secured                  | Completed |
| Application retrieval implemented                | Completed |
| Application details retrieval implemented        | Completed |
| Invalid application IDs rejected                 | Completed |
| Cross-customer access prevented                  | Completed |
| Customers without applications handled           | Completed |
| Validation errors handled                        | Completed |
| MongoDB persistence verified                     | Completed |
| Sprint 1 regression tests passed                 | Completed |
| Evidence captured and tracked                    | Completed |
| Sprint documentation completed                   | Completed |

---

## 14. Sprint Outcome

Sprint 2 was completed successfully.

The AI-Driven KYC Automation System now has a functional and secured KYC Application Management Module that supports:

- Authenticated application submission.
- Customer ownership enforcement.
- Duplicate application prevention.
- Application retrieval.
- Secure application-details retrieval.
- Input validation.
- Authentication and authorization controls.
- MongoDB persistence.

The completed module provides the business-process foundation required for the next phase of the project, including document upload and OCR-based identity-data extraction.

### Final Sprint Assessment

```text
Sprint Status: COMPLETED
Outcome: SUCCESSFUL
Architecture Compliance: EXCELLENT
Functional Testing: PASSED
Security Testing: PASSED
Regression Testing: PASSED
Documentation Quality: EXCELLENT
```

### Recommendation

Proceed to the design review and implementation of Sprint 3 – OCR and Identity Document Processing.
