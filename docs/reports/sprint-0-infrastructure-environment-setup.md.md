# Development Log

## Sprint 0 – Project Infrastructure & Environment Setup

### Date
[17/06/2026]

### Activities Completed

- GitHub repository created and configured
- README created and published
- Project structure defined
- Initial commit pushed to GitHub
- MongoDB Atlas account and cluster created
- Render account created and connected to GitHub
- Backend project initialized using Node.js 22
- ES Module architecture configured
- Native environment variable support configured
- MongoDB Atlas connection established
- Express server implemented
- API health endpoint implemented and tested
- Development environment validated
- Initial backend commit pushed

### Isuues Encountered 

- MongoDB Atlas connection initially failed because the client IP address was not included in the Atlas Network Access List.
- ISP-assigned dynamic IP addresses caused repeated connectivity interruptions during development.

### Mitigation Actions

- Temporarily configured MongoDB Atlas network access to allow connections from 0.0.0.0/0 during development.
- Verified successful database connectivity after updating Atlas access rules.
- Planned to restrict database access before production deployment.

### Lessons Learned

- Modern Node.js (v22) provides native support for environment variable files and file watching, reducing dependency requirements.
- MongoDB Atlas network access configuration is critical for cloud database connectivity.
- Version control should be established before implementation begins.
- Early validation of infrastructure reduces downstream implementation risks.

### Next Actions

- Review and finalize Sprint 1 Authentication Design
- Create User schema
- Implement user registration endpoint
- Implement password hashing
- Implement JWT authentication
- Implement protected routes
- Initialize frontend application


