import { afterEach, describe, expect, it } from "vitest";
import { link, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveEvidencePath, writeEvidenceFile } from "../../scripts/lib/evidence-output";

const directories: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "tablesync-evidence-test-"));
  directories.push(root);
  const workspace = path.join(root, "workspace");
  const outside = path.join(root, "outside");
  await mkdir(workspace);
  await mkdir(outside);
  return { root, workspace, outside };
}

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) ||
        !path.basename(directory).startsWith("tablesync-evidence-test-")) {
      throw new Error("Refusing to remove an unexpected test directory.");
    }
    await rm(directory, { recursive: true, force: true });
  }
});

describe("evidence output containment", () => {
  it.each([
    ["POSIX", path.posix, "/home/runner/work/tablesync", "/tmp/evidence.json", "/home/runner/work/tablesync-other/evidence.json"],
    ["Windows", path.win32, "C:\\Project\\TableSync", "D:\\evidence.json", "C:\\Project\\TableSync-other\\evidence.json"]
  ])("accepts nested evidence and rejects root, traversal and outside paths on %s", (_name, paths, root, outside, sibling) => {
    expect(resolveEvidencePath(root, "docs/evidence/staging/security.json", paths))
      .toBe(paths.resolve(root, "docs/evidence/staging/security.json"));
    for (const requested of [root, ".", "", "../outside.json", "docs/../../outside.json", outside, sibling]) {
      expect(() => resolveEvidencePath(root, requested, paths)).toThrow("inside the workspace");
    }
  });

  it("creates nested evidence, replaces a previous report and leaves no temporary files", async () => {
    const { workspace } = await fixture();
    const destination = "docs/evidence/staging/security.json";
    await writeEvidenceFile(workspace, destination, "first");
    await writeEvidenceFile(workspace, destination, "second");
    expect(await readFile(path.join(workspace, destination), "utf8")).toBe("second");
    expect(await readdir(path.join(workspace, "docs/evidence/staging"))).toEqual(["security.json"]);
  });

  it("refuses a directory destination and an outside file without changing them", async () => {
    const { workspace, outside } = await fixture();
    const sentinel = path.join(outside, "unchanged.json");
    await writeFile(sentinel, "unchanged");
    await mkdir(path.join(workspace, "directory.json"));
    await expect(writeEvidenceFile(workspace, "directory.json", "replace")).rejects.toThrow("non-file");
    await expect(writeEvidenceFile(workspace, sentinel, "replace")).rejects.toThrow("inside the workspace");
    expect(await readFile(sentinel, "utf8")).toBe("unchanged");
  });

  it("rejects an escaping directory symlink or Windows junction before creating outside directories", async () => {
    const { workspace, outside } = await fixture();
    await symlink(outside, path.join(workspace, "linked"), process.platform === "win32" ? "junction" : "dir");
    await expect(writeEvidenceFile(workspace, "linked/new/security.json", "unsafe")).rejects.toThrow("symbolic links");
    expect(await readdir(outside)).toEqual([]);
  });

  it.skipIf(process.platform === "win32")("rejects an existing file symlink without touching its target", async () => {
    const { workspace, outside } = await fixture();
    const sentinel = path.join(outside, "unchanged.json");
    await writeFile(sentinel, "unchanged");
    await symlink(sentinel, path.join(workspace, "security.json"));
    await expect(writeEvidenceFile(workspace, "security.json", "unsafe")).rejects.toThrow("symbolic links");
    expect(await readFile(sentinel, "utf8")).toBe("unchanged");
  });

  it("replaces an existing hard link without changing the outside file", async () => {
    const { workspace, outside } = await fixture();
    const sentinel = path.join(outside, "unchanged.json");
    await writeFile(sentinel, "unchanged");
    await link(sentinel, path.join(workspace, "security.json"));
    await writeEvidenceFile(workspace, "security.json", "report");
    expect(await readFile(sentinel, "utf8")).toBe("unchanged");
    expect(await readFile(path.join(workspace, "security.json"), "utf8")).toBe("report");
  });
});
