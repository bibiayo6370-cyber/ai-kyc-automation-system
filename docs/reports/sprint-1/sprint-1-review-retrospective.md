# Sprint 1 Review & Retrospective

## Sprint Information

### Sprint Name

**Sprint 1** – Authentication & User Management

**Sprint Duration**

18/06/2026 – 25/06/2026

**Sprint Objective**

Design and implement a secure authentication and user management subsystem that provides registration, login, JWT-based authentication, and protected user access for the AI-Driven KYC Automation System.

## Sprint Outcome

### Sprint Status
✅ Completed Successfully

### Objective Achievement

All planned Sprint 1 objectives were completed successfully.

The authentication subsystem now supports:

- User registration
- Password hashing using bcrypt
- User login
- JWT token generation
- JWT token verification
- Protected API routes
- Authenticated user profile retrieval
- MongoDB persistence

The implemented authentication layer provides the security foundation required for all subsequent KYC workflows.

## Activities Completed

### Infrastructure
- Backend project initialized
- MongoDB Atlas integration completed
- Environment configuration completed
- GitHub repository initialized
- Authentication Module
- Users model implemented
- Registration service implemented
- Registration endpoint implemented
- Password hashing implemented using bcrypt
- JWT token utility implemented
- Login service implemented
- Login endpoint implemented
- JWT authentication middleware implemented
- Protected profile endpoint implemented

### Testing
- Registration endpoint tested successfully
- Duplicate email validation tested successfully
- Login endpoint tested successfully
- Invalid login handling tested successfully
- Protected route access validation tested successfully
- MongoDB document persistence verified

## Architectural Decisions Implemented

### Authentication Strategy

JWT (JSON Web Token) selected for authentication and session management.

### Benefits
- Stateless authentication
- Scalability
- Industry adoption
- Suitable for REST APIs

## Password Security
Passwords are never stored in plaintext.

Passwords are hashed using bcrypt before storage in MongoDB.

### Benefits
- Improved security
- Protection against credential disclosure
- Alignment with security best practices

## Access Control Strategy

Protected routes require valid JWT authentication.

Authentication logic is centralized using middleware.

### Benefits
- Separation of concerns
- Reusability
- Maintainability
- Reduced code duplication

## Layered Architecture

### Implemented architecture:

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

### Benefits
- Modular design
- Easier testing
- Improved maintainability
- Future scalability

## Issues Encountered

**Issue 1** – MongoDB Atlas IP Restrictions
**Description**
MongoDB Atlas initially rejected incoming connections because the current public IP address was not whitelisted.

**Root Cause**
ISP-assigned dynamic IP address changed during development.

**Resolution**
Temporary development access was configured using:

```0.0.0.0/0```

<hr>

**Issue 2** – Module Import Errors
**Description**
Authentication dependencies failed to load.

**Root Cause**
Incorrect package names used in import statements.

**Examples:**
```import bcrypt from "bcryptjs";```
when bcrypt was installed.

and
```import jwt from "jasonwebtoken";```
instead of:
```import jwt from "jsonwebtoken";```

**Resolution**
Corrected import statements and dependency references.

<hr>

**Issue 3** – Missing JWT Secret
**Description**
User registration succeeded but token generation failed.

**Root Cause**
JWT_SECRET was missing from the environment configuration.

**Resolution**
Added JWT_SECRET to the .env file.

<hr>

**Issue 4** – JWT Payload Property Mismatch
**Description**
Authenticated requests returned:

```
  {
    "success": false,
    "message": "User not found"
  }
```
despite successful token verification.

**Root Cause**
JWT payload was initially created using:

```
  {
   user: user._id
  }
```
while the middleware expected:
```decoded.userId```

**Resolution**
JWT payload structure was standardized to:
```
{
  userId: user._id,
  email: user.email,
  role: user.role
}
```
A new token was generated and authentication testing repeated successfully.

<hr>

## Testing Results

| Test Case                        | Expected Result           | Outcome |
| -------------------------------- | ------------------------- | ------- |
| User Registration                | User created successfully | ✅ Pass  |
| Duplicate Registration           | Email rejected            | ✅ Pass  |
| User Login                       | JWT returned              | ✅ Pass  |
| Invalid Password                 | HTTP 401 Unauthorized     | ✅ Pass  |
| Protected Route Without Token    | Access denied             | ✅ Pass  |
| Protected Route With Valid Token | User profile returned     | ✅ Pass  |
| MongoDB Persistence              | User document stored      | ✅ Pass  |

## Screenshots Captured

### Sprint 1 Evidence

authentication_project_structure.png

user_registration_success.png

duplicate_email_validation.png

mongodb_user_document.png

user_login_success.png

invalid_login_attempt.png

protected_profile_access_denied.png

protected_profile_access_granted.png

## Pending Sprint Closure Evidence

github_commit_history.png

github_repository_structure_sprint1.png

<hr>

## Lessons Learned

### Technical Lessons
- Native Node.js environment variable support can replace dotenv in modern Node.js applications.
- JWT verification throws exceptions and should always be protected by error handling.
- Middleware is ideal for handling authentication and other cross-cutting concerns.
- Controllers should focus on application-specific business logic.
- Consistent JWT payload design is important for maintainability.

### Project Lessons
- Early testing significantly reduces debugging effort.
- Incremental implementation makes troubleshooting easier.
- Maintaining sprint documentation during development improves project reporting quality.
- Capturing screenshots as development progresses simplifies Chapter 4 preparation.

## Retrospective

### What Went Well

- Sprint objectives were achieved.
- Authentication architecture remained consistent with Chapter 3 design.
- MongoDB integration was successful.
- GitHub version control workflow established.
- Testing uncovered issues early.
- Debugging process was systematic and effective.

## What Could Be Improved
- Environment configuration should be verified earlier.
- JWT payload structure should be standardized before implementation begins.
- More frequent commits could improve traceability of changes.

## Actions for Sprint 2
- Maintain the same layered architecture.
- Continue evidence capture for Chapter 4.
- Continue sprint reporting process.
- Implement KYC Application Management module.
- Reuse authentication middleware for all protected KYC endpoints.

## Sprint 1 Final Assessment

```
Sprint Status: COMPLETED
Outcome: SUCCESSFUL
Overall Assessment: PASS
Sprint Velocity: High
Code Quality: Good
Architecture Compliance: Excellent
Documentation Quality: Excellent
```