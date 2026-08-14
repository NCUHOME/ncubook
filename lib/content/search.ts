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
 * 行业标准文档级聚合搜索算法
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
    let group = pageMap.get(entry.pageId);
    if (!group) {
      const topSection = entry.sectionPath.length > 0 ? [entry.sectionPath[0]] : ["综合指南"];
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
