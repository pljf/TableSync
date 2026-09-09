import { randomUUID } from "node:crypto";
import { lstat, mkdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

type PathOperations = Pick<typeof path, "isAbsolute" | "relative" | "resolve" | "sep">;

export function resolveEvidencePath(workspace: string, requested: string, paths: PathOperations = path): string {
  if (!requested.trim() || requested.split(/[\\/]/).includes("..")) {
    throw new Error("Database evidence output must be a file inside the workspace without parent traversal.");
  }
  const root = paths.resolve(workspace);
  const output = paths.resolve(root, requested);
  const relative = paths.relative(root, output);
  if (!relative || paths.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${paths.sep}`)) {
    throw new Error("Database evidence output must be a file inside the workspace.");
  }
  return output;
}

async function rejectSymbolicLink(target: string, directory: boolean): Promise<void> {
  const stats = await lstat(target);
  if (stats.isSymbolicLink() || (directory ? !stats.isDirectory() : !stats.isFile())) {
    throw new Error("Database evidence output must not use symbolic links or non-file destinations.");
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

// Reject existing symlinks/junctions before creating directories or writing a file.
// Atomic replacement also leaves any existing hard-linked file contents untouched.
export async function writeEvidenceFile(workspace: string, requested: string, contents: string): Promise<void> {
  const requestedOutput = resolveEvidencePath(workspace, requested);
  const root = await realpath(workspace);
  const output = resolveEvidencePath(root, path.relative(path.resolve(workspace), requestedOutput));
  const parent = path.dirname(output);
  let current = root;
  for (const part of path.relative(root, parent).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      await mkdir(current);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
    }
    await rejectSymbolicLink(current, true);
    resolveEvidencePath(root, await realpath(current));
  }
  try {
    await rejectSymbolicLink(output, false);
  } catch (error) {
    if (!isMissing(error)) throw error;
  }

  const temporary = path.join(parent, `.database-evidence-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(temporary, output);
  } finally {
    await unlink(temporary).catch((error) => { if (!isMissing(error)) throw error; });
  }
}
