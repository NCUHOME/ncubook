import { readFile } from "node:fs/promises";
import type { PublishedFixture } from "../../lib/content/published-schema.ts";
import { auditPublishedFixture } from "../../lib/migration/check-links-assets.ts";

export {};

const fixturePath = argument("--fixture");
const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as PublishedFixture;
const result = await auditPublishedFixture(fixture, async (url) => {
  const response = await fetch(url, { method: "HEAD", redirect: "follow" });
  return { ok: response.ok, status: response.status };
});
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
