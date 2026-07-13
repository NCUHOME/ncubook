import { describe, expect, it, vi } from "vitest";
import { createPublishNotionHandler, type PublicationCommandRunner } from "@/lib/publishing/publish-route";

function request(body: unknown, token?: string) {
  return new Request("http://localhost/api/admin/publish-notion", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("Notion publication admin route", () => {
  it("rejects missing and invalid admin tokens", async () => {
    const run = vi.fn<PublicationCommandRunner>();
    const handler = createPublishNotionHandler({ expectedToken: "admin-secret", run });

    expect((await handler(request({ operation: "publish", all: true }))).status).toBe(401);
    expect((await handler(request({ operation: "publish", all: true }, "wrong"))).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("passes dry runs without enabling writes", async () => {
    const run = vi.fn<PublicationCommandRunner>(async (command) => ({ ok: true, dryRun: command.operation === "publish" && command.dryRun, pages: 3 }));
    const handler = createPublishNotionHandler({ expectedToken: "admin-secret", run });

    const response = await handler(request({ operation: "publish", dryRun: true, all: true }, "admin-secret"));

    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledWith({ operation: "publish", dryRun: true, all: true, pageIds: [] });
    expect(await response.json()).toMatchObject({ ok: true, dryRun: true, pages: 3 });
  });

  it("returns publish and rollback summaries", async () => {
    const run = vi.fn<PublicationCommandRunner>(async (command) => ({ ok: true, operation: command.operation }));
    const handler = createPublishNotionHandler({ expectedToken: "admin-secret", run });

    const publish = await handler(request({ operation: "publish", pageIds: ["page-one"] }, "admin-secret"));
    const rollback = await handler(request({ operation: "rollback", version: "content-v1" }, "admin-secret"));

    expect(await publish.json()).toEqual({ ok: true, operation: "publish" });
    expect(await rollback.json()).toEqual({ ok: true, operation: "rollback" });
  });

  it("returns a structured failure without leaking stack traces", async () => {
    const run = vi.fn<PublicationCommandRunner>(async () => { throw new Error("unsupported block audio at block-one"); });
    const handler = createPublishNotionHandler({ expectedToken: "admin-secret", run });

    const response = await handler(request({ operation: "publish", all: true }, "admin-secret"));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, error: "publication_failed", reason: "unsupported block audio at block-one" });
  });
});
