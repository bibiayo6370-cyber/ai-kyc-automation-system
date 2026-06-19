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

## Progress Update (19/06/2026)

### Activities Completed

The following Sprint 1 implementation activities have been completed:

* User schema created and validated using Mongoose.
* Authentication service implemented.
* JWT utility implemented.
* Authentication controller implemented.
* Authentication routes implemented.
* Registration endpoint successfully integrated into the Express application.
* MongoDB Atlas integration verified.
* Password hashing implemented using bcrypt.
* Registration workflow tested using Postman.
* User records successfully persisted to MongoDB Atlas.
* JWT token generation successfully verified.

### Testing Results

#### Registration Endpoint Test

Endpoint:

POST /api/v1/auth/register

Result:

* User registration completed successfully.
* HTTP Status 201 (Created) returned.
* JWT token generated and returned to client.
* User record successfully stored in MongoDB Atlas.
* Password stored as a hashed value rather than plain text.

#### Duplicate Registration Test

Result:

* Duplicate email validation correctly prevented creation of duplicate user accounts.
* Appropriate JSON error response returned.

This confirms that business rules for user uniqueness are functioning correctly.

### Issues Encountered

#### Issue 1 – Package Import Error

During implementation, a module import error occurred because the bcrypt package name was incorrectly referenced within the import statement.

Cause:

Package naming inconsistency between bcrypt and bcryptjs.

Resolution:

Corrected the import statement to match the installed package.

#### Issue 2 – JWT Package Import Typographical Error

A typographical error in the jsonwebtoken import statement caused a module loading failure.

Resolution:

Corrected the package name and verified successful application startup.

#### Issue 3 – Missing JWT Secret Configuration

The JWT_SECRET environment variable was initially omitted from the .env configuration file.

Observed Behaviour:

* User registration request failed.
* JWT token generation failed.
* User document was still successfully written to MongoDB Atlas.

Resolution:

Added JWT_SECRET configuration to the environment file and retested successfully.

### Lessons Learned

* Mongoose schema options must be defined separately from schema field definitions.
* Successful database operations may occur even when later application logic fails.
* Environment variables should be validated during application startup.
* API testing should include both positive and negative test cases.
* Incremental implementation and testing reduces debugging complexity.
* MongoDB Atlas provides immediate visibility into stored application data, making verification easier during development.

### Improvement Backlog

#### High Priority

* Implement login endpoint.
* Implement JWT verification middleware.
* Implement protected routes.
* Implement user profile endpoint.
* Validate JWT configuration during server startup.

#### Medium Priority

* Return HTTP 409 Conflict for duplicate email and phone number scenarios.
* Implement centralized error handling middleware.
* Implement request validation middleware.

#### Low Priority

* Add API documentation.
* Add automated endpoint testing.
* Add user activity logging for audit purposes.

### Current Sprint Status

Sprint 1 is currently in progress.

Completed Deliverables:

* User Model
* Registration Endpoint
* JWT Implementation
* Password Hashing
* Authentication Routes

Pending Deliverables:

* Login Endpoint
* Protected Route Middleware
* User Profile Endpoint

Estimated Completion:

Approximately 60–70% of Sprint 1 deliverables have been completed successfully.

### Next Actions

* Create User schema
* Implement authentication services
* Create registration endpoint
* Create login endpoint
* Implement JWT middleware
* Test authentication workflow
