# TableSync staging acceptance report

> Status: Not executed

This report must contain redacted facts and links to protected provider/CI evidence, never credentials or raw user data.

## Deployment identity

| Field | Recorded value |
|---|---|
| Acceptance UTC start/end | Pending |
| Staging URL | Pending |
| Hosting provider/project (redacted identifier) | Pending |
| Deployment ID | Pending |
| Commit SHA | Pending |
| Rollback deployment ID / commit | Pending |
| Managed PostgreSQL provider/project (redacted identifier) | Pending |
| Runtime role fingerprint | Pending |
| Migration role fingerprint | Pending |
| Migration head | `20260802023000_security_audit` expected |
| Operator/reviewer | Pending |

## Provider and recovery controls

| Gate | Required evidence | Result |
|---|---|---|
| Non-local HTTPS and canonical domain | `/api/health` plus provider deployment record | Pending |
| Pooled runtime/direct migration separation | Provider connection metadata and `deployment:validate` | Pending |
| TLS and minimum privilege | `docs/evidence/staging/database-security.json` | Pending |
| Backup/PITR policy | Provider policy, retention, newest recovery point | Pending |
| Disposable restore | Source/target fingerprints, counts, elapsed RTO, smoke result | Pending |
| Migration failure rehearsal | Failed-state/repair transcript with secrets redacted | Pending |
| Application rollback | Previous deployment activation and health proof | Pending |

## Real authentication lifecycle

| Scenario | Expected | Result |
|---|---|---|
| GitHub cancel/deny | Safe error recovery; no session | Pending |
| Successful callback | Correct account persisted; no provider tokens retained | Pending |
| Reload/cold instance | Session remains valid | Pending |
| Cookie attributes | HttpOnly, Secure, SameSite=Lax, Path=/ | Pending |
| Logout/revocation | Prior Cookie rejected; database session removed | Pending |
| Test auth route | HTTP 404 | Pending |

## Automated gate

| Command/gate | Required result | Actual result/evidence |
|---|---|---|
| `npm run deployment:validate` | Pass | Pending |
| `npx prisma validate` | Pass | Pending |
| `npm run db:deploy` twice | Pass; second has no pending migration | Pending |
| `npm run db:seed` twice | Pass; invariant counts unchanged | Pending |
| `npx prisma migrate status` | Up to date, no failed migration | Pending |
| `npm run db:verify-security` | Pass | Pending |
| `npm run lint` | Pass | Pending |
| `npm run typecheck` | Pass | Pending |
| `npm run test` | All pass | Pending |
| `npm run test:db` | All pass | Pending |
| `npm run security:secrets` | No committed/history secret | Pending |
| `npm audit --omit=dev --audit-level=high` | No unaccepted high/critical production finding | Pending |
| `npm run build` | Pass, no unexplained warning/error | Pending |
| `npm run test:e2e:staging` | Chromium/Firefox/WebKit all pass | Pending |
| Axe and responsive review | 0 violations; 375x812, 768x1024, 1440x900 evidence | Pending |
| `npm run audit:performance` | All three-run medians meet thresholds | Pending |
| `npm run security:evidence` | No credential in evidence | Pending |

## Defect and log review

- Browser console/hydration/failed-request review: Pending
- Hosting log review: Pending
- Database log/connection review: Pending
- Known P0/P1/P2/P3 on acceptance paths: Pending
- Accepted exceptions, owner, expiry: None permitted without explicit written decision

## Decision

Final result: **NOT ACCEPTED** until every row above passes and the evidence ledger is updated.
