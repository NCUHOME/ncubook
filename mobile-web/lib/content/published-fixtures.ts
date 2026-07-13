import type { Block, Page, PublishedFixture, RichText, SearchIndexEntry } from "@/lib/content/published-schema";

const contentVersion = "content-2026-07";
const publishedAt = "2026-07-13T10:00:00.000Z";

function text(plainText: string): RichText {
  return [{ plainText, annotations: {} }];
}

function page(input: Pick<Page, "id" | "parentId" | "title" | "slug"> & { topics: string[] }): Page {
  return {
    id: input.id,
    schemaVersion: 1,
    contentVersion,
    parentId: input.parentId,
    title: input.title,
    slug: input.slug,
    status: "published",
    lastEditedTime: publishedAt,
    lastPublishedAt: publishedAt,
    metadata: {
      school: "ncu",
      audiences: ["students"],
      topics: input.topics,
      sourceUrls: [],
      riskLevel: "normal",
    },
  };
}

export const pagesFixture: Page[] = [
  page({ id: "section-onboarding", parentId: null, title: "入学报到", slug: "onboarding", topics: ["新生"] }),
  page({ id: "section-campus-life", parentId: null, title: "校园生活", slug: "campus-life", topics: ["生活"] }),
  page({ id: "section-academics", parentId: null, title: "学习考试", slug: "academics", topics: ["学习"] }),
  page({ id: "section-services", parentId: null, title: "办事服务", slug: "services", topics: ["服务"] }),
  page({ id: "page-campus-transport", parentId: "section-campus-life", title: "校园交通", slug: "campus-transport", topics: ["生活", "交通"] }),
  page({ id: "page-campus-shuttle", parentId: "page-campus-transport", title: "校园环游车乘坐指南", slug: "campus-shuttle", topics: ["生活", "交通"] }),
  page({ id: "page-rich-content", parentId: "section-campus-life", title: "富内容展示", slug: "rich-content-guide", topics: ["生活", "示例"] }),
];

const sectionBlocks: Block[] = [
  { id: "section-intro", anchor: "b-section-intro", type: "paragraph", richText: text("从住宿、交通到日常服务，整理在南大生活时最常遇到的信息。") },
];

const onboardingBlocks: Block[] = [
  { id: "onboarding-intro", anchor: "b-onboarding-intro", type: "paragraph", richText: text("从报到材料、到校路线到入住宿舍，集中整理新生最先需要的信息。") },
];

const academicBlocks: Block[] = [
  { id: "academic-intro", anchor: "b-academic-intro", type: "paragraph", richText: text("课程、考试、成绩与培养环节相关信息。") },
];

const serviceBlocks: Block[] = [
  { id: "service-intro", anchor: "b-service-intro", type: "paragraph", richText: text("校园卡、网络、报修与常用办事入口。") },
];

const transportBlocks: Block[] = [
  { id: "transport-intro", anchor: "b-transport-intro", type: "paragraph", richText: text("校内交通包含环游车、单车与校区间接驳信息。") },
];

const shuttleBlocks: Block[] = [
  { id: "shuttle-intro", anchor: "b-shuttle-intro", type: "paragraph", richText: text("校园环游车连接前湖北院、南院与主要教学区域，适合校内较长距离通行。") },
  { id: "fare-heading", anchor: "b-fare-heading", type: "heading", level: 2, richText: text("路线与收费") },
  { id: "fare", anchor: "b-fare", type: "paragraph", richText: text("单次收费 0.9 元，可使用支付宝洪城一卡通或扫描车载二维码付款。") },
];

const richBlocks: Block[] = [
  { id: "rich-paragraph", anchor: "b-rich-paragraph", type: "paragraph", richText: text("这是一段保留原始结构的正文。") },
  { id: "rich-quote", anchor: "b-rich-quote", type: "quote", richText: text("内容结构不应在迁移时被压平。") },
  { id: "rich-heading", anchor: "b-rich-heading", type: "heading", level: 2, richText: text("富内容示例") },
  {
    id: "rich-bullets",
    anchor: "b-rich-bullets",
    type: "bulleted-list",
    items: [{ id: "bullet-one", richText: text("保留无序列表"), children: [] }],
  },
  {
    id: "rich-numbers",
    anchor: "b-rich-numbers",
    type: "numbered-list",
    items: [{ id: "number-one", richText: text("保留有序步骤"), children: [] }],
  },
  { id: "rich-divider", anchor: "b-rich-divider", type: "divider" },
  {
    id: "rich-callout",
    anchor: "b-rich-callout",
    type: "callout",
    tone: "info",
    icon: "info",
    richText: text("这是一条低干扰提示。"),
    children: [{
      id: "rich-callout-list",
      anchor: "b-rich-callout-list",
      type: "bulleted-list",
      items: [{ id: "rich-callout-item", richText: text("提示块内的原始子内容会被保留。"), children: [] }],
    }],
  },
  {
    id: "rich-table",
    anchor: "b-rich-table",
    type: "table",
    hasHeaderRow: true,
    rows: [
      { id: "table-row-header", cells: [text("项目"), text("说明")] },
      { id: "table-row-fare", cells: [text("费用"), text("0.9 元")] },
    ],
  },
  { id: "rich-image", anchor: "b-rich-image", type: "image", assetId: "asset-campus-map", caption: text("校园交通路线示意") },
  { id: "rich-file", anchor: "b-rich-file", type: "file", assetId: "asset-guide-pdf", name: "校园生活指南.pdf", caption: text("附件示例") },
  {
    id: "rich-columns",
    anchor: "b-rich-columns",
    type: "columns",
    columns: [
      { id: "column-one", blocks: [{ id: "column-one-text", anchor: "b-column-one-text", type: "paragraph", richText: text("左列内容") }] },
      { id: "column-two", blocks: [{ id: "column-two-text", anchor: "b-column-two-text", type: "paragraph", richText: text("右列内容") }] },
    ],
  },
  { id: "rich-embed", anchor: "b-rich-embed", type: "embed", provider: "school-map", canonicalUrl: "https://school-map.ncuos.com/", title: "校园地图" },
  { id: "rich-page-link", anchor: "b-rich-page-link", type: "page-link", pageId: "page-campus-shuttle", richText: text("查看校园环游车乘坐指南") },
];

export const searchIndexFixture: SearchIndexEntry[] = [
  {
    id: `${contentVersion}-shuttle-intro`, schemaVersion: 1, contentVersion, pageId: "page-campus-shuttle", pageTitle: "校园环游车乘坐指南",
    sectionPath: ["校园生活", "校园交通"], anchor: "b-shuttle-intro", plainText: "校园环游车连接前湖北院、南院与主要教学区域，适合校内较长距离通行。",
    blockType: "paragraph", updatedAt: publishedAt,
  },
  {
    id: `${contentVersion}-fare`, schemaVersion: 1, contentVersion, pageId: "page-campus-shuttle", pageTitle: "校园环游车乘坐指南",
    sectionPath: ["校园生活", "校园交通", "路线与收费"], anchor: "b-fare", plainText: "单次收费 0.9 元，可使用支付宝洪城一卡通或扫描车载二维码付款。",
    blockType: "paragraph", updatedAt: publishedAt,
  },
];

export const publishedFixture: PublishedFixture = {
  pages: pagesFixture,
  blocksByPageId: {
    "section-onboarding": onboardingBlocks,
    "section-campus-life": sectionBlocks,
    "section-academics": academicBlocks,
    "section-services": serviceBlocks,
    "page-campus-transport": transportBlocks,
    "page-campus-shuttle": shuttleBlocks,
    "page-rich-content": richBlocks,
  },
  assets: [
    { id: "asset-campus-map", sourceBlockId: "rich-image", contentVersion, kind: "image", publicUrl: "/fixtures/campus-map.svg", checksum: "fixture-map", alt: "校园交通路线示意图" },
    { id: "asset-guide-pdf", sourceBlockId: "rich-file", contentVersion, kind: "file", publicUrl: "/fixtures/campus-life-guide.pdf", checksum: "fixture-guide" },
  ],
  searchIndex: searchIndexFixture,
};
