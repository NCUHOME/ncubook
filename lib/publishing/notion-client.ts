const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2022-06-28";

type JsonRecord = Record<string, unknown>;

export type NotionObject = JsonRecord & {
  id: string;
  object?: string;
  type?: string;
  has_children?: boolean;
};

export type NotionBlockNode = NotionObject & { children: NotionBlockNode[] };

export type NotionClient = {
  retrievePage: (pageId: string) => Promise<NotionObject>;
  listBlockChildren: (blockId: string) => Promise<NotionObject[]>;
  readBlockTree: (blockId: string) => Promise<NotionBlockNode[]>;
};

type CreateNotionClientOptions = {
  token: string;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  maxRetries?: number;
  maxDepth?: number;
};

export function createNotionClient({
  token,
  fetchImpl = fetch,
  sleep = wait,
  maxRetries = 2,
  maxDepth = 32,
}: CreateNotionClientOptions): NotionClient {
  if (!token.trim()) throw new Error("Notion token is required");

  async function request(path: string): Promise<JsonRecord> {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const response = await fetchImpl(`${NOTION_API_BASE}${path}`, {
        headers: {
          authorization: `Bearer ${token}`,
          "notion-version": NOTION_API_VERSION,
        },
      });

      if (response.ok) {
        const body: unknown = await response.json();
        if (!isRecord(body)) throw new Error("Notion returned an invalid JSON object");
        return body;
      }

      if (response.status === 429 && attempt < maxRetries) {
        await sleep(retryDelay(response.headers.get("retry-after"), attempt));
        continue;
      }

      const requestId = response.headers.get("x-request-id");
      throw new Error(`Notion request failed with status ${response.status}${requestId ? ` (${requestId})` : ""}`);
    }

    throw new Error("Notion request retry limit reached");
  }

  async function listBlockChildren(blockId: string): Promise<NotionObject[]> {
    const results: NotionObject[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | undefined;

    do {
      const query = new URLSearchParams({ page_size: "100" });
      if (cursor) query.set("start_cursor", cursor);
      const body = await request(`/blocks/${encodeURIComponent(blockId)}/children?${query.toString()}`);
      const pageResults = body.results;
      if (!Array.isArray(pageResults)) throw new Error("Notion block response is missing results");
      results.push(...pageResults.map(parseNotionObject));

      const hasMore = body.has_more === true;
      const nextCursor = typeof body.next_cursor === "string" ? body.next_cursor : undefined;
      if (hasMore && !nextCursor) throw new Error("Notion block response is missing next_cursor");
      if (nextCursor && seenCursors.has(nextCursor)) throw new Error("Notion pagination cursor repeated");
      if (nextCursor) seenCursors.add(nextCursor);
      cursor = hasMore ? nextCursor : undefined;
    } while (cursor);

    return results;
  }

  async function expand(blockId: string, depth: number): Promise<NotionBlockNode[]> {
    if (depth > maxDepth) throw new Error(`Notion block tree exceeds maximum depth ${maxDepth}`);
    const blocks = await listBlockChildren(blockId);
    const expanded: NotionBlockNode[] = [];
    for (const block of blocks) {
      expanded.push({
        ...block,
        children: block.has_children === true ? await expand(block.id, depth + 1) : [],
      });
    }
    return expanded;
  }

  return {
    async retrievePage(pageId) {
      return parseNotionObject(await request(`/pages/${encodeURIComponent(pageId)}`));
    },
    listBlockChildren,
    readBlockTree(blockId) {
      return expand(blockId, 0);
    },
  };
}

function parseNotionObject(value: unknown): NotionObject {
  if (!isRecord(value) || typeof value.id !== "string") throw new Error("Notion object is missing an id");
  return value as NotionObject;
}

function retryDelay(retryAfter: string | null, attempt: number): number {
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  return Math.min(1000 * 2 ** attempt, 8000);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
