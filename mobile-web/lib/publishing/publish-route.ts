import { timingSafeEqual } from "node:crypto";

export type PublicationCommand =
  | { operation: "publish"; dryRun: boolean; all: boolean; pageIds: string[] }
  | { operation: "rollback"; version: string };

export type PublicationCommandRunner = (command: PublicationCommand) => Promise<Record<string, unknown>>;

type PublishHandlerOptions = {
  expectedToken: string | undefined;
  run: PublicationCommandRunner;
};

export function createPublishNotionHandler({ expectedToken, run }: PublishHandlerOptions) {
  return async function handle(request: Request): Promise<Response> {
    if (!expectedToken) return json({ ok: false, error: "admin_token_not_configured" }, 503);
    if (!safeTokenEqual(bearerToken(request), expectedToken)) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    const payload = await request.json().catch(() => null);
    const command = parseCommand(payload);
    if (!command) return json({ ok: false, error: "invalid_publication_command" }, 400);

    try {
      return json(await run(command), 200);
    } catch (error) {
      return json({
        ok: false,
        error: "publication_failed",
        reason: error instanceof Error ? error.message : "Unknown publication failure",
      }, 422);
    }
  };
}

function parseCommand(value: unknown): PublicationCommand | null {
  if (!isRecord(value)) return null;
  if (value.operation === "rollback") {
    return typeof value.version === "string" && value.version.trim()
      ? { operation: "rollback", version: value.version.trim() }
      : null;
  }
  if (value.operation !== "publish") return null;

  const pageIds = Array.isArray(value.pageIds)
    ? value.pageIds.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())
    : [];
  const all = value.all === true;
  if (!all && pageIds.length === 0) return null;
  if (new Set(pageIds).size !== pageIds.length) return null;
  return { operation: "publish", dryRun: value.dryRun === true, all, pageIds };
}

function bearerToken(request: Request): string {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice("Bearer ".length) : "";
}

function safeTokenEqual(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function json(value: Record<string, unknown>, status: number): Response {
  return Response.json(value, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
