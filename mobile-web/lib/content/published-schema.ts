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
