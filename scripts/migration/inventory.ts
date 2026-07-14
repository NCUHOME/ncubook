import { readFile } from "node:fs/promises";

export {};

type Manifest = {
  referencePageCount: number;
  sourceRootPageId: string;
  pages: Array<{ sourcePageId: string; parentPageId: string | null; owner: string; status: string }>;
};

const manifest = JSON.parse(await readFile(new URL("../../migration/manifest.json", import.meta.url), "utf8")) as Manifest;
const ids = new Set(manifest.pages.map((page) => page.sourcePageId));
if (ids.size !== manifest.pages.length) fail("Manifest contains duplicate source page IDs");
if (manifest.pages.length !== manifest.referencePageCount) fail("Manifest page count differs from its Notion reference count");
for (const page of manifest.pages) {
  if (page.parentPageId && !ids.has(page.parentPageId)) fail(`Missing parent ${page.parentPageId} for ${page.sourcePageId}`);
  if (!page.owner || !page.status) fail(`Page ${page.sourcePageId} is missing owner or disposition`);
}

const output: Record<string, unknown> = {
  ok: true,
  rootPageId: manifest.sourceRootPageId,
  referencePageCount: manifest.referencePageCount,
  topLevelPages: manifest.pages.filter((page) => page.parentPageId === null).length,
};

if (process.argv.includes("--verify-remote")) {
  const endpoint = environment("PUBLICATION_ENDPOINT");
  const token = environment("PUBLICATION_ADMIN_TOKEN");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ operation: "publish", dryRun: true, all: true }),
  });
  const result = await response.json() as { pages?: number; [key: string]: unknown };
  if (!response.ok) fail(`Remote inventory failed: ${JSON.stringify(result)}`);
  if (result.pages !== manifest.referencePageCount) fail(`Remote Notion tree has ${result.pages ?? "unknown"} pages; manifest expects ${manifest.referencePageCount}`);
  output.remote = result;
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

function environment(name: string): string {
  const value = process.env[name];
  if (!value) fail(`${name} is required`);
  return value;
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
