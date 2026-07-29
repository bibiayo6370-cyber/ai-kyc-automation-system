# Sprint 5 Implementation Report

## 1. Sprint Overview

**Project:** AI-Driven KYC Automated System for Risk Mitigation in Nigerian Financial Institutions  
**Sprint:** Sprint 5 — Administrator Review, Customer Status and Frontend Integration  
**Branch:** develop  
**Status:** Completed

Sprint 5 implemented the end-to-end KYC review workflow, including customer application creation, identity-document processing, automated risk assessment, Administrator review and customer-visible final decisions.

## 2. Sprint Objectives

The objectives of Sprint 5 were to:

- implement KYC review states and decision policies;
- provide secure Administrator review endpoints;
- provide a safe customer application-status endpoint;
- implement the Administrator and Customer frontend portals;
- integrate OCR, identity verification and risk-assessment results;
- complete the customer submission-to-decision workflow;
- improve frontend responsiveness, accessibility and production performance;
- verify the implementation through automated regression tests and evidence auditing.

## 3. Backend Implementation

### 3.1 KYC Review States

The following application states were supported:

- pending;
- under_review;
- approved;
- rejected.

The supported Administrator actions were:

- approve;
- reject;
- retain_under_review.

Final decisions were made immutable to prevent an approved or rejected application from being altered subsequently.

### 3.2 Administrator Review Queue

The Administrator review queue provided:

- secure Administrator-only access;
- status and risk filtering;
- pagination;
- newest-first ordering;
- safe application summaries;
- input validation.

### 3.3 Administrator Application Details

The application-detail endpoint presented authorised Administrators with:

- customer information;
- document metadata;
- OCR results;
- name-verification results;
- duplicate-document results;
- internal risk factors;
- watchlist screening results;
- chronological audit events.

### 3.4 Administrator Decisions

Administrators could approve, reject or retain an application under review.

Rejection and retain-under-review actions required review comments. Approval comments were optional.

Each action generated an append-only audit record containing the action, Administrator identity, timestamp and review comments.

### 3.5 Customer Status Endpoint

Customers could retrieve only applications that belonged to their authenticated account.

The endpoint exposed a safe customer-facing response containing:

- application status;
- safe risk summary;
- final-decision date;
- appropriate review comments.

Internal watchlist details, audit information and confidential risk-assessment inputs were not disclosed.

## 4. Frontend Implementation

### 4.1 Authentication and Role Protection

The React frontend implemented:

- JWT session handling;
- protected routes;
- Administrator and Customer role separation;
- inactive-session handling;
- automatic redirection;
- secure logout.

### 4.2 Administrator Portal

The Administrator portal included:

- dashboard;
- review queue;
- filters and pagination;
- application-detail page;
- OCR and verification information;
- risk and watchlist sections;
- audit timeline;
- decision form;
- decision validation and confirmation.

### 4.3 Customer Portal

The Customer portal included:

- KYC application creation;
- customer identity-data validation;
- supported document-type selection;
- JPEG and PNG upload;
- upload-progress feedback;
- OCR and risk-processing feedback;
- pending and under-review states;
- approved and rejected final-decision states.

### 4.4 Complete KYC Workflow

The completed workflow was:

1. The customer registered and authenticated.
2. The customer created a KYC application.
3. The customer selected one supported identity-document type.
4. The customer uploaded one JPEG or PNG document.
5. The backend validated and stored the document.
6. OCR extracted text from the document.
7. The customer name was verified against the extracted document name.
8. Automated risk assessment was performed.
9. The application transitioned automatically from pending to under_review.
10. The Administrator reviewed the application.
11. The Administrator approved, rejected or retained the application.
12. The customer viewed the final status and safe decision comments.

## 5. Security Controls

Sprint 5 implemented and verified:

- JWT authentication;
- role-based access control;
- customer ownership enforcement;
- inactive and suspended account restrictions;
- Administrator-only review endpoints;
- safe customer responses;
- final-decision immutability;
- append-only audit records;
- upload size and MIME-type validation;
- JPEG and PNG binary-signature validation;
- one-document-per-application enforcement;
- upload blocking after review began;
- public registration restricted to the customer role.

## 6. Responsive Design and Accessibility

The frontend was improved with:

- responsive Administrator navigation;
- mobile sidebar behaviour;
- keyboard-accessible navigation;
- Escape-key sidebar dismissal;
- skip-to-main-content links;
- visible focus indicators;
- accessible labels;
- reduced-motion support;
- horizontally scrollable queue tables;
- mobile-friendly Customer status cards.

## 7. Performance Optimisation

React route-level lazy loading and code splitting were implemented.

The production build generated separate chunks for pages, layouts, services and reusable components. The previous warning for a JavaScript bundle exceeding 500 kB was removed.

The largest generated JavaScript bundle was approximately 285.75 kB before gzip compression.

## 8. Verification Results

### Backend

The following verification suites passed:

- KYC review constants;
- KYC application review validation;
- audit-log model and service;
- Administrator authorisation;
- Administrator review queue;
- Administrator application details;
- Administrator decision service;
- Administrator decision endpoint;
- customer application status;
- risk-assessment retrieval;
- document-processing service;
- Sprint 5 evidence audit.

### Frontend

The following checks passed:

- 4 frontend test files;
- 15 frontend tests;
- ESLint;
- Vite production build.

### Evidence Audit

The evidence audit confirmed:

- screenshot sequence 01–42 was complete;
- no duplicate sequence numbers existed;
- no exact duplicate screenshot content existed;
- all screenshot filenames were valid.

The evidence register is available at:

`docs/reports/sprint-5/sprint-5-evidence-register.md`

## 9. Problems Resolved

### Multipart Document Upload

The document upload initially failed because the Axios client applied a global `application/json` content type.

The global content-type header was removed, allowing the browser to generate the correct multipart boundary automatically for `FormData` requests.

### Evidence Numbering Gap

Screenshot number 37 had originally been reserved for responsive testing. Customer workflow implementation was later inserted before that task, creating a numbering gap.

Screenshots 38–43 were renumbered to 37–42, restoring a complete evidence sequence without creating unnecessary evidence.

## 10. Sprint Deliverables

Sprint 5 delivered:

- secure KYC review backend;
- Administrator review and decision portal;
- Customer application and status portal;
- OCR and risk-processing integration;
- end-to-end customer submission-to-decision workflow;
- responsive and accessible frontend;
- optimised production build;
- automated regression verification;
- audited evidence register.

## 11. Known Limitations

The current implementation is an academic MVP.

External production services such as live government identity databases, commercial watchlist providers and production biometric-liveness services remain outside the present project scope.

The system uses controlled OCR, verification and risk-assessment components to demonstrate the proposed architecture and workflow.

## 12. Sprint Closure

Sprint 5 successfully completed the functional MVP workflow required for the project.

A customer can now submit KYC data and an identity document, receive automated OCR and risk processing, enter the Administrator review queue and receive a final decision through the Customer portal.

Sprint 5 is therefore recommended for closure.
