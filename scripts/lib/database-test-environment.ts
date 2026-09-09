import { isManagedDeployment } from "../../src/lib/deployment-environment.ts";

export function configureDatabaseTestPool(environment: Record<string, string | undefined>): void {
  if (!isManagedDeployment(environment)) {
    environment.DATABASE_POOL_SIZE = "1";
    environment.DATABASE_POOL_MAX_USES = "0";
  }
}
