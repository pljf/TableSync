# TableSync staging operations runbook

This runbook is the execution contract for the managed PostgreSQL staging database and the non-local TableSync staging deployment. It does not authorize work against production or any database that has not been positively identified as disposable staging.

## 1. Hard safety rules

- Record the provider project, database, branch, hosting project, deployment ID, commit SHA, and operator before changing anything.
- Confirm `TABLESYNC_DEPLOYMENT_ENV=staging` and a non-local HTTPS application URL. Stop if any target is ambiguous.
- Never run `prisma migrate dev`, `prisma db push`, `prisma migrate reset`, `DROP DATABASE`, or an in-place destructive restore against staging.
- Use `DATABASE_URL` only for pooled application traffic and `DIRECT_URL` only for migrations, inspection, backup, and restore.
- Keep the runtime and migration roles distinct. The runtime role must not own tables, create schema objects, truncate tables, create databases, create roles, replicate, bypass RLS, or be superuser.
- Keep credentials in the hosting/database secret stores and the GitHub `staging` environment. Never paste secret values into an issue, commit, screenshot, report, command transcript, or chat.
- Take and verify a provider-native snapshot immediately before a migration or rollback rehearsal.
- Restore only into a newly created disposable database/branch. Switch the application only after the restored target passes the full readiness probe.

## 2. Required environment contract

| Variable | Requirement |
|---|---|
| `TABLESYNC_DEPLOYMENT_ENV` | Exactly `staging` |
| `TABLESYNC_DEPLOYMENT_ID` | Immutable hosting deployment ID; required explicitly in the protected acceptance job. Vercel runtime uses its generated `VERCEL_DEPLOYMENT_ID` first. |
| `TABLESYNC_GIT_SHA` | Full deployed Git commit SHA; required explicitly in the protected acceptance job. Vercel runtime uses `VERCEL_GIT_COMMIT_SHA` first. |
| `TABLESYNC_EXPECTED_MIGRATION` | Reviewed migration directory name, currently `20260908010000_correct_tofu_shopping_category` |
| `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL` | Same canonical non-local HTTPS origin, without an extra path |
| `AUTH_TRUSTED_ORIGINS` | Explicit comma-separated origins; normally only the canonical staging origin |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters, unique to staging |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Optional: leave both unset for guest-only hosting, or configure both for GitHub sign-in. Partial/placeholder credentials fail readiness. |
| `DATABASE_URL` | TLS-required pooled URL using the runtime role |
| `DIRECT_URL` | TLS-required direct URL using the migration role; never configure it in the deployed Web runtime |
| `DATABASE_RUNTIME_MODE` | Exactly `pooled` |
| `TABLESYNC_DATABASE_SCOPE` | `runtime` in the deployed Web process; `acceptance` only in the protected CI migration/acceptance job |
| `DATABASE_POOL_SIZE` | Integer 1-20; start at 8 and confirm against provider limits |
| `DATABASE_POOL_MAX_USES` | Integer 100-100000; start at 5000 |

For both PostgreSQL URLs, use `sslmode=verify-full` to verify the certificate and hostname. The configuration gate also recognizes `verify-ca` and `require`, but the security verifier explicitly upgrades its own probe connections to `verify-full`; it never disables certificate verification.

On Vercel, select **Enable access to System Environment Variables** in the project's environment-variable settings. TableSync automatically uses Vercel's deployment ID and commit SHA at build and runtime, so redeployments do not require updating identity settings. Explicit `TABLESYNC_*` identity remains the fallback when provider metadata is absent, and is required in the separate protected acceptance job. Keep `TABLESYNC_DEPLOYMENT_ENV=staging` explicit; it is independent of Vercel's environment name. See [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables).

The hosting runtime must receive `DATABASE_URL` but not `DIRECT_URL`. The protected acceptance job receives both. Run the redacted configuration gate from that job before any migration:

```text
npm run deployment:validate
```

The command prints only booleans, bounded pool settings, deployment attribution, and the migration name. It never prints URLs, role names, credentials, or session values.

## 3. Minimum-privilege role setup

Create the roles through the provider's administrator connection. Replace names according to provider constraints, generate independent random passwords in the secret manager, and do not save the expanded SQL output.

```sql
CREATE ROLE tablesync_migration LOGIN
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE tablesync_runtime LOGIN
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

REVOKE CREATE ON DATABASE <staging_database> FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE <staging_database> TO tablesync_migration, tablesync_runtime;
GRANT USAGE, CREATE ON SCHEMA public TO tablesync_migration;
GRANT USAGE ON SCHEMA public TO tablesync_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE tablesync_migration IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tablesync_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE tablesync_migration IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO tablesync_runtime;
```

After the first migration, apply grants to existing objects once:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tablesync_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tablesync_runtime;
REVOKE TRUNCATE, TRIGGER ON ALL TABLES IN SCHEMA public FROM tablesync_runtime;
```

If a provider does not allow custom roles or the required revocations, record that as a failed gate and choose another tier/provider. Do not silently accept an owner or administrator URL as `DATABASE_URL`.

After migrations and grants, verify live TLS and role capabilities:

```text
npm run db:verify-security -- --output docs/evidence/staging/database-security.json
```

The verifier's `tls` result requires the connected Node TLS socket to be encrypted and its peer certificate authorized. The separate `backendTls` value records PostgreSQL's `pg_stat_ssl` result for the backend connection. Neon routes both direct and pooled connections through its proxy, so backend TLS can be false while client TLS is verified. Backend TLS never substitutes for a verified client connection. See [Neon connection routing](https://neon.com/docs/introduction/network-transfer), [PostgreSQL SSL statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW), and [Node TLS authorization](https://nodejs.org/docs/latest-v24.x/api/tls.html#tlssocketauthorized).

The verifier fails if client TLS is inactive or unverified, the roles are the same, either role has elevated cluster attributes, the runtime role owns tables or can create objects, runtime CRUD is incomplete, or runtime has TRUNCATE/TRIGGER rights. Output uses one-way role fingerprints rather than role names. This database evidence does not by itself establish application or release readiness.

## 4. Fresh database and upgrade rehearsal

Use two isolated targets when the provider supports cheap branches/databases:

1. `staging-fresh`: empty target proving all migrations can build the application from zero.
2. `staging-upgrade`: restored copy of the current staging baseline proving upgrade compatibility.

For each target:

```text
npm run deployment:validate
npx prisma validate
npm run db:deploy
npm run db:deploy
npm run db:seed
npm run db:seed
npx prisma migrate status
npm run db:verify-security -- --output docs/evidence/staging/database-security.json
npm run test:db
```

The second deploy and second seed must report success without duplicate application records. Record migration count, current migration head, redacted database target identifier, command exit status, and UTC timestamp. A failed migration must remain visible until investigated; never use `migrate resolve` merely to make status green.

## 5. Backup and restore proof

Required staging policy:

- Provider-native automated backups or point-in-time recovery enabled, with at least daily recovery points and at least seven days retention.
- A manual snapshot before every schema rehearsal.
- Documented RPO and RTO from the selected plan; initial product target is RPO <= 24 hours and rehearsed RTO <= 60 minutes.
- At least one logical custom-format backup for portability when the provider supports `pg_dump`.

Restore rehearsal:

1. Record source snapshot ID/time, source migration head, row-count checksum report, and operator.
2. Create a new disposable target named with the rehearsal timestamp. Confirm it is not the active staging database.
3. Restore the provider snapshot or logical backup into that new target.
4. Recreate the two minimum-privilege roles and grants without reusing production credentials.
5. Point a one-off verification job, not the public deployment, at the restored target.
6. Run configuration validation, migration status, database security verification, seed twice, database tests, and `/api/health` smoke verification.
7. Compare invariant counts for users, rooms, guests, preferences, plans, votes, shopping items, migrations, and audit events. Store counts only, never row contents or credentials.
8. Record elapsed restore time and whether RPO/RTO targets passed.
9. Keep the restored target until the evidence report is reviewed; then remove it through the provider's recoverable branch/database deletion flow.

No restore rehearsal is accepted when it overwrites the source database, skips application smoke testing, or relies only on a provider dashboard saying that a backup exists.

## 6. Migration failure and rollback

TableSync uses expand-and-contract migrations. Prefer a forward repair over a down migration.

If `prisma migrate deploy` fails:

1. Stop deployment traffic and preserve the failed logs with secrets redacted.
2. Run `npx prisma migrate status` through the direct migration connection.
3. Inspect the exact failed migration and database state using read-only queries.
4. If PostgreSQL rolled the migration transaction back, fix the migration in a new reviewed commit. Mark it rolled back with `prisma migrate resolve --rolled-back <migration>` only after the database state is independently verified.
5. If non-transactional work partially applied, write and review a forward repair; do not guess at manual deletion.
6. Re-run deploy twice, security verification, database tests, and application health.

Application rollback:

1. Select the previously recorded immutable deployment whose schema compatibility is confirmed.
2. If the new schema is backward compatible, roll application traffic back first and leave the additive schema in place.
3. If data corruption occurred, restore into a new target and validate it fully before switching `DATABASE_URL`; never restore over the only copy.
4. Record old/new deployment IDs, commit SHAs, database target fingerprints, migration heads, timestamps, reason, operator, and health results.

## 7. Deployment and authentication proof

Before public staging acceptance:

1. Record whether the deployment is guest-only or GitHub-enabled. Guest-only hosting uses the complete planning workflow with a persistent session secret and HTTPS; leave both GitHub credentials unset.
2. If enabling GitHub, create a dedicated staging OAuth app. Its homepage must be the exact staging origin and its callback `<origin>/api/auth/callback/github`; configure both credentials.
3. Deploy the reviewed commit using the Node version in `.node-version` and all required secret-scoped variables.
4. Confirm `/api/health` returns HTTP 200 and the expected environment, deployment ID, commit SHA, and migration head. Readiness also requires valid session/authentication configuration and matching canonical origins.
5. In a clean browser, complete **Continue as guest** and verify the private planning workflow. If GitHub is enabled, separately test cancel/deny, successful sign-in and linking a guest account without losing its rooms.
6. Verify sessions survive reload and a warm/cold application instance, then sign out and prove the prior session is rejected. For guest accounts, complete the End guest session confirmation.
7. Capture Cookie attributes by name only: HttpOnly, Secure, SameSite=Lax, Path=/, and expected expiry. Never capture the Cookie value.
8. Supply a fresh, dedicated acceptance account's signed staging session Cookie only through the protected `TABLESYNC_STAGING_SESSION_COOKIE` CI secret for the browser matrix and authenticated Lighthouse run. It may belong to an anonymous guest host or a GitHub host. Do not use a real participant's account. Rotate/revoke it after acceptance.

The canonical deployment gate accepts secure guest-only hosting. Optional GitHub acceptance is recorded as N/A only when both credentials are absent; an incomplete or placeholder configuration is an error. The web runtime must not receive the acceptance session Cookie or direct database connection.

The test-only `/api/test/auth/session` route must return 404 in staging. `TABLESYNC_E2E_AUTH` and `TABLESYNC_E2E_AUTH_KEY` must not exist in the deployment or CI environment.

## 8. Automated acceptance and evidence

The manual GitHub Actions workflow `.github/workflows/staging-acceptance.yml` is the canonical remote gate. It validates the environment and live database privileges; runs migrations and seed twice; repeats static, unit, database, build, secret, dependency, browser, accessibility, responsive, and performance checks; and uploads redacted evidence.

Remote browser and Lighthouse commands are also available locally when all protected environment variables are supplied:

```text
npm run test:e2e:staging
npm run audit:performance
npm run security:evidence
```

Acceptance evidence belongs in `docs/evidence/staging/` and the maintained `docs/PRODUCTION_READINESS_PLAN.md` ledger. Do not commit raw CI logs, Playwright traces, HAR files, database dumps, storage state, environment exports, or unredacted provider screenshots.

## 9. Scheduled maintenance

Run `npm run ops:cleanup` from a protected scheduled job after the retention policy is approved. Defaults are 90 days for security audit events, 30 days for revoked guest sessions, and 24 hours for rate-limit counters. The command also removes expired host sessions, guest sessions, and verification records. Its output contains counts only.

Monitor at minimum:

- `/api/health` status and latency;
- database connection use versus provider limit;
- failed/unfinished Prisma migrations;
- OAuth callback error rate;
- authorization denials and rate-limit denials by hashed subject;
- application/server errors without sensitive request bodies;
- backup freshness and the next restore-rehearsal due date.
