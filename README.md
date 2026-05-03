# Banking API

This repository contains the beginnings of a banking backend built with Node.js, Express, and PostgreSQL.

## Features included so far
- Authentication and role-based access control
- Customer account creation and account retrieval
- Deposit, withdrawal, and fund transfer operations
- Transaction history lookup
- Loan application and approval flow
- Counter ticket queue support
- Security staff records management
- Audit-ready database schema with ACID-friendly transactions

## Getting started
1. Copy `API/.env.example` to `API/.env`.
2. Set `DATABASE_URL`, `JWT_SECRET`, and `PORT`.
3. Run `npm install` inside the `API` folder if dependencies are not installed.
4. Start the server:

```bash
cd API
npm start
```

## Database schema
The PostgreSQL schema is available in `API/db/schema.sql`.

## API routes
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/accounts/open`
- `GET /api/accounts/mine`
- `GET /api/accounts/:accountNumber`
- `POST /api/transactions/transfer`
- `POST /api/transactions/deposit`
- `POST /api/transactions/withdraw`
- `GET /api/transactions/history/:accountNumber`
- `POST /api/loans/apply`
- `PUT /api/loans/approve/:loanId`
- `GET /api/loans/status`
- `GET /api/tickets/counters`
- `POST /api/tickets/request`
- `POST /api/tickets/:ticketId/call`
- `POST /api/security/staff`
- `GET /api/security/staff`
- `GET /api/admin/dashboard`
- `GET /api/docs` (Swagger UI)

## Notes
- Keep your real database credentials out of version control.
- Use role-based JWT tokens to secure the system.
