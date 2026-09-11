# Seven-day room retention

Rooms expire seven days (168 hours) after creation. Expired rooms are unavailable through the application, including their invitation links and saved-room lists. The policy applies to existing rooms too: rooms already at least seven days old become unavailable when this release is deployed.

Expired room records are permanently removed by the next successful cleanup job. The database cascades remove their guests, preferences, guest sessions, menu plans, votes, shopping items, and activities. The account and shared recipe catalog remain available. Database backups follow the provider's separate retention policy.

The user-facing reminder describes this as: “Rooms expire after 7 days and are deleted automatically.” Access expires at the seven-day boundary; database deletion follows the cleanup schedule and is not guaranteed at that exact instant.

## Vercel

1. Add `CRON_SECRET` to the project's Production environment with at least 32 random characters, using the provider's secret store. Never commit the value or use a `NEXT_PUBLIC_` variable.
2. Deploy this release, including `vercel.json`. Its daily job calls `GET /api/cron/rooms` at 05:00 UTC. Vercel creates scheduled jobs only for production deployments; previews need a separate scheduler if cleanup is required there. See [Vercel's cron setup](https://vercel.com/docs/cron-jobs/quickstart).
3. Verify the job appears and is enabled under project Settings → Cron Jobs. Vercel supplies `Authorization: Bearer <CRON_SECRET>` automatically; missing or incorrect credentials receive `401` without running cleanup. See [securing Vercel cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
4. Monitor successful daily invocations and investigate missing runs or `500` responses. Success returns only `deletedRooms`; failures omit database details. Vercel does not retry failed invocations, so the next successful run removes all outstanding expired rooms. Cleanup is safe to repeat. See [Vercel cron error handling](https://vercel.com/docs/cron-jobs/manage-cron-jobs#cron-job-error-handling).

The daily schedule supports Vercel Hobby. On Hobby, a run can occur anywhere within the 05:00–05:59 UTC hour. Consequently, expired data normally remains in the database until the following daily run and can remain longer if scheduling or execution fails. Access remains blocked after seven days regardless of the scheduler. See [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Other hosts and operational maintenance

Schedule `npm run ops:cleanup` at least daily from a protected job with the intended deployment's runtime database environment. It deletes expired rooms using the same seven-day cutoff alongside the existing operational-data cleanup and reports deletion counts. It does not require `CRON_SECRET` because it connects directly to the database.

Alternatively, a protected scheduler can call `GET /api/cron/rooms` with the same bearer secret configured on the web runtime. Keep the secret out of URLs and logs. Monitor the job for failures; room access expiry alone does not remove records from the database.
