import { streamText } from "ai";
import { randomUUID } from "node:crypto";
import { recordAgentQuery, summarizeRetrieval } from "@/lib/agent-telemetry";
import { getCorsHeaders } from "@/lib/cors";
import { generateEmbedding, getChatModel } from "@/lib/gemini";
import { getSupabase } from "@/lib/supabase";

// 处理 CORS 预检请求
export async function OPTIONS(req: Request) {
    const origin = req.headers.get("origin");
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
    });
}

export async function POST(req: Request) {
    const startedAt = Date.now();
    const queryLogId = randomUUID();
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin, "POST, OPTIONS");

    try {
        const { messages, currentPath } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: "messages 参数不能为空" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 取最后一条用户消息进行向量检索
        const lastUserMessage = [...messages]
            .reverse()
            .find((m: { role: string }) => m.role === "user");

        if (!lastUserMessage) {
            return new Response(
                JSON.stringify({ error: "没有找到用户消息" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 1. 向量化用户问题
        const queryEmbedding = await generateEmbedding(lastUserMessage.content);

        // 2. 向量检索相关文档片段
        const supabase = getSupabase();

        const { data: documents, error: matchError } = await supabase.rpc(
            "match_documents",
            {
                query_embedding: queryEmbedding,
                match_threshold: 0.3,
                match_count: 5,
            }
        );

        if (matchError) {
            console.error("向量检索失败:", matchError);
        }

        // 3. 构建上下文
        let allDocs = documents || [];

        // 如果传入了当前路径，额外检索当前页面的所有上下文
        if (currentPath && typeof currentPath === 'string') {
            // 归一化路径
            let normalizedPath = currentPath.endsWith('/') && currentPath.length > 1
                ? currentPath.slice(0, -1)
                : currentPath;

            // 为了安全起见，如果在首页('/')可能不需要获取全文，但为了总结完全可以抓出 '/'
            const { data: exactDocs, error: exactError } = await supabase
                .from('documents')
                .select('*')
                .eq('metadata->>url', normalizedPath);

            if (!exactError && exactDocs && exactDocs.length > 0) {
                // 将当前页面的精确内容放在最前面
                allDocs = [
                    ...exactDocs.map((doc: any) => ({ ...doc, similarity: 1 })),
                    ...allDocs,
                ];
            }
        }

        // 根据 URL 和标题去除重复切片
        const uniqueDocsMap = new Map();
        allDocs.forEach((doc: any) => {
            if (doc.metadata && doc.metadata.url && doc.metadata.heading) {
                const key = `${doc.metadata.url}#${doc.metadata.heading}`;
                if (!uniqueDocsMap.has(key)) {
                    uniqueDocsMap.set(key, doc);
                }
            }
        });
        const finalDocs = Array.from(uniqueDocsMap.values());
        const retrieval = summarizeRetrieval(finalDocs);

        await recordAgentQuery({
            supabase,
            queryLogId,
            question: lastUserMessage.content,
            currentPath,
            userAgent: req.headers.get("user-agent"),
            latencyMs: Date.now() - startedAt,
            retrieval,
        });

        const contextChunks = finalDocs.map(
            (doc: any) =>
                `### ${doc.metadata.title}\n来源: ${doc.metadata.url}\n\n${doc.content}`
        );
        const context = contextChunks.join("\n\n---\n\n");

        // 4. 构建系统提示词
        const systemPrompt = `你是”小家园”🏠，南昌大学生存手册（book.ncuos.com）的 AI 助手。
根据参考资料回答关于南昌大学学习、生活的问题。
${currentPath ? `\n> 用户正在浏览 \`${currentPath}\`。若用户要求”总结当前页面”，直接基于该路径对应的参考资料回答。` : ''}

## 站点结构（用于构建链接）
- 入学相关: /docs/onboarding/freshmen-guide, /docs/onboarding/essentials, /docs/onboarding/dorm-life, /docs/onboarding/campus-card, /docs/onboarding/network
- 学业相关: /docs/academics/credits-gpa, /docs/academics/curriculum, /docs/academics/exams, /docs/academics/major-change, /docs/academics/double-degree, /docs/academics/english, /docs/academics/sports
- 生活相关: /docs/campus-life/dining, /docs/campus-life/campus-transport, /docs/campus-life/external-transport, /docs/campus-life/repair, /docs/campus-life/software
- 发展相关: /docs/career/postgraduate, /docs/career/awards, /docs/career/innovation-research

## 检索状态
- 命中文档数：${retrieval.sourceCount}
- 检索可信度：${retrieval.retrievalState}
- 最高相似度：${retrieval.maxSimilarity.toFixed(3)}

## 参考资料
${context || "暂无检索到的相关内容"}

## 回答规则
1. **直接回答**：第一句话切入核心结论，禁止”根据你正在浏览的页面…”之类的废话。
2. **要点提炼**：提取 3-5 个干货要点，不要长篇复述。
3. **链接格式**：所有链接必须使用 \`/docs/\` 开头的站内相对路径（如 \`/docs/academics/credits-gpa\`）。禁止输出完整域名 URL。参考上方站点结构确保路径正确。
4. **低命中处理**：如果检索状态是 \`weak\` 或 \`none\`，必须明确说“这条信息需要进一步核实”，不要编造具体流程，并提示已记录为信息缺口。
5. **信息来源**：回答末尾空一行，加 \`### 信息来源\`，列出引用链接：\`- [页面标题](/docs/...)\`。${currentPath ? `禁止包含当前页面 \`${currentPath}\` 的链接。` : ''}
6. **后续引导**：信息来源之后，再空一行，加 \`### 继续追问\`，列出 2-3 个相关的后续问题（用无序列表），帮助用户继续探索。
7. **语气**：中文，亲切友好，像学长/学姐给建议。找不到信息就诚实告知。`;

        // 5. 流式生成回答
        console.log("正在调用 DeepSeek API...");
        const result = streamText({
            model: getChatModel(),
            system: systemPrompt,
            messages,
            onError: ({ error }) => {
                console.error("streamText error:", error);
            }
        });
        console.log("准备输出 DataStreamResponse");

        // 6. 返回流式响应
        const response = result.toTextStreamResponse();

        // 添加 CORS headers
        const newHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
            newHeaders.set(key, value);
        });
        newHeaders.set("X-Ncubook-Query-Id", queryLogId);
        newHeaders.set("X-Ncubook-Retrieval-State", retrieval.retrievalState);
        newHeaders.set("X-Ncubook-Source-Count", String(retrieval.sourceCount));

        return new Response(response.body, {
            status: response.status,
            headers: newHeaders,
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return new Response(
            JSON.stringify({ error: "服务器内部错误" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
}
