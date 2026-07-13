import { createPublishNotionHandler } from "@/lib/publishing/publish-route";
import { runNotionPublicationCommand } from "@/lib/publishing/notion-publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handle = createPublishNotionHandler({
  expectedToken: process.env.PUBLICATION_ADMIN_TOKEN,
  run: runNotionPublicationCommand,
});

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
