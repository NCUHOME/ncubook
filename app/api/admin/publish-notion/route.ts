// API 路由：Notion 远程发布与版本回滚 Webhook 触发入口 (管理员 Bearer 认证)
import { createPublishNotionHandler } from "@/lib/publishing/route";
import { runNotionPublicationCommand } from "@/lib/publishing/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handle = createPublishNotionHandler({
  expectedToken: process.env.PUBLICATION_ADMIN_TOKEN,
  run: runNotionPublicationCommand,
});

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
