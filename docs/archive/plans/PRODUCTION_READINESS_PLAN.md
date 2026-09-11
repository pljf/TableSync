# TableSync Production Readiness Plan

> Historical record. Status statements and verification results reflect the work recorded here. See the [archive index](../README.md) for context and current guides.

> **Status:** Local deployment-readiness repairs and final validation passed; ready to begin deployment setup. The hosted phase has not started, and the existing hosting/database services still need to be identified and inspected (2026-09-09).
> **Started:** 2026-08-01
> **Scope:** Production authentication, deny-by-default authorization, managed PostgreSQL staging, real staging deployment, and complete re-acceptance of the existing core MVP in that environment.

Current work and verification are tracked in [`docs/archive/reviews/DEPLOYMENT_READINESS_2026_09_09.md`](../reviews/DEPLOYMENT_READINESS_2026_09_09.md). The user has authorized local readiness fixes before deployment. Dependency auditing is available and has run; earlier npm-consent and named-provider blockers below are historical records, not current prerequisites. Hosted service configuration, authentication acceptance, recovery checks, and deployment evidence remain unverified.

## 1. Required outcome

TableSync is production-ready only when a real host can establish a secure session in the recorded authentication mode, every private read and write is authorized at the server-side data boundary, every guest mutation is scoped to the guest represented by a secure server-side session, and the application is running against a real managed PostgreSQL staging database on a non-local deployment. The current application supports guest-only access, or guest access with GitHub sign-in when both provider credentials are configured. The deployed commit must then pass the complete core acceptance contract in [`docs/archive/plans/CORE_MVP_EXECUTION_PLAN.md`](CORE_MVP_EXECUTION_PLAN.md) without waived failures or weakened thresholds.

Local success alone is not completion. If GitHub sign-in is enabled, a configured provider without a successful real callback is not completion; a recorded guest-only release must instead leave both GitHub credentials empty and pass the complete guest-session lifecycle. Hidden UI without server-side enforcement is not authorization. A deployment without an attributable commit, migration record, rollback procedure, and fresh staging evidence is not an accepted deployment.

## 2. Non-negotiable quality bar

- Deny access unless a documented rule explicitly permits the actor, action, resource, and current workflow state.
- Authenticate and authorize every Server Action and every private data read as though it were a public API endpoint.
- Derive host and guest identity only from verified server-side sessions. Never trust a form field, route identifier, Cookie value, or client state as proof of identity.
- Return only the fields required by the page or operation. Public and invite DTOs must never contain guest email, private preferences, edit credentials, activity metadata, invite credentials, or unrelated room data.
- Store no reusable guest credential in plaintext. Do not place an enduring edit credential in a normal application URL, rendered HTML, analytics payload, screenshot, or log.
- Keep production identity separate from deterministic test identity. Any test-only provider or bypass must fail closed outside an explicitly marked test process.
- Preserve the already accepted Dinner and Hotpot behavior, visual quality, responsiveness, accessibility, performance, and zero-console-error requirements.
- Accept zero known P0, P1, P2, or P3 defects on authentication, authorization, migration, deployment, or the core acceptance path.
- Never commit or expose database URLs, OAuth secrets, session secrets, guest credentials, recovery artifacts, or platform tokens.

## 3. Audited baseline

The initial audit found the following production blockers.

### Authentication and session blockers

- `src/lib/auth.ts` trusts the unsigned `tablesync_host` Cookie and accepts the demo host identifier as identity.
- `/auth` exposes a demo-host sign-in action; no OAuth route, callback, database session, revocation flow, or provider error handling exists.
- The demo-login path is not restricted to a test environment and therefore cannot be deployed safely.
- Host session cookies have no explicit production-only `secure` setting and no server-side session record to revoke.

### Authorization and data-boundary blockers

- `/rooms/[roomId]`, `/rooms/[roomId]/plans`, and `/rooms/[roomId]/shopping` load a complete room bundle by an attacker-controlled identifier without first requiring a permitted actor.
- `/join/[token]` resolves an invite to the complete private room bundle even though the page needs only a minimal invite projection.
- `/share/[roomId]` renders a limited view but the data function first loads the complete room bundle; the public boundary is therefore not least privilege.
- Host-sensitive mutations contain several ownership checks, but checks are dispersed through the store rather than enforced by one auditable policy boundary.
- Not-found and permission responses are inconsistent, creating resource-enumeration and information-disclosure risk.

### Guest credential and mutation blockers

- `Guest.editToken` is stored as a reusable plaintext unique value and is returned through domain objects.
- Guest edit credentials appear in `/preferences/[editToken]`, redirects, browser history, screenshots, and likely request logs.
- Voting trusts a client-supplied `guestId`, so any visitor can vote as any guest in a known room.
- Shopping assignment and purchased-state actions are callable without authentication and trust client-supplied item and guest identifiers.
- Join idempotency uses a client-bound submission key but has no abuse throttling or durable mutation ledger.

### Platform, database, and operational blockers

- No managed staging database, pooled runtime URL, direct migration URL, TLS proof, minimum-privilege role proof, backup/restore evidence, or recovery rehearsal exists.
- No non-local deployment configuration, deployment identifier, commit attribution, health check, rollback record, or staging acceptance report exists.
- CI omits ESLint, production dependency audit, secret scanning, browser acceptance, security tests, migration freshness, and deployment verification.
- `next.config.mjs` defines no explicit security headers or production host policy.
- No application-level rate limiting, security audit log, structured request correlation, or idempotency ledger exists for sensitive mutations.

## 4. Actor and permission matrix

All cells not explicitly marked **allow** are **deny**. Workflow-state checks remain an additional requirement after actor authorization succeeds.

| Resource / action | Anonymous | Authenticated non-owner host | Owning host | Room guest session | Public viewer |
|---|---:|---:|---:|---:|---:|
| Landing, auth entry, auth callback/error | Allow | Allow | Allow | Allow | Allow |
| List host rooms | Deny | Own rooms only | Own rooms only | Deny | Deny |
| Create room | Deny | Allow for self | Allow for self | Deny | Deny |
| Read private room overview, constraints, activity | Deny | Deny | Allow | Limited room-member DTO | Deny |
| Read invite landing | Minimal invite DTO | Minimal invite DTO | Minimal invite DTO | Minimal invite DTO | Minimal invite DTO |
| Join through valid, unexpired invite | Allow with rate/idempotency controls | Allow as a new guest | Allow as a new guest | Deny duplicate identity | Allow with rate/idempotency controls |
| Read/update guest preferences | Deny | Deny | Host may read; no impersonated edit | Own guest only | Deny |
| Generate/reopen plans; finalize/undo finalization | Deny | Deny | Allow | Deny | Deny |
| Read votable plans and totals | Deny | Deny | Allow | Same room only | Final public DTO only |
| Cast/change vote | Deny | Deny | Only through a room guest identity, never as host identity | Own vote only | Deny |
| Read shopping workflow | Deny | Deny | Allow | Same room, limited DTO | Public summary only when enabled |
| Assign/unassign shopping item | Deny | Deny | Any valid guest in own room | Claim unassigned item for self or release own item only | Deny |
| Change purchased state | Deny | Deny | Any item in own room | Own assigned item only | Deny |
| Read public final share | Only when sharing enabled and finalized | Same public DTO | Same public DTO | Same public DTO | Same public DTO |
| Read guest email, edit credential, auth account/session | Deny | Deny | Guest email only where operationally required; never credentials | Own email only; never credentials | Deny |

The “room guest session” is an application guest identity, separate from the host OAuth session. A single browser may hold both, but each mutation selects one explicit actor and never silently escalates a guest action to host authority.

## 5. Threat model and required controls

| Threat | Required control | Proof required |
|---|---|---|
| Forged host identity or session fixation | Better Auth GitHub OAuth with database-backed identity/session; session rotation and revocable logout; secure Cookie attributes | Real provider callback, session persistence, logout/revocation tests, Cookie inspection |
| IDOR across room, plan, guest, vote, or shopping IDs | Central actor/resource policy plus ownership predicates in the database transaction | Cross-user and cross-room negative integration/E2E tests |
| Guest impersonation | Opaque high-entropy credential exchanged for an HttpOnly guest session; hashed credential at rest; identity ignored from form data | Database inspection, forged/tampered Cookie tests, self-only mutation tests |
| Credential leakage | Tokenless post-claim URLs; no credential in DTO/log/screenshot/error; redaction rules | Secret scan, request-log review, screenshot/path review |
| CSRF | Same-origin Server Action enforcement, Better Auth OAuth state/PKCE and origin protections, strict allowed-origin deployment config, SameSite Cookies | Cross-origin negative test and deployment header/config evidence |
| Open redirect | Allow only normalized same-origin relative destinations; fixed provider callback destinations | Unit and browser negative tests |
| Replay/double submit | Server-side idempotency records for join and sensitive mutations; atomic unique constraints | Parallel/replay integration tests and audit records |
| Brute force and abuse | Shared deployment-compatible rate limiter on auth entry, invite resolution/join, guest claim, and mutations | Threshold, expiry, recovery, and multi-instance tests |
| User/resource enumeration | Uniform public failure responses and no existence-dependent private detail | Comparative negative response tests |
| Stored/reflected injection | React escaping, Zod bounds/normalization, CSP and browser security headers | Adversarial input tests and response-header evidence |
| Privilege drift during workflow changes | Authorization and workflow-state checks inside the same transaction before mutation | Race/concurrency database tests |
| Secret exposure | Platform-scoped secrets, least-privilege CI, no secret echo, repository/history scan | Scan report and platform variable inventory with values redacted |
| Database compromise or operator error | TLS, separate pooled/direct URLs, least-privilege roles, automated backups, tested restore, migration rollback/runbook | Role grants, TLS proof, backup metadata, restore and rollback rehearsal |

## 6. Architecture decisions

1. **Host authentication:** Better Auth 1.6 for Next.js with its Prisma adapter and GitHub OAuth. Better Auth provides database sessions, explicit revocation, OAuth state/PKCE, origin/open-redirect defenses, and database-backed rate limiting while supporting the current Next.js architecture. GitHub alone satisfies the first production provider gate.
2. **Host sessions:** Database sessions are preferred so logout and operator revocation have a durable server-side effect. Session-to-user mapping is revalidated at sensitive data boundaries.
3. **Guest sessions:** A separate opaque, high-entropy guest session Cookie references a hashed server-side credential/session record. The join response establishes this session and redirects to a tokenless route. No UI may choose another guest identity for a guest-scoped action.
4. **Authorization:** `src/lib/authorization` is the single deny-by-default policy vocabulary. Data-access functions accept a typed actor and return explicit DTOs. Store transactions re-check resource relationships immediately before writes.
5. **Auditability:** Sensitive successful and denied mutations receive a request correlation identifier and a structured audit event without secrets or raw credentials. User-facing errors remain generic; server logs preserve safe diagnostic context.
6. **Database connectivity:** `DATABASE_URL` is the TLS-required pooled runtime URL. `DIRECT_URL` is the TLS-required direct URL used only by protected migration, inspection, backup, restore, and acceptance jobs; it is rejected if exposed to the Web runtime. `TABLESYNC_DATABASE_SCOPE` makes that process boundary fail closed. Staging and local databases are never shared.
7. **Deployment:** The expected target is a managed Next.js platform plus managed PostgreSQL as already described in the long-term project plan. Final platform selection remains an external decision until account access or cost approval is required.

These decisions follow the current Next.js guidance to centralize secure authorization in a data-access layer and re-check every Server Action, the Better Auth Next.js/Prisma integration guidance, and the Prisma guidance to separate pooled runtime traffic from direct migration/admin traffic.

## 7. Execution phases

### Phase 0 — Inventory and baseline

Status: **Complete**

- Inventory every route, Server Action, store query/mutation, identifier, Cookie, environment variable, migration, test, and CI/deployment entry point.
- Record the current gaps, matrix, threat model, external decisions, and acceptance contract in this document.
- Preserve the completed core MVP as the regression baseline.

Exit criterion: every current entry point is classified and every known production blocker is represented in this plan.

### Phase 1 — Production host authentication foundation

Status: **Provider-independent implementation complete; real GitHub callback pending external credentials/domain**

- Add Better Auth, Prisma adapter models/migration, GitHub OAuth, custom sign-in/error presentation, callback route, database sessions, logout, and session revocation.
- Persist provider identity without overwriting existing rooms; verify account linking rules and normalized unique email behavior.
- Remove the demo Cookie and production demo-login path.
- Add a deterministic test-only identity mechanism that cannot be enabled in production.
- Add secure Cookie, redirect, callback error, expired/revoked session, and authentication lifecycle tests.

Exit criterion: a real provider user completes sign-in/callback, remains signed in across reload/restart, can sign out and be revoked, and no production request can obtain demo identity.

### Phase 2 — Guest identity and centralized deny-by-default authorization

Status: **Complete locally; staging negative matrix remains part of Phase 6**

- Implement typed actors, policy decisions, authorization errors, DTOs, and transaction-level relationship checks.
- Replace full-bundle reads with owner, room-member, invite, and public projections.
- Replace plaintext edit tokens and token URLs with a secure claim/session flow and migration.
- Bind preference edits, votes, and shopping changes to the server-derived guest identity.
- Enforce host ownership and public-share limitations on every page and mutation.
- Add systematic same-room, cross-room, cross-user, anonymous, tampered, stale, replay, and state-transition tests.

Exit criterion: the permission matrix has positive and negative automated coverage, and no application entry point accepts client-selected authority.

### Phase 3 — Security and operational hardening

Status: **Provider-independent controls complete; production audit and deployed log/header proof pending**

- Add a deployment-compatible shared rate limiter and mutation idempotency ledger.
- Add security/audit events, correlation IDs, redacted server diagnostics, and uniform public error semantics.
- Add CSP, HSTS in HTTPS deployments, nosniff, referrer, frame/embedding, permissions, and cache-control headers appropriate to each route.
- Verify CSRF, open redirects, session fixation, Cookie attributes, user enumeration resistance, secret hygiene, and dependency risk.
- Extend CI with lint, production audit, secret scan, security/unit/database suites, build, and acceptance prerequisites.

Exit criterion: all named controls have automated tests or inspectable deployment evidence and no unaccepted production high/critical dependency finding remains.

### Phase 4 — Managed PostgreSQL staging and migration/recovery rehearsal

Status: **Executable gates/runbook complete; real managed database, backup, and restore evidence pending external access**

- Provision an isolated managed PostgreSQL staging database with TLS, pooled runtime access, direct migration access, and minimum-privilege application/migration roles.
- Store secrets only in platform environment scopes; verify they never appear in logs or artifacts.
- Apply all versioned migrations with `prisma migrate deploy`, run the idempotent seed twice, and verify schema/data invariants.
- Capture backup policy and retention; perform a real disposable restore and application smoke test.
- Rehearse forward migration failure recovery and the documented application/database rollback path without `prisma migrate dev`, `db push`, or destructive reset.

Exit criterion: a fresh managed database can be migrated, seeded, backed up, restored, and used by the application with attributable, redacted evidence.

### Phase 5 — Real staging deployment

Status: **Remote workflow complete; real deployment pending external hosting access**

- Deploy the exact reviewed commit to a non-local HTTPS staging URL.
- Configure OAuth callback URL, platform secrets, pooled runtime database, direct migration job, allowed origins, health checks, and log redaction.
- Record commit SHA, deployment ID, environment, migration version, database branch/project identifier, and rollback target.
- Verify cold start, warm traffic, concurrent requests, provider callback, session persistence, logout, and rollback.

Exit criterion: the staging URL is healthy, attributable to one commit/deployment/database state, and can be rolled back through the documented procedure.

### Phase 6 — Complete staging re-acceptance

Status: **Local gate complete; complete staging rerun pending Phases 4-5**

- Run Prisma validation, fresh managed-database migration/seed, lint, type checking, unit tests, authorization/security tests, database integration tests, production build, dependency audit, and secret scan.
- Run authentication, authorization, Dinner, Hotpot, no-solution, destructive-recovery, guest self-service, voting, shopping, and public-share E2E against the actual staging URL.
- Pass Chromium, Firefox, and WebKit with fresh data; zero unexpected console errors, page errors, failed requests, or hydration warnings.
- Repeat the required responsive screenshots, keyboard review, automated Axe scans, and touch-target/overflow/reduced-motion checks.
- Run three consistent staging Lighthouse mobile audits on representative public and authenticated/core pages. Median thresholds: Performance at least 90, Accessibility at least 95, Best Practices at least 95, and CLS below 0.1.

Exit criterion: the deployed environment passes every production-readiness and inherited core gate with zero known P0-P3 defects.

## 8. Verification contract

The final evidence set must include exact commands, timestamps, environment, deployment ID, commit SHA, redacted database target identifier, and pass/fail totals for:

```text
npx prisma validate
npm run deployment:validate
npm run db:deploy
npm run db:seed (twice)
npm run db:verify-security
npm run lint
npm run typecheck
npm run test
npm run test:db
npm run build
npm audit --omit=dev
npm run security:secrets
npm run test:e2e
npm run test:e2e:staging
TABLESYNC_LIGHTHOUSE_BASE_URL=<staging-origin> npm run audit:performance
npm run security:evidence
managed backup/restore and rollback rehearsal from docs/deployment/STAGING_OPERATIONS_RUNBOOK.md
```

Tests must prove at minimum:

- successful and failed OAuth callback, persisted session, expiration/revocation, logout, and safe callback destination;
- anonymous, wrong-host, wrong-room guest, wrong guest, stale session, tampered Cookie, guessed ID, and public-viewer denial;
- same IDs yielding indistinguishable public not-found/forbidden behavior where disclosure would be unsafe;
- guest can edit only self, vote only as self, claim only for self, release only own assignment, and update only own assigned shopping item;
- host can manage only owned resources and cannot mutate another host's room even with exact valid IDs;
- public output contains only approved final-share fields and no email, credential, invite token, vote identity, activity metadata, or private preference data;
- replay and concurrent submission do not duplicate joins, votes, finalizations, assignments, audit events, or shopping state;
- authorization and workflow-state checks hold under concurrent state change;
- existing strict Dinner/Hotpot safety, budget, structure, voting, finalization, shopping, recovery, accessibility, responsive, and performance acceptance remains unchanged.

## 9. Evidence ledger

| Date | Phase | Change / finding | Evidence | Status | Next action |
|---|---|---|---|---|---|
| 2026-08-01 | Phase 0 | Audited routes, actions, store reads/writes, Prisma schema, migrations, CI, environment template, tests, and deployment files | Repository inventory plus explicit baseline and permission matrix in this document | Complete | Implement Better Auth host identity and schema migration |
| 2026-08-01 | Phase 0 | Confirmed unsigned demo Cookie, plaintext guest token URL/storage, anonymous full-room reads, arbitrary guest voting, and anonymous shopping mutation risks | `src/lib/auth.ts`, `src/app/actions.ts`, `src/lib/store.ts`, route pages, and current database tests | Complete | Close with fail-closed authentication, DTOs, typed actors, and adversarial tests |
| 2026-08-01 | Phase 0 | Confirmed no managed database, deployment attribution, recovery proof, security headers, shared rate limiter, secret scan, or staging E2E | CI/config/file inventory | Complete | Finish provider-independent hardening before requesting platform access |
| 2026-08-01 | Phase 1 | Replaced unsigned demo identity with Better Auth GitHub OAuth configuration, Prisma-backed users/accounts/sessions, revocation/logout, secure Cookie policy, fail-closed auth route, and a CI-local-only random-key test identity | `src/lib/auth.ts`, `src/lib/auth-environment.ts`, auth routes, migration `20260802010000_add_production_auth`, `tests/database/auth.test.ts` | Local pass | Complete one real GitHub deny/success/reload/logout callback lifecycle on staging |
| 2026-08-01 | Phase 2 | Added typed host/guest actors, centralized deny-by-default authorization, least-privilege DTOs, hashed tokenless guest sessions, server-derived guest mutations, ownership checks, row/advisory locks, and replay/concurrency enforcement | `src/lib/authorization.ts`, `request-actors.ts`, `guest-session.ts`, `store.ts`, migrations and adversarial database/E2E tests | Local complete | Repeat the full matrix against managed staging |
| 2026-08-01 | Phase 3 | Added PostgreSQL-backed rate limiting, redacted security audit events/correlation IDs, bounded validation, CSP/HSTS/security headers, cross-origin Server Action denial, secret/history scan, and expanded CI | Security libraries, `next.config.mjs`, CI, 37/37 unit and 8/8 database tests | Local pass | Run the production dependency audit with explicit egress authorization and review deployed logs |
| 2026-08-01 | Phase 3 | Current local browser inventory has 16 applicable scenarios and 5 intentional skips (remote-only health x3 and non-Chromium protocol duplicate x2). Chromium/Firefox applicable scenarios passed in the combined run; WebKit Dinner/no-solution/public/demo passed there, and the post-fix Hotpot path passed 1/1 with cleanup and exit 0 after a clean proxy restart | Combined and targeted `run-e2e.ts` evidence; 36 responsive screenshots; zero Axe violations | Applicable paths pass | Repeat as one uninterrupted run against stable managed staging through `npm run test:e2e:staging` |
| 2026-08-01 | Phase 3 | Local Lighthouse three-run medians passed: Home 92/100/100/CLS 0; Demo 94/100/100/CLS 0.0548035 | `docs/evidence/lighthouse/summary.json` and run reports | Pass | Repeat public plus authenticated dashboard audit on staging |
| 2026-08-01 | Phase 4 | Added deployed database fail-closed validation, pooled/direct connection split, TLS/bounded-pool/separate-role rules, live privilege verifier, attributable migration-aware health probe, cleanup retention job, and recovery/rollback runbook | `database-environment.ts`, `deployment-environment.ts`, `/api/health`, database scripts, `docs/deployment/STAGING_OPERATIONS_RUNBOOK.md` | Implementation pass | Provision the managed staging targets and execute fresh/upgrade/restore rehearsals |
| 2026-08-01 | Phases 5-6 | Added manual protected staging workflow, non-local HTTPS E2E runner with no test-auth bypass, authenticated dashboard Lighthouse, evidence redaction gate, and acceptance report template | `.github/workflows/staging-acceptance.yml`, remote scripts/tests, `docs/deployment/STAGING_ACCEPTANCE_REPORT.md` | Ready to execute | Select/provide hosting, managed PostgreSQL, OAuth app, and protected staging environment |
| 2026-08-01 | Phase 6 | Latest provider-independent gate: Prisma validation/format, 10 migrations, migrate status, seed twice, lint, typecheck, 37 unit tests, 8 database tests, 14-route build, secret/evidence scans, all 16 locally applicable browser scenarios, accessibility/responsive review, and Lighthouse thresholds have passing evidence | Exact command evidence recorded here and in `docs/archive/DEVELOPMENT_LOG.md` | Local pass | Obtain remote resources; no remote result has been claimed |
| 2026-08-01 | Phase 6 | Local `/api/health` returned HTTP 200 `ready` with migration `20260802023000_security_audit`; final secret scan covered 122 tracked/untracked/history files and evidence scan covered 44 files | Production server probe; `security:secrets`; `security:evidence` | Pass | Require the same result with deployment ID and commit SHA on staging |
| 2026-08-02 | Phases 1/3 | Added fail-safe sign-in/sign-out error recovery, generic OAuth rejection UI, attacker callback ignoring, and automated health failure/migration mismatch redaction checks | 37/37 unit tests; Chromium authentication/security targeted pass; Firefox/WebKit authentication-error and Axe pass | Local pass | Prove the actual GitHub provider denial/success/reload/logout lifecycle on staging |
| 2026-08-02 | Phases 4-6 | Third consecutive external-decision audit found no Vercel/Neon/Supabase deployment variables, no `vercel`, `neonctl`, or `gh` command, no installed provider connector, no staging URL/database/OAuth credential, and no permission to publish the dirty `main` worktree or send lockfile dependency metadata to npm | Read-only command/environment inventory; Git `main` at `bbea289184127e3a321775abc82083af529cce12`; acceptance report remains wholly pending | Blocked | User selects/provides provider access and authorizes audit plus Git branch/commit/push |
| 2026-09-02 | Phases 1-3 | Work resumed and the provider-independent candidate gate was repeated before source-control fixation | Secret scan 123 files/history; evidence scan 44 files; lint; typecheck; 37/37 unit tests; production build; Prisma validation; 10 migrations current; seed twice; 8/8 database tests; `git diff --check` clean apart from line-ending notices | Local pass; candidate branch created | Commit the reviewed candidate, then connect protected GitHub OAuth, Neon, and Vercel environments before any remote acceptance claim |
| 2026-09-02 | Phases 4-5 | Fixed the reviewed implementation as `f78c8fb` and pushed `codex/production-staging` to `origin`; automatic plugin suggestions rejected all three catalog IDs, and direct console checks showed GitHub, Vercel, and Neon require user sign-in | Local/remote branch equality at `f78c8fb`; official login pages opened as browser handoffs; no credential entered or captured | Branch published; provider access pending | User signs in to all three consoles, then provisioning and OAuth registration can begin |
| 2026-09-02 | Phase 3 | Production audit execution was requested after general approval, but the policy gate requires explicit consent to transmit production dependency package names and versions to the public npm audit service | Audit command was not executed and no dependency metadata was transmitted | Pending consent | Run `npm audit --omit=dev --audit-level=high` only after the precise payload/destination is approved |

## 10. External dependencies and decision log

The following inputs are intentionally deferred until provider-independent code and local tests are ready:

- GitHub OAuth application credentials and approved callback domains.
- Managed PostgreSQL provider/project access and approval of any non-free cost.
- Hosting platform/project access, staging domain, and approval of any non-free cost.
- If platform-native rate limiting, backup, or secret scanning is selected, the specific product/tier and retention policy.

Current resume input, with no secret values pasted into chat:

```text
Vercel + Neon; allow npm audit metadata egress; allow creating codex/production-staging, committing, and pushing; provider access is connected.
```

Equivalent existing infrastructure is acceptable if it provides non-local HTTPS hosting, managed PostgreSQL with separate least-privilege roles and pooled/direct TLS paths, protected secrets, backups/PITR, and a disposable restore target. Until that input or equivalent external state exists, Phases 4-6 cannot produce truthful evidence.

Default implementation direction, unless changed before external provisioning:

- GitHub OAuth through Better Auth.
- Vercel-compatible Next.js deployment.
- Neon, Supabase, or Prisma Postgres managed staging with distinct pooled and direct TLS URLs.
- A vendor-neutral authorization/data-access layer so the security boundary does not depend on hosting choice.

## 11. Deferred product work

Realtime updates, additional gathering types, AI functionality, payments, marketing expansion, and portfolio packaging remain outside this goal. They must not displace authentication, authorization, database, deployment, or acceptance work.

## 12. Maintenance rule

After every meaningful slice:

1. Update the phase status and evidence ledger.
2. Record exact verification results and any newly discovered risk.
3. Keep unresolved items explicit; never relabel a limitation as accepted without a user decision.
4. Preserve the permission matrix and acceptance thresholds unless a deliberate product decision changes them.
5. Do not declare this plan complete until the real staging URL, real provider flow, managed database recovery evidence, and full inherited acceptance gate all pass.
6. Execute provider operations and record results using [`docs/deployment/STAGING_OPERATIONS_RUNBOOK.md`](../../deployment/STAGING_OPERATIONS_RUNBOOK.md) and [`docs/deployment/STAGING_ACCEPTANCE_REPORT.md`](../../deployment/STAGING_ACCEPTANCE_REPORT.md); templates or local mocks are never remote evidence.
