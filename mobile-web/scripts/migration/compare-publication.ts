import { readFile } from "node:fs/promises";
import type { Block } from "../../lib/content/published-schema.ts";
import { comparePagePublication } from "../../lib/migration/compare-publication.ts";

export {};

type Snapshot = { pageId: string; blocks: Block[]; assetIds: string[] };
const sourcePath = argument("--source");
const targetPath = argument("--target");
const source = JSON.parse(await readFile(sourcePath, "utf8")) as Snapshot[];
const target = JSON.parse(await readFile(targetPath, "utf8")) as Snapshot[];
const targetByPageId = new Map(target.map((page) => [page.pageId, page]));
const reports = source.map((page) => {
  const published = targetByPageId.get(page.pageId);
  return published ? comparePagePublication(page, published) : { pageId: page.pageId, ok: false, issues: [{ code: "missing-page", detail: page.pageId }] };
});
const result = { ok: reports.every((report) => report.ok), reports };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) {
    process.stderr.write(`${name} is required\n`);
    process.exit(2);
  }
  return value;
}
