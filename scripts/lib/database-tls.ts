import { TLSSocket } from "node:tls";

/** Inspect the connected client transport, including when a proxy terminates TLS. */
export function verifiedClientTls(stream: unknown): boolean {
  return stream instanceof TLSSocket && stream.encrypted === true && stream.authorized === true;
}

/** Require certificate and hostname verification regardless of driver defaults. */
export function verifiedDatabaseConnectionString(connectionString: string): string {
  const connection = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(connection.protocol) ||
      !["require", "verify-ca", "verify-full"].includes(connection.searchParams.get("sslmode") ?? "")) {
    throw new Error("Database verification requires a PostgreSQL connection with TLS enabled.");
  }
  // node-postgres replaces a separately supplied ssl object when sslmode appears
  // in the URL. Set the mode here so URL parsing cannot disable verification.
  connection.searchParams.set("sslmode", "verify-full");
  return connection.toString();
}
