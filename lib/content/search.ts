// 核心业务领域：文章级聚合与分层加权全文检索匹配引擎 (Group-by-Document & Relevance Scoring)
import type { SearchIndexEntry } from "@/lib/content/schema";

export type SearchSnippet = {
  anchor: string;
  headingPath: string[];
  text: string;
  isHeading: boolean;
};

export type GroupedSearchResult = {
  pageId: string;
  pageTitle: string;
  sectionPath: string[];
  href: string;
  isTitleMatch: boolean;
  score: number;
  snippets: SearchSnippet[];
  totalMatches: number;
};

// 保持兼容旧版单测/组件的扁平视图类型
export type SearchResult = {
  pageTitle: string;
  sectionPath: string[];
  excerpt: string;
  anchor: string;
  href: string;
};

export type SqlSearchSegment = {
  source_page_id: string;
  page_title: string;
  section_path: string[];
  anchor: string;
  block_type: string;
  plain_text: string;
  ts_rank: number;
  trgm_score: number;
};

/**
 * 标点清洗工具：剔除章节标题末尾的冒号、斜杠等悬挂标点
 */
export function cleanHeadingPunctuation(text: string): string {
  return text.replace(/[:：/、\s]+$/, "").trim();
}

/**
 * 提取关键词前后的紧凑上下文视窗 (Smart Context Snippet Window)
 */
export function extractSnippet(text: string, query: string, maxLength = 80): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const needle = query.trim().toLocaleLowerCase("zh-CN");
  if (!needle) return clean.slice(0, maxLength);

  const lower = clean.toLocaleLowerCase("zh-CN");
  const index = lower.indexOf(needle);
  if (index === -1) {
    return clean.length > maxLength ? `${clean.slice(0, maxLength)}…` : clean;
  }

  // 截取关键词前 20 字符与后 50 字符
  const start = Math.max(0, index - 20);
  const end = Math.min(clean.length, index + needle.length + 50);

  let snippet = clean.slice(start, end);
  if (start > 0) snippet = `…${snippet}`;
  if (end < clean.length) snippet = `${snippet}…`;
  return snippet;
}

/**
 * 将 SQL RPC search_published_segments 返回的段落列表聚合成文章级结果
 */
export function groupSqlSearchSegments(
  segments: SqlSearchSegment[],
  pageRoutes: Record<string, string>,
  query: string,
): GroupedSearchResult[] {
  const needle = query.trim().toLocaleLowerCase("zh-CN");
  const pageMap = new Map<
    string,
    {
      pageId: string;
      pageTitle: string;
      sectionPath: string[];
      route: string;
      score: number;
      snippets: SearchSnippet[];
      totalMatches: number;
      isTitleMatch: boolean;
    }
  >();

  for (const seg of segments) {
    let group = pageMap.get(seg.source_page_id);
    if (!group) {
      const firstSection = seg.section_path[0];
      const topSection = firstSection ? [firstSection] : ["综合指南"];
      const route = pageRoutes[seg.source_page_id] || `/docs/${seg.source_page_id}`;
      const isTitleMatch = seg.page_title.toLocaleLowerCase("zh-CN").includes(needle);
      group = {
        pageId: seg.source_page_id,
        pageTitle: seg.page_title,
        sectionPath: topSection,
        route,
        score: Math.max(seg.ts_rank, seg.trgm_score),
        snippets: [],
        totalMatches: isTitleMatch ? 1 : 0,
        isTitleMatch,
      };
      pageMap.set(seg.source_page_id, group);
    }

    const isHeading = seg.block_type === "heading";
    group.snippets.push({
      anchor: seg.anchor,
      headingPath: seg.section_path.slice(1).map(cleanHeadingPunctuation),
      text: extractSnippet(seg.plain_text, needle),
      isHeading,
    });
    group.totalMatches += 1;
    group.score = Math.max(group.score, seg.ts_rank, seg.trgm_score);
  }

  return Array.from(pageMap.values()).sort((a, b) => b.score - a.score);
}

/**
 * 行业标准文档级聚合搜索算法（用于客户端纯文本搜索或 Fixture 降级搜索）
 */
export function searchGroupedEntries(
  query: string,
  entries: SearchIndexEntry[],
  resolvePageRoute: (pageId: string) => string,
): GroupedSearchResult[] {
  const needle = query.trim().toLocaleLowerCase("zh-CN");
  if (!needle) return [];

  // 按 pageId 分组聚合
  const pageMap = new Map<
    string,
    {
      pageId: string;
      pageTitle: string;
      sectionPath: string[];
      route: string;
      entries: SearchIndexEntry[];
    }
  >();

  for (const entry of entries) {
    const existing = pageMap.get(entry.pageId);
    let group = existing;
    if (!group) {
      const firstSection = entry.sectionPath[0];
      const topSection = firstSection ? [firstSection] : ["综合指南"];
      group = {
        pageId: entry.pageId,
        pageTitle: entry.pageTitle,
        sectionPath: topSection,
        route: resolvePageRoute(entry.pageId),
        entries: [],
      };
      pageMap.set(entry.pageId, group);
    }
    group.entries.push(entry);
  }

  const results: GroupedSearchResult[] = [];

  for (const group of pageMap.values()) {
    const pageTitleLower = group.pageTitle.toLocaleLowerCase("zh-CN");
    const isExactTitle = pageTitleLower === needle;
    const isPrefixTitle = pageTitleLower.startsWith(needle);
    const isTitleMatch = pageTitleLower.includes(needle);

    let titleScore = 0;
    if (isExactTitle) titleScore = 120;
    else if (isPrefixTitle) titleScore = 90;
    else if (isTitleMatch) titleScore = 60;

    const matchingSnippets: SearchSnippet[] = [];
    let maxContentScore = 0;

    for (const entry of group.entries) {
      const textLower = entry.plainText.toLocaleLowerCase("zh-CN");
      const matched = textLower.includes(needle);

      if (matched) {
        const isHeading = entry.blockType === "heading";
        const contentScore = isHeading ? 45 : 20;
        if (contentScore > maxContentScore) maxContentScore = contentScore;

        matchingSnippets.push({
          anchor: entry.anchor,
          headingPath: entry.sectionPath.slice(1).map(cleanHeadingPunctuation),
          text: extractSnippet(entry.plainText, needle),
          isHeading,
        });
      }
    }

    const totalMatches = matchingSnippets.length + (isTitleMatch ? 1 : 0);

    // 只有当标题命中或者正文有内容命中时才返回该文档
    if (isTitleMatch || matchingSnippets.length > 0) {
      const finalScore = Math.max(titleScore, maxContentScore) + Math.min(matchingSnippets.length * 2, 10);

      results.push({
        pageId: group.pageId,
        pageTitle: group.pageTitle,
        sectionPath: group.sectionPath,
        href: group.route,
        isTitleMatch,
        score: finalScore,
        snippets: matchingSnippets,
        totalMatches,
      });
    }
  }

  // 按相关度总分降序排列
  return results.sort((a, b) => b.score - a.score);
}

/**
 * 兼容旧版调用的搜索方法 (包装为 GroupedSearchResult 结果)
 */
export function searchEntries(
  query: string,
  entries: SearchIndexEntry[],
  resolvePageRoute: (pageId: string) => string,
): SearchResult[] {
  const grouped = searchGroupedEntries(query, entries, resolvePageRoute);
  const flat: SearchResult[] = [];

  for (const group of grouped) {
    if (group.snippets.length === 0) {
      flat.push({
        pageTitle: group.pageTitle,
        sectionPath: group.sectionPath,
        excerpt: `匹配文档标题《${group.pageTitle}》`,
        anchor: "b-root",
        href: group.href,
      });
    } else {
      for (const snippet of group.snippets) {
        flat.push({
          pageTitle: group.pageTitle,
          sectionPath: [...group.sectionPath, ...snippet.headingPath],
          excerpt: snippet.text,
          anchor: snippet.anchor,
          href: snippet.anchor ? `${group.href}#${snippet.anchor}` : group.href,
        });
      }
    }
  }

  return flat;
}
