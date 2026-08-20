// 类型契约：全站埋点事件定义与载荷规范 (lib/analytics/types.ts)

export type AnalyticsEventName =
  | "page_view"
  | "article_read_complete"
  | "search_query"
  | "search_result_click"
  | "ai_ask_submitted"
  | "contact_copied"
  | "feishu_feedback_click";

export type PageViewPayload = {
  path: string;
  slug?: string;
  pageTitle?: string;
  referrer?: string;
  device?: "mobile" | "tablet" | "desktop";
};

export type ArticleReadCompletePayload = {
  slug: string;
  pageTitle?: string;
  readDurationMs?: number;
};

export type SearchQueryPayload = {
  query: string;
  resultCount: number;
  source?: "home" | "overlay" | "header";
};

export type SearchResultClickPayload = {
  query: string;
  clickedSlug: string;
  clickedTitle?: string;
  rankIndex?: number;
};

export type AiAskSubmittedPayload = {
  questionPreview: string;
  source?: "fab" | "search" | "doc" | "suggest";
  docSlug?: string;
};

export type ContactCopiedPayload = {
  targetType: "phone" | "qq" | "email" | "link";
  value: string;
  label?: string;
};

export type FeishuFeedbackClickPayload = {
  from: "doc" | "ai" | "admin";
  prefillSlug?: string;
};

export type AnalyticsEventPayloadMap = {
  page_view: PageViewPayload;
  article_read_complete: ArticleReadCompletePayload;
  search_query: SearchQueryPayload;
  search_result_click: SearchResultClickPayload;
  ai_ask_submitted: AiAskSubmittedPayload;
  contact_copied: ContactCopiedPayload;
  feishu_feedback_click: FeishuFeedbackClickPayload;
};

export type StoredAnalyticsEvent = {
  id?: number;
  session_id: string;
  event_name: AnalyticsEventName;
  event_data: Record<string, unknown>;
  created_at?: string;
};

export type AnalyticsSummary = {
  todayPv: number;
  todayUv: number;
  totalSearches: number;
  zeroResultSearches: number;
  totalAiAsks: number;
  totalContactCopies: number;
  topArticles: Array<{
    slug: string;
    title: string;
    sectionTitle?: string;
    routePath?: string;
    notionUrl?: string;
    views: number;
  }>;
  topSearchQueries: Array<{ query: string; count: number; zeroResult: boolean }>;
  zeroResultQueries: Array<{ query: string; count: number; lastSearchedAt: string }>;
  recentEvents: Array<{
    id: number;
    eventName: AnalyticsEventName;
    eventData: Record<string, unknown>;
    createdAt: string;
    resolvedTitle?: string;
    resolvedSection?: string;
    routePath?: string;
    notionUrl?: string;
  }>;
};
