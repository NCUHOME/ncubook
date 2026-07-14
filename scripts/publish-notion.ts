type CommandBody =
  | { operation: "publish"; dryRun: boolean; all?: true; pageIds?: string[] }
  | { operation: "rollback"; version: string };

export {};

const args = process.argv.slice(2);
const endpoint = environment("PUBLICATION_ENDPOINT");
const token = environment("PUBLICATION_ADMIN_TOKEN");
const body = parseArguments(args);

const response = await fetch(endpoint, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify(body),
});
const result: unknown = await response.json().catch(() => ({ ok: false, error: "invalid_response" }));
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!response.ok) process.exitCode = 1;

function parseArguments(values: string[]): CommandBody {
  const rollbackIndex = values.indexOf("--rollback");
  if (rollbackIndex >= 0) {
    const version = values[rollbackIndex + 1];
    if (!version) usage("--rollback requires a content version");
    return { operation: "rollback", version };
  }

  const dryRun = values.includes("--dry-run");
  if (values.includes("--all")) return { operation: "publish", dryRun, all: true };
  const pageIds: string[] = [];
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--page") {
      const pageId = values[index + 1];
      if (!pageId) usage("--page requires a Notion page id");
      pageIds.push(pageId);
      index += 1;
    }
  }
  if (pageIds.length === 0) usage("choose --all, --page <id>, or --rollback <version>");
  return { operation: "publish", dryRun, pageIds };
}

function environment(name: string): string {
  const value = process.env[name];
  if (!value) usage(`${name} is required`);
  return value;
}

function usage(reason: string): never {
  process.stderr.write(`${reason}\nUsage: node scripts/publish-notion.ts [--dry-run] (--all | --page <id>...) | --rollback <version>\n`);
  process.exit(2);
}
