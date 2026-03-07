/**
 * 文档向量化入库脚本
 *
 * 读取 docs/ 目录下所有 markdown 文件，按 H2 标题切片，
 * 使用 Gemini text-embedding-004 生成向量，存入 Supabase pgvector。
 *
 * 使用方法：
 *   1. 在 ncubook-api/.env.local 中配置环境变量
 *   2. 运行: npm run ingest
 */

import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// 加载环境变量
config({ path: path.resolve(__dirname, "../.env.local") });

// --- 动态加载 supabase 和 gemini (确保 dotenv 先加载环境变量) ---
import { createClient } from "@supabase/supabase-js"; // Import for type definition
let supabase: ReturnType<typeof createClient>;
let generateEmbedding: (text: string) => Promise<number[]>;

async function initClients() {
    const { supabase: s } = await import("../lib/supabase");
    const { generateEmbedding: ge } = await import("../lib/gemini");
    supabase = s;
    generateEmbedding = ge;
}


// --- Markdown 文件处理 ---

interface DocChunk {
    content: string;
    metadata: {
        title: string;
        url: string;
        source_file: string;
        heading: string;
    };
}

/**
 * 将文件路径转换为网站 URL
 * docs/study/credits-gpa.md → /study/credits-gpa
 * docs/README.mdx → /
 */
function filePathToUrl(filePath: string, docsRoot: string): string {
    let relative = path.relative(docsRoot, filePath);
    // 移除扩展名
    relative = relative.replace(/\.(mdx?|md)$/, "");
    // README 文件对应目录首页
    relative = relative.replace(/\/README$/, "/");
    if (relative === "README") return "/";
    // 统一为 /开头
    return "/" + relative;
}

/**
 * 递归查找所有 markdown 文件
 */
function findMarkdownFiles(dir: string): string[] {
    const results: string[] = [];

    function walk(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (/\.(md|mdx)$/.test(entry.name)) {
                results.push(fullPath);
            }
        }
    }

    walk(dir);
    return results;
}

/**
 * 获取文档的一级标题 (如果有 frontmatter title 则用 frontmatter)
 */
function getDocTitle(content: string): string {
    // 检查 frontmatter
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (fmMatch) {
        const titleMatch = fmMatch[1].match(/title:\s*["']?(.+?)["']?\s*$/m);
        if (titleMatch) return titleMatch[1];
    }
    // 检查 H1
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) return h1Match[1];
    return "未命名文档";
}

/**
 * 按 H2 标题切片文档
 * 如果文档没有 H2，则作为整体返回
 */
function splitByH2(
    content: string,
    filePath: string,
    docsRoot: string
): DocChunk[] {
    const url = filePathToUrl(filePath, docsRoot);
    const docTitle = getDocTitle(content);

    // 移除 frontmatter
    const cleanContent = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");

    // 按 H2 切片
    const h2Regex = /^## (.+)$/gm;
    const chunks: DocChunk[] = [];
    let lastIndex = 0;
    let lastHeading = docTitle;
    let match: RegExpExecArray | null;

    // 收集 H2 前的内容（如果有的话且有实际内容）
    const firstH2 = h2Regex.exec(cleanContent);
    if (firstH2) {
        const preamble = cleanContent.slice(0, firstH2.index).trim();
        if (preamble.length > 50) {
            // 只有足够长的前言才作为切片
            chunks.push({
                content: `# ${docTitle}\n\n${preamble}`,
                metadata: {
                    title: docTitle,
                    url,
                    source_file: filePath,
                    heading: docTitle,
                },
            });
        }
        lastIndex = firstH2.index;
        lastHeading = firstH2[1];
    }

    // 重置 regex
    h2Regex.lastIndex = firstH2 ? firstH2.index : 0;

    const allH2s: { index: number; heading: string }[] = [];
    if (firstH2) {
        allH2s.push({ index: firstH2.index, heading: firstH2[1] });
    }
    while ((match = h2Regex.exec(cleanContent)) !== null) {
        if (match.index !== firstH2?.index) {
            allH2s.push({ index: match.index, heading: match[1] });
        }
    }

    if (allH2s.length === 0) {
        // 没有 H2，整篇文档作为一个切片
        const trimmed = cleanContent.trim();
        if (trimmed.length > 0) {
            chunks.push({
                content: `# ${docTitle}\n\n${trimmed}`,
                metadata: { title: docTitle, url, source_file: filePath, heading: docTitle },
            });
        }
        return chunks;
    }

    // 按 H2 切片
    for (let i = 0; i < allH2s.length; i++) {
        const start = allH2s[i].index;
        const end = i + 1 < allH2s.length ? allH2s[i + 1].index : cleanContent.length;
        const chunkContent = cleanContent.slice(start, end).trim();

        if (chunkContent.length > 0) {
            const heading = allH2s[i].heading;
            chunks.push({
                content: `来源文档: ${docTitle}\n\n${chunkContent}`,
                metadata: {
                    title: `${docTitle} - ${heading}`,
                    url,
                    source_file: filePath,
                    heading,
                },
            });
        }
    }

    return chunks;
}

// --- 主流程 ---

async function main() {
    await initClients();
    const docsRoot = path.resolve(__dirname, "../../docs");

    if (!fs.existsSync(docsRoot)) {
        console.error(`❌ docs 目录不存在: ${docsRoot}`);
        process.exit(1);
    }

    console.log(`📂 读取文档目录: ${docsRoot}`);
    const files = findMarkdownFiles(docsRoot);
    console.log(`📄 找到 ${files.length} 个 Markdown 文件\n`);

    // 切片所有文档
    const allChunks: DocChunk[] = [];
    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        const chunks = splitByH2(content, file, docsRoot);
        console.log(
            `  📝 ${path.relative(docsRoot, file)} → ${chunks.length} 个切片`
        );
        allChunks.push(...chunks);
    }
    console.log(`\n📊 总计 ${allChunks.length} 个切片\n`);

    // 清空旧数据
    console.log("🗑️  清空旧数据...");
    const { error: deleteError } = await supabase
        .from("documents")
        .delete()
        .neq("id", 0); // 删除所有行
    if (deleteError) {
        console.error("清空数据失败:", deleteError);
        process.exit(1);
    }

    // 向量化并入库
    console.log("🔄 开始向量化并入库...\n");
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allChunks.length; i++) {
        const chunk = allChunks[i];
        const progress = `[${i + 1}/${allChunks.length}]`;

        try {
            // 生成向量
            const embedding = await generateEmbedding(chunk.content);

            // 存入 Supabase
            const { error: insertError } = await supabase.from("documents").insert({
                content: chunk.content,
                metadata: chunk.metadata,
                embedding,
            });

            if (insertError) {
                console.error(`  ❌ ${progress} ${chunk.metadata.title}: ${insertError.message}`);
                errorCount++;
            } else {
                console.log(`  ✅ ${progress} ${chunk.metadata.title}`);
                successCount++;
            }

            // 避免 API 速率限制 - 每个请求间隔 200ms
            await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (err) {
            console.error(
                `  ❌ ${progress} ${chunk.metadata.title}: ${err instanceof Error ? err.message : err}`
            );
            errorCount++;
        }
    }

    console.log(
        `\n🎉 完成! 成功: ${successCount}, 失败: ${errorCount}, 总计: ${allChunks.length}`
    );
}

main().catch(console.error);
