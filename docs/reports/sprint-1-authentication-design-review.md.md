# Sprint 1 – Authentication & User Management Planning

### Date

18/06/2026 - 25/06/2026

### Sprint Objective

Design and implement the user authentication and user management components that will provide secure access control for the AI-Driven KYC Automated System.

### Design Review Decisions

#### Authentication Strategy

* JWT (JSON Web Token) selected for authentication.
* Passwords will be hashed using bcryptjs before storage.
* Protected routes will require a valid JWT token.

#### User Roles

Two user roles were approved:

1. Customer

   * Register account
   * Login
   * Submit KYC application
   * View application status

2. Admin

   * Review KYC applications
   * View risk scores
   * Approve or reject applications

#### Admin Account Strategy

It was agreed that administrator accounts will not be publicly registered through the application.

Administrator accounts will be created directly within MongoDB to prevent unauthorized administrative access and to align with real-world KYC system security practices.

#### User Schema Design

The Users collection will contain:

* fullName
* email
* phoneNumber
* passwordHash
* role - customer/admin
* status - active/inactive/suspended
* createdAt
* updatedAt

#### API Endpoints Approved

POST /api/v1/auth/register

POST /api/v1/auth/login

GET /api/v1/auth/profile

#### Architectural Decisions

The backend will adopt a layered architecture:

Route → Controller → Service → Model → MongoDB

This approach was selected to improve maintainability, scalability, and separation of concerns.

### Deliverables for Sprint 1

* User model
* Authentication routes
* Registration endpoint
* Login endpoint
* JWT implementation
* Password hashing
* Protected route middleware
* User profile endpoint

### Risks Identified

* Incorrect JWT implementation could expose protected resources.
* Weak password handling could create security vulnerabilities.
* Authentication design must remain consistent with future KYC modules.

### Mitigation Strategy

* Follow security best practices for password hashing.
* Validate all user input.
* Implement middleware-based route protection.
* Conduct endpoint testing using Postman.

### Next Actions

* Create User schema
* Implement authentication services
* Create registration endpoint
* Create login endpoint
* Implement JWT middleware
* Test authentication workflow
