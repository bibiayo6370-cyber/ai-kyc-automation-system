Create:

```text
docs/reports/sprint-3/sprint-3-document-upload-ocr-integration.md
```

Paste the following report into the file.

---

# Sprint 3 – Secure Document Upload and OCR Integration

## 1. Sprint Information

### Sprint Name

Sprint 3 – Secure Document Upload and OCR Integration

### Sprint Duration

[Insert Sprint 3 start date] – [Insert Sprint 3 completion date]

### Sprint Status

Completed Successfully

### Sprint Objective

The objective of Sprint 3 was to design and implement a secure identity-document upload and Optical Character Recognition module for the AI-Driven KYC Automation System.

The module enables an authenticated customer to:

- Select an approved document type.
- Upload one JPEG or PNG document for their KYC application.
- Store the original document durably in MongoDB GridFS.
- Extract textual information using Tesseract.js.
- Record OCR confidence and processing status.
- Compare the extracted name with the name submitted in the KYC application.
- Retrieve document metadata and OCR results.
- Safely handle malformed files, duplicate uploads, unauthorized access, OCR interruption, and server restarts.

Sprint 3 established the document-processing foundation required for subsequent risk assessment and administrative review functionality.

---

## 2. Sprint Scope

Sprint 3 covered:

- Sprint design review and architectural decisions.
- Multer and Tesseract.js dependency verification.
- KYC document schema implementation.
- Secure multipart upload middleware.
- MongoDB GridFS file storage.
- Reusable Tesseract.js OCR worker.
- In-memory serialized OCR processing queue.
- SHA-256 document-integrity hashing.
- OCR text and confidence storage.
- Basic customer-name verification.
- Protected document API endpoints.
- Full JPEG and PNG decoding with Sharp.
- Invalid and malformed image rejection.
- Interrupted OCR startup recovery.
- Functional, validation, authorization, security, and regression testing.
- Sprint evidence collection and documentation.

The following capabilities remained outside Sprint 3:

- PDF document support.
- Multiple documents for one KYC application.
- Customer document replacement.
- Biometric face verification.
- Liveness detection.
- Document authenticity verification.
- Persistent Redis-backed OCR queues.
- Distributed OCR workers.
- Administrative review and decision workflows.

---

## 3. Approved Design Decisions

### 3.1 Supported File Formats

The MVP accepts:

```text
image/jpeg
image/png
```

PDF support was excluded because Tesseract.js does not directly process PDFs without first converting pages into images. Restricting the MVP to JPEG and PNG reduced implementation complexity and provided a controlled academic scope.

---

### 3.2 Maximum Upload Size

The maximum permitted compressed upload size is:

```text
5 MB
```

The limit is enforced through Multer before the document enters the service layer.

---

### 3.3 Decoded Image Pixel Limit

The system also enforces a decoded-image limit of:

```text
25,000,000 pixels
```

The compressed file-size limit and decoded-pixel limit protect against different risks:

- The 5 MB limit controls HTTP request and memory-buffer size.
- The pixel limit controls the amount of image data decoded by Sharp.

---

### 3.4 Approved Document Types

Customers may select one of the following document types:

```js
;['national_id', 'passport', 'drivers_license', 'voters_card', 'utility_bill']
```

---

### 3.5 One Document Per Application

The MVP allows:

```text
One KYC application → One uploaded document
```

The customer may choose any approved document type, but a second upload for the same application is rejected.

This rule is enforced through:

- A service-layer existence check.
- A unique database index on `applicationId`.
- MongoDB duplicate-key handling.

---

### 3.6 Persistent File Storage

MongoDB GridFS was selected for original-document storage.

This decision was based on the deployment environment: local files stored on Render’s free-tier filesystem are not guaranteed to persist across restarts and deployments.

GridFS creates:

```text
kycDocuments.files
kycDocuments.chunks
```

The `KYCDocument` metadata record stores the corresponding GridFS ObjectId.

---

### 3.7 OCR Processing Strategy

Sprint 3 uses:

```text
Synchronous Tesseract.js OCR
One reusable English-language worker
One in-memory serialized promise queue
```

The reusable worker avoids repeatedly paying the initialization cost associated with creating a new OCR worker for every request.

The promise-chain queue ensures that multiple incoming requests do not attempt to use the same Tesseract worker concurrently.

---

### 3.8 Persistent Queue Decision

A Redis-backed persistent OCR queue was deferred beyond the MVP.

The in-memory queue is sufficient for:

- A low-volume academic prototype.
- A single Node.js application instance.
- One reusable OCR worker.
- Synchronous document processing.

A production version would require a durable queue when OCR jobs must survive restarts, support retries, run across several instances, or scale independently from the API.

---

### 3.9 Submitted-Document Policy

The customer cannot:

- Upload a second document.
- Replace an existing document.
- Change the document type after upload.
- Edit OCR or verification results.
- Set document ownership or processing status through the request body.

Document replacement may be introduced later through a controlled administrative workflow.

---

## 4. System Architecture

Sprint 3 preserved the approved layered architecture:

```text
Route
  ↓
Authentication middleware
  ↓
Upload and file-validation middleware
  ↓
Controller
  ↓
Document-processing service
  ↓
Image validation / OCR / GridFS services
  ↓
Mongoose models
  ↓
MongoDB and GridFS
```

### Component Responsibilities

| Layer                     | Responsibility                                         |
| ------------------------- | ------------------------------------------------------ |
| Route                     | Defines protected document endpoints                   |
| Authentication middleware | Validates JWT and attaches `req.user`                  |
| Upload middleware         | Applies Multer limits and multipart validation         |
| Controller                | Handles HTTP requests and responses                    |
| Document service          | Enforces ownership and business rules                  |
| Image-validation service  | Fully decodes JPEG and PNG files using Sharp           |
| GridFS service            | Stores, retrieves, and deletes file content            |
| OCR service               | Reuses one Tesseract worker and serializes recognition |
| Name-verification service | Compares application names with OCR text               |
| Recovery service          | Recovers interrupted OCR records during startup        |
| Model                     | Defines document metadata, constraints, and statuses   |
| MongoDB / GridFS          | Persists records, metadata, and uploaded files         |

---

## 5. Final Document Processing Workflow

```text
Authenticated customer
        ↓
Multer memory upload
        ↓
5 MB file-size enforcement
        ↓
JPEG/PNG MIME validation
        ↓
File-signature validation
        ↓
Verify application ownership
        ↓
Confirm application is pending
        ↓
Enforce one-document restriction
        ↓
Full Sharp image decoding
        ↓
Confirm MIME and decoded format agree
        ↓
Enforce decoded-pixel limit
        ↓
Generate SHA-256 file hash
        ↓
Store original document in GridFS
        ↓
Create KYCDocument metadata record
        ↓
Queue OCR operation
        ↓
Reusable Tesseract worker extracts text
        ↓
Store OCR text and confidence
        ↓
Compare OCR name with application name
        ↓
Store verification result and score
```

---

## 6. KYC Document Schema

The `KYCDocument` model contains the following groups of fields.

### Ownership

- `applicationId`
- `userId`

### GridFS Relationship

- `gridFsFileId`

### Document Information

- `documentType`
- `originalName`
- `mimeType`
- `fileSize`
- `fileHash`

### OCR Information

- `ocrStatus`
- `extractedText`
- `ocrConfidence`
- `processingError`

### Name Verification

- `verificationStatus`
- `nameMatchScore`

### System Fields

- `createdAt`
- `updatedAt`

The schema enforces one document per KYC application through a unique `applicationId`.

---

## 7. Document Processing Statuses

### OCR Status

```text
pending
processing
processed
failed
```

The normal workflow is:

```text
pending → processing → processed
                     ↘ failed
```

### Verification Status

```text
pending
matched
needs_review
failed
```

OCR and identity-name verification are kept separate.

A document may therefore have:

```text
ocrStatus: processed
verificationStatus: needs_review
```

This means the system successfully extracted text but did not find a sufficient name match.

---

## 8. Secure Upload Middleware

The secure upload middleware was implemented with:

```js
multer.memoryStorage()
```

It enforces:

- One file per request.
- The required file-field name `document`.
- A maximum file size of 5 MB.
- JPEG and PNG MIME types.
- JPEG and PNG file signatures.
- One permitted text field: `documentType`.
- Rejection of unexpected multipart fields.
- Rejection of duplicated `documentType` values.
- Controlled Multer error responses.

### Multipart Request

```text
documentType | Text | national_id
document     | File | customer-document.png
```

The following are not accepted from the request body:

```text
applicationId
userId
applicationStatus
ocrStatus
verificationStatus
nameMatchScore
gridFsFileId
```

The application ID comes from the route, while the user ID comes from the authenticated JWT context.

---

## 9. Multipart Validation Correction

During API testing, a valid Postman request returned:

```http
400 Bad Request
```

with:

```text
Too many multipart fields were provided
```

The original Multer configuration used strict `fields` and `parts` counters. These limits proved brittle with multipart requests generated by Postman.

The correction:

- Retained file-size and one-file limits.
- Retained `.single("document")`.
- Removed brittle multipart-part counting.
- Explicitly inspected `req.body`.
- Allowed only `documentType`.
- Rejected duplicated or unexpected text fields.

This preserved upload security while improving compatibility and maintainability.

---

## 10. MongoDB GridFS Storage

The GridFS service was implemented to:

- Store an uploaded memory buffer.
- Generate an internal UUID-based filename.
- Preserve the original filename only as metadata.
- Store application and user ownership metadata.
- Store MIME type, document type, and file hash.
- Retrieve GridFS metadata by ObjectId.
- Delete files and associated chunks.
- Clean up GridFS files when metadata creation fails.

The following relationship was verified:

```text
KYCDocument.gridFsFileId
        =
kycDocuments.files._id
```

The matching GridFS metadata includes:

- `applicationId`
- `userId`
- `documentType`
- `originalName`
- `mimeType`
- `fileHash`
- `uploadedAt`

---

## 11. SHA-256 File Integrity

The system generates a SHA-256 hash directly from the uploaded file buffer.

The hash is stored in:

```text
KYCDocument.fileHash
```

and in:

```text
kycDocuments.files.metadata.fileHash
```

This provides a basis for:

- File-integrity verification.
- Duplicate-document analysis.
- Audit evidence.
- Detection of unexpected content changes.

---

## 12. Reusable OCR Worker

The OCR service creates one reusable English-language Tesseract worker.

The worker is initialized only when first required and reused for later requests.

```text
Request A ─┐
Request B ─┼→ Promise queue → Reusable OCR worker
Request C ─┘
```

The worker is terminated during controlled shutdown or verification-script cleanup.

### OCR Results

The OCR service returns:

```js
{
  ;(extractedText, ocrConfidence)
}
```

OCR confidence is normalized to a range of:

```text
0–100
```

Extracted text is normalized by:

- Converting Windows line endings.
- Reducing repeated spaces.
- Removing excessive blank lines.
- Trimming surrounding whitespace.

---

## 13. Serialized Promise Queue

The OCR service uses a promise-chain queue:

```js
const recognitionTask = recognitionQueue.then(() => performRecognition(buffer))

recognitionQueue = recognitionTask.catch(() => undefined)

return recognitionTask
```

This pattern ensures that:

- OCR operations execute one at a time.
- Each caller receives its actual success or failure.
- A failed task does not permanently reject the queue.
- Later OCR tasks remain operational.

The internal queue receives a recovered promise, while the caller receives the original task promise.

### Limitation

The queue exists only in one Node.js process.

It does not provide:

- Persistence after restart.
- Coordination across several servers.
- Durable retries.
- Distributed workers.
- Long-running job monitoring.
- Job priority.

A production deployment should use a persistent queue and background workers.

---

## 14. Basic OCR Name Verification

The name-verification service compares the KYC application’s `fullName` with the OCR-extracted text.

The algorithm:

- Converts text to uppercase.
- Uses Unicode normalization.
- Removes diacritical marks.
- Removes punctuation.
- Reduces repeated whitespace.
- Ignores name order.
- Ignores common titles.
- Compares complete name tokens.
- Removes duplicated tokens.
- Calculates a percentage match score.

Ignored title tokens include:

```text
MR
MRS
MISS
MS
DR
PROF
CHIEF
ALHAJI
ALHAJA
```

### Matching Threshold

```text
75%
```

For multi-token names, at least two name tokens must match.

### Example: Match

```text
Application:
Babajide Ibiayo

OCR:
SURNAME IBIAYO
GIVEN NAME BABAJIDE
```

Result:

```json
{
  "verificationStatus": "matched",
  "nameMatchScore": 100
}
```

### Example: Review Required

```text
Application:
Babajide Ibiayo

OCR:
FULL NAME TEST CUSTOMER
```

Result:

```json
{
  "verificationStatus": "needs_review",
  "nameMatchScore": 0
}
```

This distinction confirms that OCR success does not automatically mean identity-data verification success.

---

## 15. Full Image Decoding with Sharp

Initial upload validation checked MIME type and image magic bytes.

A deliberately malformed PNG containing only the PNG signature passed that check and reached Tesseract. The underlying decoder crashed the server before the OCR failure handler could update the document record.

The persistent state became:

```text
GridFS file: stored
KYCDocument: stored
ocrStatus: processing
verificationStatus: pending
Server process: terminated
```

A retry correctly returned `409 Conflict` because the one-document restriction detected the previously stored record.

### Root Cause

The file-signature check confirmed only the beginning of the file. It did not prove the image was complete and decodable.

### Corrective Action

Sharp was introduced as a full image-decoding gate.

The service now:

- Fully decodes the image using `toBuffer()`.
- Uses strict warning handling.
- Enforces the 25-million-pixel limit.
- Confirms the decoded format is JPEG or PNG.
- Confirms decoded format matches the declared MIME type.
- Rejects truncated and malformed content.
- Rejects text files renamed as images.
- Rejects unsupported dimensions.

Sharp validation executes before:

```text
SHA-256 hashing
GridFS storage
KYCDocument creation
Tesseract OCR
```

### Corrected Malformed-Image Result

```http
415 Unsupported Media Type
```

```json
{
  "success": false,
  "message": "The uploaded file is not a valid decodable JPEG or PNG image"
}
```

The malformed image now creates:

```text
No GridFS file
No GridFS chunks
No KYCDocument record
No OCR operation
No server crash
```

A valid image was successfully uploaded immediately afterward, proving no record had been created by the rejected request.

---

## 16. Interrupted OCR Recovery

Sharp protects the worker from malformed image data, but a server may still stop unexpectedly because of:

- Infrastructure restart.
- Deployment restart.
- Process termination.
- Resource exhaustion.
- Unexpected runtime failure.
- Host failure.

A document record may therefore remain in:

```text
ocrStatus: processing
```

The `ocrRecoveryService` was implemented to handle this condition.

### Startup Recovery Workflow

```text
MongoDB connection established
        ↓
Find old records with ocrStatus: processing
        ↓
Mark records as failed
        ↓
Preserve original GridFS file
        ↓
Start listening for HTTP requests
```

Recovered records receive:

```text
ocrStatus: failed
verificationStatus: failed
extractedText: null
ocrConfidence: null
nameMatchScore: null
processingError:
"OCR processing was interrupted before completion"
```

### Recovery Cutoff

The service accepts a date cutoff and modifies only records older than the recovery operation.

This prevents newly created records from being incorrectly selected.

### Idempotency

The recovery service was tested twice against the same record.

The first execution modified the interrupted record.

The second execution modified zero records because the document was no longer in `processing`.

This confirmed that the recovery operation is idempotent.

### MVP Limitation

Startup recovery is suitable for the current single-instance MVP.

A multi-instance production system would require:

- Job ownership.
- Worker leases.
- Persistent queues.
- Heartbeats.
- Retry counters.
- Distributed locking.

---

## 17. Protected API Endpoints

Sprint 3 implemented:

| Method | Endpoint                                                    | Purpose                       |
| ------ | ----------------------------------------------------------- | ----------------------------- |
| POST   | `/api/v1/applications/:applicationId/documents`             | Upload and process a document |
| GET    | `/api/v1/applications/:applicationId/documents`             | Retrieve document records     |
| GET    | `/api/v1/applications/:applicationId/documents/:documentId` | Retrieve one document record  |

All endpoints are protected by:

```js
router.use(authenticate)
```

---

## 18. Ownership and Authorization

Document ownership is derived from:

```text
req.user._id
```

The system does not trust user ownership supplied through multipart fields.

The ownership query combines:

```text
Authenticated user ID
Application ID
Document ID, where applicable
```

A customer attempting to access another customer’s application or document receives:

```http
404 Not Found
```

Using `404` instead of revealing an authorization distinction reduces information disclosure.

---

## 19. API Response Behaviour

### Successful Upload

```http
201 Created
```

```json
{
  "success": true,
  "message": "KYC document uploaded and processed successfully",
  "document": {
    "ocrStatus": "processed",
    "verificationStatus": "matched",
    "nameMatchScore": 100
  }
}
```

### Successful OCR with Name Mismatch

```http
201 Created
```

```json
{
  "success": true,
  "document": {
    "ocrStatus": "processed",
    "verificationStatus": "needs_review",
    "nameMatchScore": 0
  }
}
```

### Duplicate Upload

```http
409 Conflict
```

```json
{
  "success": false,
  "message": "A document has already been uploaded for this KYC application"
}
```

### Malformed Image

```http
415 Unsupported Media Type
```

### Oversized Image

```http
413 Payload Too Large
```

### Invalid Multipart Request

```http
400 Bad Request
```

### Unauthorized Request

```http
401 Unauthorized
```

### Cross-Customer Access

```http
404 Not Found
```

---

## 20. Functional Testing Results

| Test Case                            | Expected Result | Outcome |
| ------------------------------------ | --------------: | ------: |
| Multer dependency verification       |            Pass |    Pass |
| Tesseract dependency verification    |            Pass |    Pass |
| Valid PNG decoding                   |            Pass |    Pass |
| Valid JPEG decoding                  |            Pass |    Pass |
| GridFS file storage                  |            Pass |    Pass |
| GridFS metadata retrieval            |            Pass |    Pass |
| GridFS file deletion                 |            Pass |    Pass |
| Reusable OCR worker initialization   |            Pass |    Pass |
| First OCR request                    |            Pass |    Pass |
| Second OCR request using same worker |            Pass |    Pass |
| OCR text extraction                  |            Pass |    Pass |
| OCR confidence storage               |            Pass |    Pass |
| SHA-256 file hash storage            |            Pass |    Pass |
| KYC document metadata persistence    |            Pass |    Pass |
| GridFS and metadata relationship     |            Pass |    Pass |
| One-document restriction             |            Pass |    Pass |
| Exact name match                     |       `matched` |    Pass |
| Reordered name match                 |       `matched` |    Pass |
| Partial name match                   |  `needs_review` |    Pass |
| Empty OCR text                       |  `needs_review` |    Pass |
| Title-token exclusion                |            Pass |    Pass |
| Protected document upload            |           `201` |    Pass |
| Document-list retrieval              |           `200` |    Pass |
| Document-details retrieval           |           `200` |    Pass |
| Matching customer document           |     Score `100` |    Pass |
| Mismatched customer document         |       Score `0` |    Pass |

---

## 21. Validation and Security Testing

| Test Case                         |       Expected Result | Outcome |
| --------------------------------- | --------------------: | ------: |
| Upload without token              |                 `401` |    Pass |
| Upload with invalid token         |                 `401` |    Pass |
| Cross-customer upload             |                 `404` |    Pass |
| Cross-customer details access     |                 `404` |    Pass |
| Missing document file             |                 `400` |    Pass |
| Unsupported document type         |                 `400` |    Pass |
| Unsupported MIME type             |                 `415` |    Pass |
| Text file renamed as PNG          |                 `415` |    Pass |
| Malformed PNG                     |                 `415` |    Pass |
| File above 5 MB                   |                 `413` |    Pass |
| Wrong file-field name             |                 `400` |    Pass |
| Unexpected text field             |                 `400` |    Pass |
| Malformed application ID          |                 `400` |    Pass |
| Nonexistent application           |                 `404` |    Pass |
| Malformed document ID             |                 `400` |    Pass |
| Nonexistent document              |                 `404` |    Pass |
| Duplicate document upload         |                 `409` |    Pass |
| Upload to non-pending application |                 `409` |    Pass |
| Declared MIME mismatch            |                 `415` |    Pass |
| Excessive decoded pixels          |                 `415` |    Pass |
| Interrupted OCR recovery          | Failed state recorded |    Pass |
| OCR recovery idempotency          |      No second update |    Pass |

---

## 22. Regression Testing

The following automated verification commands passed after the final implementation:

```bash
npm run verify:image-validation
npm run verify:ocr-recovery
npm run verify:ocr-service
npm run verify:gridfs
npm run verify:document-processing
npm run verify:name-matching
```

The following existing workflows also remained operational:

- API health endpoint.
- User login.
- Protected customer profile.
- KYC application creation.
- KYC application retrieval.
- KYC application details retrieval.
- Document upload.
- Document-list retrieval.
- Document-details retrieval.

The API health endpoint returned:

```http
200 OK
```

after Sharp integration and OCR recovery integration.

---

## 23. Security Controls Verified

Sprint 3 verified:

- JWT authentication on all document endpoints.
- Ownership derived from authenticated server-side context.
- Cross-customer document access prevention.
- One-document-per-application enforcement.
- Pending-application upload restriction.
- Explicit document-type allowlist.
- Explicit MIME-type allowlist.
- File-size enforcement.
- One-file upload enforcement.
- Exact multipart file-field validation.
- Unexpected multipart field rejection.
- JPEG and PNG magic-byte validation.
- Full image decoding before OCR.
- Decoded-pixel limit.
- MIME and decoded-format comparison.
- SHA-256 file hashing.
- Generated internal GridFS filenames.
- Invalid MongoDB ID handling.
- Generic not-found responses.
- GridFS cleanup after metadata failure.
- OCR interruption recovery.
- Non-disclosure of internal server errors.

---

## 24. Issues Encountered and Resolved

### 24.1 Multipart Field-Count Error

**Problem:** A valid Postman form-data request returned “Too many multipart fields.”

**Cause:** Strict Multer `fields` and `parts` counters proved brittle.

**Resolution:** Explicit request-body validation replaced multipart-part counting.

---

### 24.2 Mismatched Customer Name

**Problem:** The synthetic OCR fixture contained `Test Customer`, while the selected application contained another name.

**Result:** OCR succeeded, but verification returned:

```text
needs_review
score: 0
```

**Resolution:** A dedicated Test Customer application was created. The same fixture then produced:

```text
matched
score: 100
```

This confirmed both match and mismatch workflows.

---

### 24.3 Malformed Image Crashed the Server

**Problem:** An eight-byte PNG signature passed magic-byte validation and reached Tesseract.

**Impact:**

- Server process terminated.
- GridFS file remained stored.
- `KYCDocument` remained in `processing`.
- Retry returned `409`.

**Resolution:**

- Added full Sharp image decoding.
- Added MIME/format comparison.
- Added decoded-pixel limits.
- Moved validation before storage and OCR.
- Added startup recovery for interrupted records.

---

### 24.4 Stranded Processing Record

**Problem:** A persisted record remained in `processing` after the server crash.

**Resolution:** The startup recovery service marks stale processing records as failed before the server accepts requests.

---

## 25. Lessons Learned

### Technical Lessons

- MIME type and file extension are not sufficient proof of valid image content.
- Magic-byte validation is useful but cannot replace full decoding.
- Untrusted image input should be fully decoded before reaching complex OCR libraries.
- Compressed file limits and decoded-pixel limits address different attack surfaces.
- Business-rule checks should occur before expensive image processing.
- GridFS provides durable storage but requires explicit metadata relationships.
- A unique database index must supplement service-layer duplicate checks.
- OCR success and identity-data verification must remain separate states.
- A reusable worker requires controlled serialization.
- Promise-chain queues must recover from rejected tasks.
- Persistent multi-stage workflows require crash-consistency planning.
- Startup recovery provides a practical resilience mechanism for a single-instance MVP.
- Defensive error handling is still required even when input validation is strong.

### Project Management Lessons

- Baseline tags provide a safe restoration point before architectural changes.
- Root-cause correction is more valuable than modifying code solely to satisfy a test.
- Negative testing can reveal architectural weaknesses that positive testing does not.
- Evidence should be captured while implementation context is still fresh.
- Descriptive screenshot filenames simplify Chapter 4 compilation.
- Small commits make corrective work easier to audit.
- Separate implementation, security, regression, and resilience evidence improves traceability.

---

## 26. Sprint Retrospective

### What Went Well

- The approved Sprint 3 scope was completed.
- GridFS storage worked reliably.
- OCR extraction achieved high confidence on controlled fixtures.
- The reusable worker processed multiple requests successfully.
- The serialized queue remained operational after task completion.
- Name verification handled exact, reordered, partial, empty, and mismatched cases.
- Upload, list, and details APIs worked correctly.
- Authentication and ownership controls passed.
- The malformed-image defect was identified before sprint closure.
- The defect was corrected at its root using full decoding.
- Interrupted processing recovery was implemented and tested.
- Existing Sprint 1 and Sprint 2 functions remained stable.
- Evidence and Git history remained synchronized.

### What Could Be Improved

- Manual Postman testing still forms a large part of API validation.
- Common service-error creation is repeated across modules.
- Controller error-handling logic is partially duplicated.
- Mongoose’s `__v` field remains visible in some API responses.
- Full response DTOs have not yet been introduced.
- OCR processing remains synchronous.
- The in-memory queue cannot survive a restart.
- The MVP does not support replacing rejected or failed documents.
- No formal administrative retry action exists.
- No structured log correlation ID is attached to document-processing requests.

### Actions for Future Sprints

- Preserve the layered architecture.
- Continue testing negative and cross-customer scenarios.
- Introduce shared error and response utilities when appropriate.
- Hide internal database fields from client responses.
- Export and version the Postman collection.
- Add automated HTTP integration tests.
- Add audit logging for administrative actions.
- Add a controlled retry or replacement workflow.
- Consider a persistent queue as a production-readiness enhancement.
- Monitor OCR confidence and name-match performance during system evaluation.

---

## 27. Improvement Backlog

The following improvements are outside the required Sprint 3 scope:

1. Persistent Redis-backed OCR job queue.
2. Dedicated OCR background worker.
3. OCR retry counters and retry scheduling.
4. Administrative failed-document retry.
5. Customer document replacement workflow.
6. PDF conversion and multi-page document support.
7. Automated HTTP integration testing.
8. Shared application-error class.
9. Centralized Express error middleware.
10. API response DTOs.
11. Removal of `__v` from external responses.
12. Structured logging and request correlation IDs.
13. Distributed OCR job ownership and leases.
14. OCR progress/status polling.
15. Document virus or malware scanning.
16. Encryption-key management enhancements.
17. Document retention and deletion policies.
18. Advanced fuzzy-name matching.
19. Nigerian name-order and compound-name evaluation.
20. Document authenticity checks.
21. Biometric face matching.
22. Liveness detection.

---

## 28. Evidence Register

The following Sprint 3 evidence was captured and tracked:

```text
01-ocr_dependencies_installed_and_verified.png
02-kyc_document_schema_implementation.png
03-secure_document_upload_middleware.png
04-gridfs_document_storage_service.png
05-mongodb_gridfs_collections_verified.png
06-reusable_ocr_worker_service.png
07-ocr_worker_service_verified.png
08-kyc_document_processing_service.png
09-document_processing_service_verified.png
10-basic_ocr_name_verification_service.png
11-ocr_name_verification_verified.png
12-kyc_document_controller.png
13-protected_kyc_document_routes.png
14-kyc_document_uploaded_and_processed.png
15-kyc_document_list_retrieved.png
16-kyc_document_details_retrieved.png
17-kyc_document_record_verified_in_mongodb.png
18-ocr_name_mismatch_flagged_for_review.png
19-gridfs_uploaded_document_verified.png
20-document_upload_without_token_denied.png
21-document_upload_invalid_token_denied.png
22-cross_customer_document_upload_denied.png
23-cross_customer_document_details_access_denied.png
24-document_upload_missing_file_rejected.png
25-unsupported_document_type_rejected.png
26-unsupported_file_mime_rejected.png
27-unsupported_media_type_rejected.png
28-oversized_document_rejected.png
29-wrong_field_name_rejected.png
30-unexpected_text_field_rejected.png
31-malformed_application_id_rejected.png
32-nonexistent_application_rejected.png
33-invalid_document_id_rejected.png
34-nonexistent_document_id_rejected.png
35-duplicate_document_upload_rejected.png
36-nonpending_application_upload_rejected.png
37-pre_sharp_regression_baseline_passed.png
38-image_validation_service.png
39-image_validation_service_verified.png
40-image_validation_integrated_before_storage.png
41-malformed_image_rejected_before_ocr.png
42-post_sharp_integration_regression_passed.png
43-valid_image_processed_after_sharp_integration.png
44-interrupted_ocr_recovery_service.png
45-interrupted_ocr_recovery_verified.png
46-startup_ocr_recovery_integrated.png
47-startup_interrupted_ocr_record_recovered.png
48-final_sprint3_security_regression_passed.png
49-sprint3_document_ocr_module_structure.png
50-github_commit_history_sprint3.png
```

Screenshot 50 will be replaced after the Sprint 3 closure report commit so the final history includes the complete sprint.

---

## 29. Sprint Acceptance Checklist

| Requirement                             |    Status |
| --------------------------------------- | --------: |
| Sprint 3 design review completed        | Completed |
| JPEG and PNG support implemented        | Completed |
| PDF excluded from MVP                   | Completed |
| 5 MB file-size limit implemented        | Completed |
| 25-million-pixel limit implemented      | Completed |
| Multer memory storage implemented       | Completed |
| Secure multipart validation implemented | Completed |
| One document per application enforced   | Completed |
| GridFS storage implemented              | Completed |
| GridFS relationship verified            | Completed |
| SHA-256 file hashing implemented        | Completed |
| Reusable OCR worker implemented         | Completed |
| Serialized OCR queue implemented        | Completed |
| OCR text extraction implemented         | Completed |
| OCR confidence stored                   | Completed |
| Basic name verification implemented     | Completed |
| Match and review outcomes tested        | Completed |
| Protected upload endpoint implemented   | Completed |
| Document-list endpoint implemented      | Completed |
| Document-details endpoint implemented   | Completed |
| Cross-customer access blocked           | Completed |
| Malformed images rejected before OCR    | Completed |
| MIME mismatch rejected                  | Completed |
| Oversized decoded images rejected       | Completed |
| Interrupted OCR recovery implemented    | Completed |
| OCR recovery idempotency verified       | Completed |
| Security testing completed              | Completed |
| Regression testing completed            | Completed |
| Evidence captured                       | Completed |
| Sprint report completed                 | Completed |

---

## 30. Sprint Outcome

Sprint 3 was completed successfully.

The AI-Driven KYC Automation System now provides a secure and resilient document-processing module that supports:

- Authenticated identity-document upload.
- JPEG and PNG validation.
- Durable MongoDB GridFS storage.
- SHA-256 file-integrity hashing.
- Tesseract.js OCR text extraction.
- OCR confidence recording.
- Basic name verification.
- Match and manual-review outcomes.
- Secure metadata retrieval.
- One-document-per-application enforcement.
- Cross-customer access prevention.
- Full image decoding before OCR.
- Recovery of interrupted OCR records after restart.

### Final Sprint Assessment

```text
Sprint Status: COMPLETED
Outcome: SUCCESSFUL
Architecture Compliance: EXCELLENT
Functional Testing: PASSED
Validation Testing: PASSED
Security Testing: PASSED
Resilience Testing: PASSED
Regression Testing: PASSED
Evidence Quality: EXCELLENT
Documentation Quality: EXCELLENT
```

### Recommendation

Proceed to Sprint 4, focusing on the next approved KYC verification or risk-assessment capability defined in the project implementation roadmap.
