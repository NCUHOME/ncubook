import type { Asset, Block, RichText } from "@/lib/content/published-schema";
import { ArticleRenderer } from "@/src/components/article/ArticleRenderer";

const attachments = [
  "金榜题名之后 _ 大学生出路分化之谜 -- 郑雅君, author -- 复旦教育研究曦光丛书, 2023.pdf",
  "上海交通大学学生生存手册.pdf",
] as const;

const text = (plainText: string): RichText => [{ plainText, annotations: {} }];
const assets = new Map<string, Asset>(attachments.map((name, index) => {
  const id = `review-asset-${index}`;
  return [id, { id, sourceBlockId: `review-file-${index}`, contentVersion: "review", kind: "file", publicUrl: "#review-only", checksum: `review-${index}` }];
}));
const quoteBlocks: Block[] = [{
  id: "review-quote",
  anchor: "b-review-quote",
  type: "quote",
  richText: text("是什么曾经拯救过你，你最好就用它来更好地拯救这个世界。"),
  children: attachments.map((name, index) => ({
    id: `review-file-${index}`,
    anchor: `b-review-file-${index}`,
    type: "file" as const,
    assetId: `review-asset-${index}`,
    name,
  })),
}];

export default function GateDQuoteReviewPage() {
  return <main className="mx-auto min-h-screen w-full max-w-[390px] bg-canvas px-s5 py-s6">
    <p className="text-caption text-muted">Gate D · 390px 结构样张</p>
    <header className="border-b border-line pb-s5 pt-s6">
      <p className="font-body text-label text-muted">南昌大学 · 校园知识</p>
      <h1 className="mt-s3 font-display text-heading leading-heading font-semibold">写在前面</h1>
    </header>

    <article className="py-s6">
      <p className="font-body text-body leading-body">此间保留原文的表达和组织方式，附件也应留在作者原本放置它的位置。</p>
      <h2 className="mt-s6 text-title leading-heading font-semibold">延伸阅读</h2>

      <div>
        <ArticleRenderer blocks={quoteBlocks} getAsset={(assetId) => assets.get(assetId) ?? null} resolvePageRoute={() => "#review-only"} />
      </div>

      <p className="mt-s6 font-body text-body leading-body">附件之后，正文继续沿原有阅读顺序展开，不被拆成卡片或跳转到 Notion。</p>
    </article>
  </main>;
}
