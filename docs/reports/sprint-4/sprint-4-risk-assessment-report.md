# Sprint 4 Report

## Rule-Based KYC Risk Assessment and Simulated Watchlist Screening

### Project

Design and Implementation of an AI-Driven KYC Automated System for Risk Mitigation in Nigerian Financial Institutions

### Sprint

Sprint 4

### Sprint Status

Completed

---

## 1. Sprint Overview

Sprint 4 implemented a transparent and auditable rule-based KYC risk-assessment module.

The module automatically evaluates a customer's KYC application after document OCR processing reaches a final state. It combines OCR quality, customer-name verification, duplicate identity-document detection and simulated watchlist screening to calculate a risk score.

The calculated score is classified as low, medium or high risk. The system then produces a recommendation indicating whether the application may proceed, requires manual review or should be escalated.

The implementation was designed to be deterministic, explainable and suitable for academic demonstration. Every material risk factor is stored with its score contribution and assessment reason.

---

## 2. Sprint Objectives

The objectives of Sprint 4 were to:

1. Define transparent KYC risk rules, weights and thresholds.
2. Create a persistent risk-assessment data model.
3. implement exact-match simulated watchlist screening.
4. Build a pure and reusable risk-scoring engine.
5. Orchestrate document, application and watchlist data during assessment.
6. Trigger risk assessment automatically after OCR processing.
7. Provide a protected customer-facing risk-assessment endpoint.
8. verify low-, medium- and high-risk scenarios.
9. Enforce application ownership and server-controlled risk calculation.
10. Conduct regression, security and evidence-validation testing.

All Sprint 4 objectives were completed.

---

## 3. Implemented Components

### 3.1 Risk Constants and Policies

The central risk configuration was implemented in:

`src/config/riskConstants.js`

It defines:

- Risk-score limits.
- Risk thresholds.
- Risk levels.
- Assessment statuses.
- Recommendations.
- Watchlist statuses.
- Risk-factor codes.
- Risk-factor definitions.
- OCR-confidence bands.
- Name-match score bands.
- Duplicate identity-document policies.
- Rules version.

The implemented score thresholds are:

| Risk score | Risk level | Recommendation |
| ---------: | ---------- | -------------- |
|       0–29 | Low        | Proceed        |
|      30–59 | Medium     | Manual review  |
|     60–100 | High       | Escalate       |

The rules version for Sprint 4 is `1.0`.

---

### 3.2 RiskAssessment Model

The persistent risk-assessment schema was implemented in:

`src/models/RiskAssessment.js`

The model stores:

- Application relationship.
- Customer relationship.
- Document relationship.
- Assessment status.
- Total risk score.
- Risk level.
- Recommendation.
- Manual-review requirement.
- Material risk factors.
- Human-readable assessment reasons.
- Simulated watchlist-screening details.
- Assessment input snapshot.
- Rules version.
- Assessment error information.
- Assessment timestamp.

A unique application constraint ensures that only one risk-assessment record exists for each KYC application.

Schema validation also ensures that completed and failed assessments contain consistent values.

---

### 3.3 Simulated Watchlist Screening

The fictional watchlist dataset was implemented in:

`src/data/simulatedWatchlist.js`

The screening service was implemented in:

`src/services/watchlistService.js`

The service performs exact normalized matching against fictional names and aliases.

Fuzzy matching was deliberately excluded to avoid unexplained or inconsistent results.

A successful match returns:

- Match status.
- Fictional watchlist reference.
- Matched name.
- Simulation indicator.
- Screening timestamp.

The dataset contains only fictional demonstration records and is not connected to a live sanctions or regulatory database.

A watchlist match overrides the calculated score and produces:

- Risk score: 100.
- Risk level: High.
- Recommendation: Escalate.
- Manual review required: Yes.

---

### 3.4 Pure Risk-Scoring Engine

The deterministic scoring engine was implemented in:

`src/services/riskScoringService.js`

The engine accepts a validated input object and returns:

- Risk score.
- Risk level.
- Recommendation.
- Review requirement.
- Material risk factors.
- Assessment reasons.

The engine does not access the database and does not modify the supplied input.

This separation makes the scoring rules independently testable.

The principal implemented rules include:

| Condition                               |    Score impact |
| --------------------------------------- | --------------: |
| OCR processing failure                  |             +60 |
| OCR produced no usable text             |             +40 |
| OCR confidence below 50%                |             +30 |
| OCR confidence between 50% and 74.99%   |             +15 |
| OCR confidence between 75% and 84.99%   |              +5 |
| Total customer-name mismatch            |             +60 |
| Name-match score below 50%              |             +35 |
| Name-match score between 50% and 74.99% |             +20 |
| Duplicate identity-document hash        |             +40 |
| Watchlist screening unavailable         |             +20 |
| Simulated watchlist match               | Override to 100 |

The score is capped at 100.

OCR failure takes precedence over dependent name-verification rules. This prevents the same underlying processing failure from producing duplicate penalties.

---

### 3.5 Risk-Assessment Orchestration

The orchestration service was implemented in:

`src/services/riskAssessmentService.js`

The service:

1. Validates the application and customer identifiers.
2. Confirms customer ownership of the application.
3. Retrieves the submitted KYC document.
4. Confirms that OCR processing has reached a final state.
5. Detects duplicate identity-document hashes across customers.
6. Executes simulated watchlist screening.
7. Calls the pure risk-scoring engine.
8. Creates or updates the single assessment for the application.
9. Stores the assessment input snapshot and rules version.
10. Persists controlled failure information when assessment cannot be completed.

Utility-bill hashes are excluded from duplicate identity-document scoring because multiple legitimate customers may share the same residential document.

---

### 3.6 Automatic Assessment After OCR

Risk assessment was integrated into:

`src/services/kycDocumentService.js`

The risk-assessment process runs automatically after document OCR reaches either:

- `processed`, or
- `failed`.

Successful document processing returns the document result together with a safe risk-assessment summary.

When risk assessment fails, the system attempts to persist a failed assessment record without corrupting the completed document-processing result.

The implementation also maintains the existing OCR recovery and document-processing behaviour introduced in Sprint 3.

---

### 3.7 Customer Risk-Assessment Endpoint

The protected customer endpoint was implemented as:

`GET /api/v1/applications/:applicationId/risk-assessment`

The route is protected by JWT authentication.

The controller and service enforce customer ownership. A customer cannot retrieve another customer's application or assessment.

The customer response contains only:

- Assessment status.
- Risk score.
- Risk level.
- Recommendation.
- Review requirement.
- Assessment reasons.
- Assessment timestamp.

Internal information is not exposed, including:

- Watchlist reference identifiers.
- Matched watchlist names.
- Internal scoring factors.
- Assessment input snapshots.
- Internal error details.
- Database relationship identifiers.
- Rules-version metadata.

---

## 4. Risk Scenarios Verified

### 4.1 Low-Risk Scenario

The controlled low-risk fixture used:

- OCR status: Processed.
- OCR confidence: 95%.
- Customer name: Matched.
- Name-match score: 100%.
- Watchlist result: Clear.
- Duplicate identity document: No.

Result:

- Risk score: 0.
- Risk level: Low.
- Recommendation: Proceed.
- Manual review required: No.
- Material risk factors: None.

---

### 4.2 Medium-Risk Scenario

The controlled medium-risk fixture used:

- OCR status: Processed.
- OCR confidence: 70%.
- Customer-name verification: Needs review.
- Name-match score: 66.67%.
- Watchlist result: Clear.
- Duplicate identity document: No.

Risk contributions:

- Low OCR confidence: +15.
- Partial customer-name match: +20.

Result:

- Risk score: 35.
- Risk level: Medium.
- Recommendation: Manual review.
- Manual review required: Yes.

---

### 4.3 High-Risk Name-Mismatch Scenario

The total name-mismatch fixture produced:

- Name no-match risk factor: +60.
- Risk score: 60.
- Risk level: High.
- Recommendation: Escalate.
- Manual review required: Yes.

---

### 4.4 High-Risk OCR-Failure Scenario

The OCR-failure fixture produced:

- OCR-failed risk factor: +60.
- Risk score: 60.
- Risk level: High.
- Recommendation: Escalate.
- Manual review required: Yes.

The test confirmed that no additional name-verification penalty was added.

---

### 4.5 Simulated Watchlist-Match Scenario

The fictional name `Sanctioned Test Customer` matched simulated watchlist reference `SIM-WL-001`.

Result:

- Watchlist-match override applied.
- Risk score: 100.
- Risk level: High.
- Recommendation: Escalate.
- Manual review required: Yes.

---

## 5. Validation and Security Controls

Sprint 4 verified the following controls:

- Authentication is required for customer risk retrieval.
- Invalid tokens are rejected.
- Cross-customer retrieval is denied.
- Cross-customer reassessment is denied.
- Malformed application identifiers are rejected.
- Malformed customer identifiers are rejected.
- Nonexistent applications return controlled errors.
- Assessment cannot run without a submitted document.
- Assessment cannot run while OCR processing remains incomplete.
- Missing risk assessments return a controlled not-found response.
- Risk scores and recommendations are calculated only by the server.
- Client-supplied risk fields are ignored.
- One assessment is maintained per KYC application.
- Customer responses exclude internal watchlist and scoring information.

Risk scoring does not use gender, occupation, nationality, age, ethnicity or residential location.

---

## 6. Testing Approach

Sprint 4 used purpose-built verification scripts for:

- Risk constants.
- RiskAssessment schema.
- Simulated watchlist screening.
- Pure risk scoring.
- Risk-assessment orchestration.
- Automatic assessment after OCR.
- Customer risk retrieval.
- Low-risk assessment.
- Medium-risk assessment.
- High-risk and watchlist assessment.
- Validation and security controls.
- Full regression testing.
- Evidence-sequence and duplicate-content auditing.

The reusable PowerShell regression script is stored in:

`tests/regression_tests.ps1`

The evidence-audit script is stored in:

`tests/sprint4_evidence_audit.ps1`

The regression suite confirmed that the Sprint 4 implementation did not break the Sprint 3 OCR, image-validation, GridFS, document-processing or name-matching functionality.

The API health check returned HTTP status `200`.

---

## 7. Evidence

Sprint 4 contains 27 numbered screenshots stored in:

`docs/screenshots/sprint-4`

The evidence set covers:

- Risk constants and schema.
- Watchlist implementation.
- Pure scoring engine.
- Assessment orchestration.
- Automatic assessment after OCR.
- Protected customer retrieval.
- Low-risk verification.
- Medium-risk verification.
- High-risk and watchlist verification.
- Security validation.
- Full regression and health testing.

The complete evidence inventory and SHA-256 audit results are documented in:

`docs/reports/sprint-4/sprint-4-evidence-register.md`

The audit confirmed:

- Screenshot sequence 01–27 is complete.
- No duplicate sequence numbers exist.
- No exact duplicate screenshot content exists.
- All screenshot filenames follow the required convention.

Security behaviours already demonstrated by earlier sprint evidence were referenced rather than captured repeatedly.

---

## 8. Key Outcomes

Sprint 4 delivered:

1. A transparent and versioned KYC risk policy.
2. A deterministic risk-scoring engine.
3. Persistent and explainable risk-assessment records.
4. Simulated exact-match watchlist screening.
5. Duplicate identity-document detection.
6. Automatic risk assessment after OCR.
7. Safe customer-facing risk summaries.
8. Ownership-based access control.
9. Controlled high-risk escalation.
10. Reusable regression and evidence-audit scripts.

---

## 9. Limitations

The Sprint 4 implementation has the following deliberate limitations:

- The watchlist dataset is fictional and intended only for system demonstration.
- No live sanctions, politically exposed person or adverse-media service is connected.
- Watchlist screening uses exact normalized matching rather than fuzzy matching.
- Risk weights are rule-based and have not been statistically calibrated using production financial-institution data.
- Duplicate detection relies on identical uploaded file hashes.
- Manual officer review and administrative decision workflows are deferred to Sprint 5.
- The customer cannot dispute or respond to an assessment within the Sprint 4 interface.

These limitations are appropriate for the defined academic prototype scope.

---

## 10. Sprint Acceptance

Sprint 4 is accepted as complete because:

- All planned implementation tasks were completed.
- Low-, medium- and high-risk scenarios passed.
- Watchlist override behaviour passed.
- Validation and security tests passed.
- Regression tests passed.
- API health testing passed.
- Evidence audit passed.
- The working tree was clean and synchronized with the remote `develop` branch.

---

## 11. Next Sprint

Sprint 5 will implement the administrative and KYC-officer review workflow.

Planned functionality includes:

- Officer access to assigned or review-required applications.
- Detailed internal assessment information.
- Risk-factor and watchlist-review display.
- Manual KYC decision recording.
- Approval, rejection and escalation actions.
- Decision notes and audit logging.
- Administrative monitoring and reporting.
