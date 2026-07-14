import { describe, expect, it } from "vitest";
import type { AnswerModel } from "@/lib/ai/provider";
import { groundAnswer } from "@/lib/ai/ground-answer";
import { createSupabaseRetrievalRepository, retrieveGroundingSources } from "@/lib/ai/retrieve";
import { getSupabaseAdmin } from "@/lib/db/supabase";

const expectedVersion = process.env.EXPECTED_CONTENT_VERSION;
const liveTest = expectedVersion ? it : it.skip;

describe("live grounded citation", () => {
  liveTest("retrieves the active Supabase version and opens its exact document anchor", async () => {
    const supabase = getSupabaseAdmin();
    expect(supabase, "Supabase must be configured for the live integration test").not.toBeNull();
    const retrieval = createSupabaseRetrievalRepository(supabase!);
    const sources = await retrieveGroundingSources({ question: "南大家园", repository: retrieval, maxCandidates: 8 });
    expect(await retrieval.getCurrentVersion()).toBe(expectedVersion);
    expect(sources.length).toBeGreaterThan(0);

    const source = sources[0];
    const model: AnswerModel = {
      async generateAnswer() {
        return { confidence: "grounded", claims: [{ id: "live-claim", text: source.exactText, sourceIds: [source.id], status: "grounded" }] };
      },
    };
    const session = await groundAnswer({ question: "南大家园", activeContentVersion: expectedVersion!, sources, model });
    expect(session.confidence).toBe("grounded");
    expect(session.citations).toHaveLength(1);
    expect(session.citations[0]).toMatchObject({ contentVersion: expectedVersion, pageId: source.pageId, anchor: source.anchor });
    expect(source.anchor).toMatch(/^b-/);

    const pageResult = await supabase!.from("published_pages")
      .select("slug,parent_source_page_id")
      .eq("content_version", expectedVersion!)
      .eq("source_page_id", source.pageId)
      .single();
    expect(pageResult.error).toBeNull();
    const page = pageResult.data as { slug: string; parent_source_page_id: string | null };
    const route = `${page.parent_source_page_id === null ? "/sections/" : "/docs/"}${page.slug}`;
    const baseUrl = process.env.PUBLICATION_BASE_URL ?? "http://127.0.0.1:3000";
    const response = await fetch(`${baseUrl}${route}`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(`id="${source.anchor}"`);
  }, 60_000);
});
