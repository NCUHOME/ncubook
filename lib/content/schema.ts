// 核心业务领域：Notion 转换后的标准校园文档、富文本 Block 节点、Asset 静态资源与搜索索引 TypeScript 数据契约
export type RichTextColor =
  | "default"
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink";

export type RichText = Array<{
  plainText: string;
  href?: string;
  pageId?: string;
  annotations: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
    color?: RichTextColor;
  };
}>;

export type BaseBlock = { id: string; anchor: string };

export type Block =
  | (BaseBlock & { type: "paragraph"; richText: RichText })
  | (BaseBlock & { type: "quote"; richText: RichText; children: Block[] })
  | (BaseBlock & { type: "heading"; level: 1 | 2 | 3; richText: RichText })
  | (BaseBlock & {
      type: "bulleted-list" | "numbered-list";
      items: Array<{ id: string; richText: RichText; children: Block[] }>;
    })
  | (BaseBlock & { type: "callout"; tone: "info" | "warning" | "risk"; icon?: string; richText: RichText; children: Block[] })
  | (BaseBlock & { type: "divider" })
  | (BaseBlock & {
      type: "table";
      hasHeaderRow: boolean;
      rows: Array<{ id: string; cells: RichText[] }>;
    })
  | (BaseBlock & { type: "image"; assetId: string; caption?: RichText })
  | (BaseBlock & { type: "file"; assetId: string; name: string; caption?: RichText })
  | (BaseBlock & { type: "columns"; columns: Array<{ id: string; blocks: Block[] }> })
  | (BaseBlock & { type: "embed"; provider: "school-map"; canonicalUrl: string; title: string })
  | (BaseBlock & { type: "page-link"; pageId: string; richText: RichText });

export type Page = {
  id: string;
  schemaVersion: 1;
  contentVersion: string;
  parentId: string | null;
  title: string;
  slug: string;
  status: "published" | "failed";
  lastEditedTime: string;
  lastPublishedAt: string;
  metadata: {
    school: "ncu";
    campus?: string[];
    audiences?: string[];
    topics?: string[];
    sourceUrls: string[];
    riskLevel: "normal" | "needs-verification" | "sensitive";
  };
};

export type Asset = {
  id: string;
  sourceBlockId: string;
  contentVersion: string;
  kind: "image" | "file";
  publicUrl: string;
  checksum: string;
  alt?: string;
};

export type SearchIndexEntry = {
  id: string;
  schemaVersion: 1;
  contentVersion: string;
  pageId: string;
  pageTitle: string;
  sectionPath: string[];
  anchor: string;
  plainText: string;
  blockType: "paragraph" | "heading" | "quote" | "callout" | "table" | "page-link";
  updatedAt: string;
};

export type PublishedFixture = {
  pages: Page[];
  blocksByPageId: Record<string, Block[]>;
  assets: Asset[];
  searchIndex: SearchIndexEntry[];
};

export type TrustStatus = "official" | "student-verified" | "unverified" | "官方来源" | "同学经验已核实" | "待核实";
export type ReviewStatus = "published" | "draft" | "deprecated";
export type RiskLevel = "normal" | "needs-verification" | "sensitive" | "low" | "medium" | "high";

export type InformationCard = {
  slug: string;
  title: string;
  category: string;
  summary?: string;
  content?: string;
  conclusion?: string;
  steps?: string[];
  notes?: string[];
  sourceType?: string;
  sourceUrl?: string;
  relatedCards?: string[];
  tags: string[];
  audience: string;
  sources?: Array<{ name: string; url?: string }>;
  updatedAt: string;
  trustStatus: TrustStatus;
  reviewStatus: ReviewStatus;
  riskLevel: RiskLevel;
};

export function isTrustStatus(value: string): value is TrustStatus {
  return value === "official" || value === "student-verified" || value === "unverified" || value === "官方来源" || value === "同学经验已核实" || value === "待核实";
}

export function isReviewStatus(value: string): value is ReviewStatus {
  return value === "published" || value === "draft" || value === "deprecated";
}

export function isRiskLevel(value: string): value is RiskLevel {
  return value === "normal" || value === "needs-verification" || value === "sensitive" || value === "low" || value === "medium" || value === "high";
}

export function anchorFromSourceId(sourceId: string): string {
  return `b-${sourceId}`;
}
