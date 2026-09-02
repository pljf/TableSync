import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const evidenceRoot = resolve("docs", "evidence");
const secretEnvironmentKeys = [
  "DATABASE_URL",
  "DIRECT_URL",
  "BETTER_AUTH_SECRET",
  "AUTH_GITHUB_SECRET",
  "TABLESYNC_STAGING_SESSION_COOKIE"
] as const;

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : Promise.resolve([path]);
    })
  );
  return nested.flat();
}

const configuredSecrets = secretEnvironmentKeys
  .map((key) => ({ key, value: process.env[key]?.trim() }))
  .filter((entry): entry is { key: (typeof secretEnvironmentKeys)[number]; value: string } =>
    Boolean(entry.value && entry.value.length >= 8)
  );
const violations: string[] = [];

for (const path of await filesUnder(evidenceRoot)) {
  const contents = await readFile(path);
  const text = contents.toString("utf8");
  for (const secret of configuredSecrets) {
    if (contents.includes(Buffer.from(secret.value))) {
      violations.push(`${path}: contains the value of ${secret.key}`);
    }
  }
  if (/postgres(?:ql)?:\/\/[^\s"']+/i.test(text)) violations.push(`${path}: contains a PostgreSQL URL`);
  if (/(?:__Secure-)?tablesync-auth\.session_token\s*[=:]/i.test(text)) {
    violations.push(`${path}: contains a host session credential`);
  }
}

if (violations.length > 0) {
  console.error("Evidence redaction failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Evidence redaction passed across ${(await filesUnder(evidenceRoot)).length} files.`);
}
