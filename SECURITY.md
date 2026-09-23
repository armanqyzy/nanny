# Nanny Security Overview

This document describes the production-oriented security controls added to the Nanny platform backend.

## Authentication

- Passwords are hashed with `bcrypt` using 12 salt rounds before storage.
- Plaintext passwords are never stored in the database.
- Login uses secure bcrypt comparison.
- JWT access tokens expire after 7 days by default.
- JWT signing uses `JWT_SECRET` from the environment.
- In production, the API refuses to rely on an insecure fallback secret.

## Validation

- Incoming request bodies, params, and query strings are validated with `zod`.
- Validation is applied to the most sensitive flows:
  - registration and login
  - bookings
  - chat messages
  - uploads
  - sitter search/map filters
  - support tickets
  - checkout payloads
- Validation errors return safe `400` responses with clear field-level messages.

## Rate Limiting

- A global API rate limit restricts clients to 100 requests per IP per 15 minutes.
- Authentication routes use a stricter limiter.
- Failed login attempts are additionally tracked in memory and temporarily blocked after repeated failures.

## Security Headers

- `helmet` is enabled to harden the API against common attacks.
- Protections include:
  - XSS mitigation
  - clickjacking protection
  - MIME sniffing protection
  - Content Security Policy

## CORS

- Cross-origin requests are restricted to known frontend origins only.
- Default allowed origins:
  - `http://localhost:3000`
  - `https://nanny.app`
- You can override these with `CORS_ORIGIN`, using a comma-separated list.

## SQL Injection Protection

- The backend uses PostgreSQL parameterized queries (`$1`, `$2`, etc.).
- User input is never interpolated directly into SQL values.
- Dynamic filters are limited to known-safe SQL fragments while values remain parameterized.

## File Upload Security

- Uploads are size-limited.
- MIME types are restricted.
- Extensions are restricted and checked against the upload kind.
- Dangerous file types are rejected.
- Allowed file types are limited to safe image formats and PDF where explicitly needed.

## Authorization

- Role checks are enforced with middleware.
- Admin endpoints require the `admin` role.
- Owner-only actions such as creating pets or bookings are restricted.
- Sitter-only actions such as updating sitter services and verification are restricted.
- Unauthorized access returns `403 Forbidden`.

## Error Handling

- Centralized error handling returns safe JSON responses.
- Internal stack traces are hidden in production.
- Errors are still logged server-side for debugging and incident response.

## Logging

- `morgan` logs:
  - request method
  - request path
  - response status
  - response duration

## Recommended Production Practices

- Set strong environment secrets:
  - `JWT_SECRET`
  - `DATABASE_URL`
  - `CORS_ORIGIN`
- Run the API behind HTTPS and a reverse proxy.
- Store uploads in object storage with malware scanning in a future iteration.
- Add refresh-token rotation and token revocation if you need long-lived sessions.
- Add external monitoring, audit logs, and alerting for admin/security events.
