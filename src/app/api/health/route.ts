import { Prisma } from "@/generated/prisma/client";
import { inspectDatabaseEnvironment } from "@/lib/database-environment";
import { inspectDeploymentEnvironment } from "@/lib/deployment-environment";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type MigrationProbe = {
  failedCount: bigint;
  migration: string | null;
};

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8"
};

export async function GET(): Promise<Response> {
  const deployment = inspectDeploymentEnvironment();
  const database = inspectDatabaseEnvironment();

  try {
    const rows = await prisma.$queryRaw<MigrationProbe[]>(Prisma.sql`
      SELECT
        (
          SELECT "migration_name"
          FROM "_prisma_migrations"
          WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL
          ORDER BY "finished_at" DESC
          LIMIT 1
        ) AS "migration",
        (
          SELECT COUNT(*)::bigint
          FROM "_prisma_migrations"
          WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL
        ) AS "failedCount"
    `);
    const probe = rows[0];
    const migrationMatches =
      !deployment.managedDeployment || probe?.migration === deployment.expectedMigration;
    const ready = Boolean(
      deployment.ready &&
        database.ready &&
        probe?.migration &&
        probe.failedCount === 0n &&
        migrationMatches
    );

    return Response.json(
      {
        status: ready ? "ready" : "not_ready",
        environment: deployment.deploymentEnvironment,
        deploymentId: deployment.deploymentId,
        commitSha: deployment.commitSha,
        migration: probe?.migration ?? null
      },
      { status: ready ? 200 : 503, headers: responseHeaders }
    );
  } catch (error) {
    console.error("Health readiness probe failed", {
      environment: deployment.deploymentEnvironment,
      errorType: error instanceof Error ? error.name : "UnknownError"
    });
    return Response.json(
      {
        status: "not_ready",
        environment: deployment.deploymentEnvironment,
        deploymentId: deployment.deploymentId,
        commitSha: deployment.commitSha,
        migration: null
      },
      { status: 503, headers: responseHeaders }
    );
  }
}
