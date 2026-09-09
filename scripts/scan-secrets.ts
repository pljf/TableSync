import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Finding = { detector: string; location: string };

const detectors: Array<{ name: string; pattern: RegExp }> = [
  { name: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { name: "github-token", pattern: /\b(?:gh[opusr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g },
  { name: "aws-access-key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { name: "stripe-live-key", pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g },
  { name: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { name: "google-api-key", pattern: /\bAIza[A-Za-z0-9_-]{35}\b/g },
  { name: "jwt", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { name: "database-credential", pattern: /\bpostgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@(?!(?:localhost|127\.0\.0\.1)(?::|\/))/gi }
];

function scanText(text: string, location: string): Finding[] {
  const findings: Finding[] = [];
  for (const detector of detectors) {
    detector.pattern.lastIndex = 0;
    for (const match of text.matchAll(detector.pattern)) {
      const line = text.slice(0, match.index).split("\n").length;
      findings.push({ detector: detector.name, location: `${location}:${line}` });
    }
  }
  return findings;
}

const tracked = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })
  .split("\0")
  .filter(Boolean);
const findings: Finding[] = [];

for (const file of tracked) {
  if (/^\.env(?:\.|$)/.test(file) && file !== ".env.example") {
    findings.push({ detector: "tracked-env-file", location: file });
    continue;
  }
  try {
    const content = readFileSync(file);
    if (content.includes(0)) continue;
    findings.push(...scanText(content.toString("utf8"), file));
  } catch {
    // Deleted paths may still appear transiently in a dirty worktree.
  }
}

const history = execFileSync(
  "git",
  ["log", "-p", "--all", "--no-ext-diff", "--unified=0", "--format=commit:%H"],
  { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
);
findings.push(...scanText(history, "git-history"));

const unique = [...new Map(findings.map((finding) => [`${finding.detector}:${finding.location}`, finding])).values()];
if (unique.length > 0) {
  console.error("Potential secrets detected (values intentionally redacted):");
  for (const finding of unique) console.error(`- ${finding.detector} at ${finding.location}`);
  process.exit(1);
}

console.log(`Secret scan passed across ${tracked.length} tracked and untracked source files and reachable Git history.`);
