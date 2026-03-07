import { streamText } from "ai";
import { generateEmbedding, getChatModel } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";

// 允许的来源
const ALLOWED_ORIGINS = [
    "https://book.ncuos.com",
    "http://localhost:3000",
    "http://localhost:3001",
];

function getCorsHeaders(origin: string | null) {
    const allowedOrigin =
        origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

// 处理 CORS 预检请求
export async function OPTIONS(req: Request) {
    const origin = req.headers.get("origin");
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
    });
}

export async function POST(req: Request) {
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

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
                allDocs = [...exactDocs, ...allDocs];
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

        const contextChunks = finalDocs.map(
            (doc: any) =>
                `### ${doc.metadata.title}\n来源: ${doc.metadata.url}\n\n${doc.content}`
        );
        const context = contextChunks.join("\n\n---\n\n");

        // 4. 构建系统提示词
        const systemPrompt = `你是"小家园"🏠，南昌大学生存手册（book.ncuos.com）的 AI 助手。

## 你的职责
根据下面的参考资料回答用户关于南昌大学学习、生活的问题。
${currentPath ? `\n> **当前上下文**：用户正在浏览页面 \`${currentPath}\`。如果用户要求“总结当前页面”，请基于参考资料中匹配该路径的内容进行回答。` : ''}

## 参考资料
${context || "暂无检索到的相关内容"}

## 严格执行的回答规则
1. **禁止废话开头**：直接切入正题！**绝对禁止**在开头或文中输出“根据你正在浏览的页面 /xxx”或“在当前页面中”这样的废话，如果用户让我们总结当前页面，第一句话直接把总结内容说出来！
2. **先给结论**：第一句话直接回答用户的核心疑问。
3. **要点提炼**：如果参考资料内容较多，提取最核心的 3-5 个干货要点。绝不要长篇大论复述所有细节。
4. **强制标注信息来源**：这是**必须**执行的步骤。
   - 只要你使用了参考资料中的信息，**必须**在回答的**最末尾**单独空一行，加上标题 \`### 📚 信息来源\`，并使用无序列表列出引用的原文链接，格式为：\`- [页面标题](URL)\`。
   ${currentPath ? `- **最高禁忌**：绝对禁止在回答的任何地方（包括开头、正文建议或"信息来源"中）包含用户当前所在页面（含有 \`${currentPath}\` 的链接）！用户已经在看该页面了，绝不能提示让他们去点击当前页！不要输出当前页面的链接！` : ''}
5. **语气要求**：用中文回答，语气亲切友好，像学长/学姐给建议。如果找不到相关信息，诚实告知。`;

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
