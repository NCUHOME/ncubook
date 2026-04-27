#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_ROOT = path.join(REPO_ROOT, "docs");
const NOTION_VERSION = "2022-06-28";
const CONTENT_DB_TITLE = "此间内容库";

const CATEGORY_BY_PREFIX = [
  ["onboarding", "新生"],
  ["academics", "学业"],
  ["campus-life", "生活"],
  ["career", "发展"],
  ["contributors", "共建"],
];

const DEFAULT_STATUS = "已发布";
const DEFAULT_SYNC_STATUS = "未同步";

export function normalizeDocPath(filePath) {
  return path.relative(REPO_ROOT, filePath).replaceAll(path.sep, "/");
}

export function slugFromDocPath(docPath) {
  const withoutDocs = docPath.replace(/^docs\//, "").replace(/\.(mdx|md)$/i, "");
  if (withoutDocs === "README") return "index";
  return withoutDocs.replace(/\/README$/i, "");
}

export function categoryFromSlug(slug) {
  const match = CATEGORY_BY_PREFIX.find(([prefix]) => slug === prefix || slug.startsWith(`${prefix}/`));
  return match ? match[1] : "共建";
}

export function titleFromMarkdown(markdown, fallback) {
  const titleLine = markdown.split(/\r?\n/).find((line) => /^#\s+/.test(line.trim()));
  return titleLine ? titleLine.replace(/^#\s+/, "").trim() : fallback;
}

export function extractDocMeta(markdown) {
  const metaMatch = markdown.match(/<p\s+className=["']doc-meta["']>([\s\S]*?)<\/p>/i);
  if (!metaMatch) {
    return {
      pageUpdated: null,
      officialSources: "",
      verifyStatus: "待核实",
      pendingVerification: "",
    };
  }

  const rawMeta = htmlToMarkdownInline(metaMatch[1]).replace(/\s+/g, " ").trim();
  const dateMatch = rawMeta.match(/页面更新[：:]\s*(\d{4}-\d{2}-\d{2})/);
  const pendingMatch = rawMeta.match(/待核实[：:]\s*([^·。]+)/);
  const links = [...metaMatch[1].matchAll(/<a\s+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi)]
    .map(([, href, text]) => `${stripHtml(text)} ${href}`)
    .join("\n");

  return {
    pageUpdated: dateMatch ? dateMatch[1] : null,
    officialSources: links || rawMeta,
    verifyStatus: pendingMatch ? "待核实" : "已核验",
    pendingVerification: pendingMatch ? pendingMatch[1].trim() : "",
  };
}

export function docPriority(slug, verifyStatus) {
  if (
    /major-change|double-degree|exams|awards|medical-insurance|employment-services|campus-card|network|repair/.test(
      slug,
    )
  ) {
    return "P0";
  }
  if (verifyStatus === "待核实") return "P1";
  if (/freshmen-guide|phone-directory|academic-services/.test(slug)) return "P1";
  return "P2";
}

export function mdxToEditableMarkdown(markdown) {
  let body = markdown.replace(/^---[\s\S]*?---\s*/m, "");

  body = body
    .replace(/^import\s+.*?;?\s*$/gm, "")
    .replace(/<QuoteCard[^>]*>/g, "> ")
    .replace(/<\/QuoteCard>/g, "")
    .replace(/<aside[^>]*>/g, "> ")
    .replace(/<\/aside>/g, "")
    .replace(/<p\s+className=["']doc-meta["']>([\s\S]*?)<\/p>/gi, (_, inner) => {
      const plain = htmlToMarkdownInline(inner).replace(/\s+/g, " ").trim();
      return plain ? `> ${plain}` : "";
    })
    .replace(/^:{3,4}([a-zA-Z]+)?(?:\[(.*?)\])?\s*$/gm, (_, kind = "", title = "") => {
      if (!kind) return "";
      const label = title || admonitionLabel(kind);
      return `> **${label}**`;
    })
    .replace(/^:{3,4}\s*$/gm, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a\s+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, href, text) => `[${stripHtml(text)}](${href})`)
    .replace(/<\/?[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return body;
}

function admonitionLabel(kind) {
  const labels = {
    tip: "提示",
    note: "说明",
    info: "信息",
    warning: "注意",
    danger: "风险",
  };
  return labels[kind.toLowerCase()] || kind;
}

function htmlToMarkdownInline(input) {
  return input
    .replace(/<a\s+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, href, text) => `[${stripHtml(text)}](${href})`)
    .replace(/<\/?[^>]+>/g, "");
}

function stripHtml(input) {
  return String(input).replace(/<\/?[^>]+>/g, "").trim();
}

export async function listDocFiles(dir = DOCS_ROOT) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "img") continue;
      files.push(...(await listDocFiles(fullPath)));
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

export async function readDocs() {
  const files = await listDocFiles();
  const docs = [];
  for (const filePath of files) {
    const raw = await readFile(filePath, "utf8");
    const docPath = normalizeDocPath(filePath);
    const slug = slugFromDocPath(docPath);
    const meta = extractDocMeta(raw);
    const title = titleFromMarkdown(raw, slug);
    const body = mdxToEditableMarkdown(raw);
    const verifyStatus = meta.verifyStatus;
    docs.push({
      title,
      slug,
      category: categoryFromSlug(slug),
      status: DEFAULT_STATUS,
      syncStatus: DEFAULT_SYNC_STATUS,
      priority: docPriority(slug, verifyStatus),
      targetPath: docPath,
      syncToWeb: true,
      pageUpdated: meta.pageUpdated,
      officialSources: meta.officialSources,
      pendingVerification: meta.pendingVerification,
      verifyStatus,
      body,
    });
  }
  return docs;
}

export function markdownToNotionBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split(/\r?\n/);
  let paragraph = [];

  const flushParagraph = () => {
    const text = paragraph.join("\n").trim();
    paragraph = [];
    if (!text) return;
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: richTextChunks(text) },
    });
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const type = `heading_${level}`;
      blocks.push({
        object: "block",
        type,
        [type]: { rich_text: richTextChunks(heading[2]) },
      });
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ object: "block", type: "divider", divider: {} });
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: richTextChunks(bullet[1]) },
      });
      continue;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: { rich_text: richTextChunks(numbered[1]) },
      });
      continue;
    }

    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      blocks.push({
        object: "block",
        type: "quote",
        quote: { rich_text: richTextChunks(quote[1]) },
      });
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  return blocks.length ? blocks : [{ object: "block", type: "paragraph", paragraph: { rich_text: [] } }];
}

function richTextChunks(text) {
  const chunks = [];
  const normalized = String(text).slice(0, 6000);
  for (let index = 0; index < normalized.length; index += 1900) {
    chunks.push({ type: "text", text: { content: normalized.slice(index, index + 1900) } });
  }
  return chunks;
}

export function notionBlocksToMarkdown(blocks) {
  const lines = [];
  for (const block of blocks) {
    const text = plainTextFromBlock(block);
    switch (block.type) {
      case "heading_1":
        lines.push(`# ${text}`);
        break;
      case "heading_2":
        lines.push(`## ${text}`);
        break;
      case "heading_3":
        lines.push(`### ${text}`);
        break;
      case "bulleted_list_item":
        lines.push(`- ${text}`);
        break;
      case "numbered_list_item":
        lines.push(`1. ${text}`);
        break;
      case "quote":
        lines.push(`> ${text}`);
        break;
      case "divider":
        lines.push("---");
        break;
      default:
        if (text) lines.push(text);
    }
    lines.push("");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function plainTextFromBlock(block) {
  const value = block[block.type];
  if (!value?.rich_text) return "";
  return value.rich_text.map((item) => item.plain_text || item.text?.content || "").join("");
}

function notionHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

async function notionRequest(method, endpoint, body) {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("Missing NOTION_TOKEN. Create an internal integration token and share the page/database with it.");

  const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method,
    headers: notionHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notion API ${method} ${endpoint} failed: ${response.status} ${errorText}`);
  }
  return response.json();
}

async function queryDatabaseByTargetPath(databaseId, targetPath) {
  const data = await notionRequest("POST", `/databases/${databaseId}/query`, {
    filter: {
      property: "目标路径",
      rich_text: { equals: targetPath },
    },
    page_size: 1,
  });
  return data.results?.[0] || null;
}

function pageProperties(doc) {
  return {
    标题: { title: [{ text: { content: doc.title } }] },
    Slug: { rich_text: [{ text: { content: doc.slug } }] },
    分类: { select: { name: doc.category } },
    状态: { select: { name: doc.status } },
    优先级: { select: { name: doc.priority } },
    目标路径: { rich_text: [{ text: { content: doc.targetPath } }] },
    同步到网页: { checkbox: doc.syncToWeb },
    网页同步状态: { select: { name: doc.syncStatus } },
    官方来源: doc.officialSources ? { rich_text: [{ text: { content: doc.officialSources.slice(0, 1900) } }] } : { rich_text: [] },
    待核实项: doc.pendingVerification ? { rich_text: [{ text: { content: doc.pendingVerification.slice(0, 1900) } }] } : { rich_text: [] },
    核验状态: { select: { name: doc.verifyStatus } },
    负反馈次数: { number: 0 },
    页面更新: doc.pageUpdated
      ? { date: { start: doc.pageUpdated } }
      : { date: null },
  };
}

async function createOrUpdatePage(databaseId, doc, { dryRun }) {
  const blocks = markdownToNotionBlocks(doc.body);
  const existing = await queryDatabaseByTargetPath(databaseId, doc.targetPath);
  if (dryRun) {
    return { action: existing ? "would-update" : "would-create", pageId: existing?.id || null, blocks: blocks.length };
  }

  if (!existing) {
    const page = await notionRequest("POST", "/pages", {
      parent: { database_id: databaseId },
      properties: pageProperties(doc),
      children: blocks.slice(0, 100),
    });
    if (blocks.length > 100) await appendBlocksInBatches(page.id, blocks.slice(100));
    return { action: "created", pageId: page.id, blocks: blocks.length };
  }

  await notionRequest("PATCH", `/pages/${existing.id}`, { properties: pageProperties(doc) });
  await replacePageChildren(existing.id, blocks);
  return { action: "updated", pageId: existing.id, blocks: blocks.length };
}

async function replacePageChildren(pageId, blocks) {
  const children = await notionRequest("GET", `/blocks/${pageId}/children?page_size=100`);
  for (const child of children.results || []) {
    await notionRequest("DELETE", `/blocks/${child.id}`);
  }
  await appendBlocksInBatches(pageId, blocks);
}

async function appendBlocksInBatches(pageId, blocks) {
  for (let index = 0; index < blocks.length; index += 100) {
    await notionRequest("PATCH", `/blocks/${pageId}/children`, {
      children: blocks.slice(index, index + 100),
    });
    await sleep(350);
  }
}

async function queryAllContentPages(databaseId) {
  const pages = [];
  let startCursor;
  do {
    const data = await notionRequest("POST", `/databases/${databaseId}/query`, {
      filter: {
        and: [
          { property: "同步到网页", checkbox: { equals: true } },
          { property: "状态", select: { equals: "已发布" } },
        ],
      },
      start_cursor: startCursor,
      page_size: 50,
    });
    pages.push(...(data.results || []));
    startCursor = data.has_more ? data.next_cursor : null;
  } while (startCursor);
  return pages;
}

async function getAllBlockChildren(blockId) {
  const blocks = [];
  let startCursor;
  do {
    const suffix = startCursor ? `&start_cursor=${startCursor}` : "";
    const data = await notionRequest("GET", `/blocks/${blockId}/children?page_size=100${suffix}`);
    for (const block of data.results || []) {
      blocks.push(block);
      if (block.has_children) {
        const children = await getAllBlockChildren(block.id);
        blocks.push(...children.map((child) => ({ ...child, __nested: true })));
      }
    }
    startCursor = data.has_more ? data.next_cursor : null;
  } while (startCursor);
  return blocks;
}

function readRichTextProperty(page, name) {
  const prop = page.properties?.[name];
  if (!prop) return "";
  if (prop.type === "title") return prop.title.map((item) => item.plain_text || "").join("");
  if (prop.type === "rich_text") return prop.rich_text.map((item) => item.plain_text || "").join("");
  return "";
}

async function exportDocs({ dryRun = true } = {}) {
  const databaseId = process.env.NOTION_CONTENT_DATABASE_ID;
  if (!databaseId) throw new Error("Missing NOTION_CONTENT_DATABASE_ID. Use the database id from the Notion URL.");

  const pages = await queryAllContentPages(databaseId);
  for (const page of pages) {
    const targetPath = readRichTextProperty(page, "目标路径");
    const title = readRichTextProperty(page, "标题");
    if (!targetPath) {
      console.log(`skip         ${page.id} (missing 目标路径)`);
      continue;
    }

    const blocks = await getAllBlockChildren(page.id);
    let markdown = notionBlocksToMarkdown(blocks);
    if (title && !markdown.startsWith("# ")) markdown = `# ${title}\n\n${markdown}`.trim();

    const destination = path.join(REPO_ROOT, targetPath);
    if (dryRun) {
      console.log(`would-write  ${targetPath} (${blocks.length} blocks)`);
    } else {
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, `${markdown}\n`, "utf8");
      console.log(`wrote        ${targetPath} (${blocks.length} blocks)`);
    }
    await sleep(350);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function importDocs({ dryRun = true } = {}) {
  const databaseId = process.env.NOTION_CONTENT_DATABASE_ID;
  if (!databaseId) throw new Error("Missing NOTION_CONTENT_DATABASE_ID. Use the database id from the Notion URL.");

  const docs = await readDocs();
  const results = [];
  for (const doc of docs) {
    const result = await createOrUpdatePage(databaseId, doc, { dryRun });
    results.push({ ...result, title: doc.title, targetPath: doc.targetPath });
    console.log(`${result.action.padEnd(12)} ${doc.targetPath} (${result.blocks} blocks)`);
    await sleep(350);
  }
  return results;
}

async function checkDocs() {
  const docs = await readDocs();
  assert.ok(docs.length > 0, "No docs found");
  for (const doc of docs) {
    assert.ok(doc.title, `Missing title: ${doc.targetPath}`);
    assert.ok(doc.slug, `Missing slug: ${doc.targetPath}`);
    assert.ok(doc.body, `Missing body: ${doc.targetPath}`);
    assert.ok(markdownToNotionBlocks(doc.body).length > 0, `No blocks: ${doc.targetPath}`);
  }
  console.log(`Checked ${docs.length} docs. All can be converted to editable Notion blocks.`);
}

async function writePlan() {
  const docs = await readDocs();
  const byCategory = docs.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {});
  console.log(`${CONTENT_DB_TITLE} import plan`);
  console.table(byCategory);
  console.log(`Total docs: ${docs.length}`);
  console.log("Required env:");
  console.log("- NOTION_TOKEN");
  console.log("- NOTION_CONTENT_DATABASE_ID");
  console.log("Dry run:");
  console.log("  pnpm notion:import:dry");
  console.log("Write to Notion:");
  console.log("  pnpm notion:import");
}

async function main() {
  const command = process.argv[2] || "plan";
  if (command === "plan") return writePlan();
  if (command === "check") return checkDocs();
  if (command === "import") return importDocs({ dryRun: false });
  if (command === "import:dry") return importDocs({ dryRun: true });
  if (command === "export") return exportDocs({ dryRun: false });
  if (command === "export:dry") return exportDocs({ dryRun: true });
  throw new Error(`Unknown command: ${command}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
