# TableSync deployment readiness — September 9, 2026

**Decision: local readiness repairs and verification passed; ready to begin deployment setup.** No deployment has been started. The existing hosting and PostgreSQL services still need to be identified and checked during the deployment phase.

This report records local validation of the deployment-readiness repairs based on `cbaef40c9c52deef5497d0760a64f002d81bb862`. It does not certify the configuration of an external hosting account.

## Repairs completed

- Authentication and health now share a readiness check. Invalid or inconsistent canonical addresses, a missing hosted session secret, and partially configured GitHub credentials fail readiness. Guest-only hosting is supported when both GitHub fields are empty. The server reads its public app address at runtime so a production build can start at the configured origin.
- Database security verification checks every required read/write permission individually, schema access, migration-history access, separate roles, TLS, ownership, and elevated permissions. Its report writer supports Windows and Linux, rejects escaping paths and symlinks/junctions, and atomically replaces hard-linked destinations without changing their other links. Connection and query waits are bounded and errors avoid exposing credentials.
- Database tests preserve managed connection settings. The local-only privilege regression test proves that missing individual write privileges are rejected and rolls back its temporary role and table.
- Browser tests now await completion of a rejected cross-site form navigation. Shared host authentication works with both isolated local test sessions and a supplied staging session. HTTPS cookie settings and guest sign-out behavior are covered.
- Remote browser and Lighthouse checks validate their destination against both configured app origins and verify the exact staging release identity before using a session cookie. Local browser acceptance now stops immediately if health is not ready.
- Vitest and its affected mocker dependency were updated to 4.1.11. Node 24.19.0 is recorded in `.node-version` and `.nvmrc`, and both CI workflows use that version file.
- The lockfile includes the optional Linux/WASM dependencies required by a clean GitHub install and was regenerated with npm 11.17.0 without an existing installation. The package-manager version and safe update procedure are recorded in the project.
- Vercel's generated deployment ID and commit SHA now take precedence over stale manual identity settings. Enable access to system environment variables on Vercel; the protected acceptance job retains explicit expected identity.
- The staging report references the current migration and explains optional GitHub acceptance. Empty, separated [runtime](deployment/runtime.env.example) and [acceptance](deployment/acceptance.env.example) configuration templates are ready to fill securely.

PostgreSQL's privilege function treats a comma-separated list as “any”; the revised check explicitly requires all four application privileges. See the [official privilege-function documentation](https://www.postgresql.org/docs/current/functions-info.html#FUNCTIONS-INFO-ACCESS-TABLE). The patched dependency addresses the [Vitest maintainer advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9).

## Local verification

All final checks use the available Node 24.19.0 runtime. The machine's default Node executable is still 22.14.0, below this project's requirement; select the recorded Node version and npm 11.17.0 for future local commands. The production build, lint and complete unit suite were repeated after the Vercel identity integration.

| Check | Result |
| --- | --- |
| Production build | Passed |
| Lint | Passed |
| TypeScript | Passed, including the standalone check |
| Unit tests | 522 passed across 44 files; one Unix-only symlink case skipped on Windows, with Windows junction/hardlink cases passing |
| Clean Linux dependency resolution | npm 11.17.0 dry run passed for 653 packages; actual GitHub install and checks must pass before merging |
| Prisma schema validation | Passed |
| Local database integration tests | 33 passed across 6 files |
| Local migration state | All 13 migrations finished; no failed or rolled-back entries |
| Local catalog | 61 ingredients and 66 dishes present |
| Production-build browser acceptance | 64 passed, zero failures, 5 intentional skips across Chromium/Firefox/WebKit (18.7 minutes) |
| WebKit navigation regression | Three further repetitions passed (10.9 seconds) |
| Normal production-server smoke check | Health HTTP 200 and current migration; test-auth endpoint HTTP 404 |
| Lighthouse performance | Three runs per public page: Home median 96, Auth median 97; both 100 accessibility, 100 best practices and zero layout shift |
| Source/history secret scan | Passed across 248 source files and reachable Git history |
| Evidence redaction | Passed across all 176 files, including final generated artifacts |
| Dependency audit including development dependencies | Zero vulnerabilities |

The installed local migration head is `20260908010000_correct_tofu_shopping_category`. The local database was started with the supported launcher for verification and stopped afterward with its saved data preserved. This tests existing local data; fresh managed installation, upgrade, TLS, backups and recovery require checks against the actual service. Browser tests clean up rooms attributed to their unique run identifiers. The database privilege test leaves no temporary probe role behind. The five browser skips cover the hosted-health case in local runs and duplicate protocol checks outside Chromium; no failing case was skipped. Local Lighthouse measured the public Home and Auth pages; authenticated hosted performance remains a staging gate.

## Next deployment phase

The available `.env` describes local development: local PostgreSQL without TLS and localhost app addresses. It cannot establish what is configured in the user's existing service dashboards.

Before approving the hosted release:

1. Identify the existing hosting and database projects and select the intended staging origin. Use Node 24.19.0, matching HTTPS app/auth origins, a persistent secret, and the intended guest-only or GitHub-enabled authentication mode.
2. Set up a pooled TLS runtime connection with a restricted application role. Keep direct migration credentials and acceptance session cookies in protected jobs, separate from the web runtime. Configure pool limits and release identity fields using the supplied templates.
3. Apply and reapply all 13 migrations and the catalog seed on staging, inspect the resulting schema, and run the repaired database security check and staging acceptance workflow against the exact reviewed release.
4. Verify real guest-session and, if enabled, GitHub callback/linking behavior. Complete authenticated hosted performance, monitoring, backup retention, restore rehearsal and rollback checks; record evidence in the staging acceptance report.

These external checks are part of deploying to the existing services. They have not been represented as locally proven. No credentials, provider configuration or hosted data were published by this repair pass.
