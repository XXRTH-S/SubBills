# Security and privacy status

This is a local prototype, not an authenticated service. Do not treat the login screen, demo session flag, hidden amounts, or HTTP headers as protection against someone with access to the browser profile. Personal data is still stored unencrypted in localStorage. There is no server database, account isolation, or real password reset.

## Implemented

- Validate stored and submitted card/subscription records: safe IDs, bounded text, four optional card digits, integer cents, supported cycles, real calendar dates, unique IDs and card references.
- Only approved fields are serialized. Passwords, session identifiers and unexpected card fields are excluded from the application data model.
- Corrupt storage is not silently overwritten. Valid records can be displayed, writes are blocked, and the original can be downloaded for recovery. Users can explicitly clear the device after preserving a backup.
- Failed writes roll back the in-memory application state. UI totals do not imply a payment was saved when storage failed.
- Cancel/close/Escape in nested card creation restores the subscription draft. Drafts remain in memory only.
- Privacy controls mask displayed amounts and last-four digits, export validated data, and clear this app's local records/preferences/demo session after confirmation. Other websites' data is not touched.
- External font requests removed. Nunito and Mali are served locally with their OFL licenses in assets/fonts.
- The loopback development server serves only allowlisted files, accepts GET/HEAD, validates Host, sends no-store, no-referrer, nosniff, frame restrictions, permissions restrictions and a restrictive CSP. Inline script/eval, form submission and network connections from scripts are disallowed.
- Inline style attributes are permitted for progress-bar widths. No equivalent exception is made for inline scripts. This is not a production server.

## Data inventory

| Data | Purpose | Storage / deletion |
| --- | --- | --- |
| Service name, cents, billing cycle and date, card reference | Cost dashboard and reminders | localStorage, explicit device deletion |
| Card nickname, optional issuer and last four digits | Identify payment method | localStorage, explicit device deletion |
| Read and paid occurrence keys | User-recorded status | localStorage, explicit device deletion |
| Language, masking preference | Interface preference | localStorage, device deletion |
| Demo access flag | Keep the prototype open in the current tab | sessionStorage, leave demo or device deletion |
| Email/password entered in mock login | UI demonstration only | Not sent or saved; removed on submit or navigation |
| Downloaded exports/recovery files | User-controlled backup | User's download folder; app deletion cannot remove these files |

No analytics, tracking pixels, bank access or card-payment processing is implemented. The application does not log entered form values. Browser extensions, developer tools and other software on the device are outside this boundary. Exports contain personal data, even when on-screen amounts are masked.

## Required before production

1. Choose hosting, database and identity provider. Implement real server-verified sessions, per-user authorization on every object, CSRF protection and rate limiting.
2. Move personal records off browser storage; retain only non-sensitive UI preferences. Require explicit review before any migration from prototype data to an account.
3. Serve over HTTPS, enforce appropriate secure cookie attributes and HSTS at the production edge; do not add HSTS to a plain-HTTP loopback preview.
4. Define retention/deletion, encrypted backups, key/secret management, staff permissions, audit-log redaction and incident ownership.
5. Test cross-account access, session revocation, password recovery, backup restoration and deletion propagation. Current browser tests are not a full security audit.

## Verification

`npm test` covers recurrence calculations and schema validation. `node scripts/webapp-qa.cjs [path-to-playwright-package]` tests isolated Chrome contexts using synthetic data, including storage failures, draft recovery, privacy controls and security headers. Results are written to output/playwright/webapp-test. Never use real personal data in screenshots or test fixtures.

Google OAuth local pilot: PKCE and server-side in-memory access tokens, HttpOnly SameSite=Lax opaque cookie; expires on server restart or access-token expiry. /auth/status verifies the token with Supabase. Database account mode is not implemented. The preview now allows same-origin fetch for Auth. Production session storage, refresh, rate limiting, and deployment hardening remain pending.
