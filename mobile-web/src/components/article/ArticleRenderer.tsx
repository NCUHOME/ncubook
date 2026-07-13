import type { Asset, Block } from "@/lib/content/published-schema";
import { CalloutBlock } from "@/src/components/article/CalloutBlock";
import { ColumnsBlock } from "@/src/components/article/ColumnsBlock";
import { EmbedBlock } from "@/src/components/article/EmbedBlock";
import { FileBlock } from "@/src/components/article/FileBlock";
import { ImageBlock } from "@/src/components/article/ImageBlock";
import { ListBlock } from "@/src/components/article/ListBlock";
import { PageLinkBlock } from "@/src/components/article/PageLinkBlock";
import { RichText } from "@/src/components/article/RichText";
import { TableBlock } from "@/src/components/article/TableBlock";

export type ArticleRendererProps = {
  blocks: Block[];
  getAsset: (assetId: string) => Asset | null;
  resolvePageRoute: (pageId: string) => string;
};

export function ArticleRenderer({ blocks, getAsset, resolvePageRoute }: ArticleRendererProps) {
  return <div className="space-y-s5">{blocks.map((block) => {
    switch (block.type) {
      case "paragraph": return <p id={block.anchor} key={block.id} className="font-body text-body leading-body"><RichText value={block.richText} resolvePageRoute={resolvePageRoute} /></p>;
      case "quote": return <blockquote id={block.anchor} key={block.id} className="border-l border-ink pl-s4 font-body text-body leading-body text-muted"><RichText value={block.richText} resolvePageRoute={resolvePageRoute} /></blockquote>;
      case "heading": return <HeadingBlock key={block.id} block={block} resolvePageRoute={resolvePageRoute} />;
      case "bulleted-list":
      case "numbered-list": return <ListBlock key={block.id} block={block} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />;
      case "callout": return <CalloutBlock key={block.id} block={block} resolvePageRoute={resolvePageRoute} />;
      case "table": return <TableBlock key={block.id} block={block} resolvePageRoute={resolvePageRoute} />;
      case "columns": return <ColumnsBlock key={block.id} block={block} getAsset={getAsset} resolvePageRoute={resolvePageRoute} />;
      case "image": return <ImageBlock key={block.id} block={block} asset={getAsset(block.assetId)} resolvePageRoute={resolvePageRoute} />;
      case "file": return <FileBlock key={block.id} block={block} asset={getAsset(block.assetId)} />;
      case "embed": return <EmbedBlock key={block.id} block={block} />;
      case "page-link": return <PageLinkBlock key={block.id} block={block} href={resolvePageRoute(block.pageId)} resolvePageRoute={resolvePageRoute} />;
      default: return assertNever(block);
    }
  })}</div>;
}

function HeadingBlock({ block, resolvePageRoute }: { block: Extract<Block, { type: "heading" }>; resolvePageRoute: (pageId: string) => string }) {
  if (block.level === 1) return <h1 id={block.anchor} className="font-display text-heading leading-heading font-semibold"><RichText value={block.richText} resolvePageRoute={resolvePageRoute} /></h1>;
  if (block.level === 2) return <h2 id={block.anchor} className="text-title leading-heading font-semibold"><RichText value={block.richText} resolvePageRoute={resolvePageRoute} /></h2>;
  return <h3 id={block.anchor} className="text-body-large leading-heading font-semibold"><RichText value={block.richText} resolvePageRoute={resolvePageRoute} /></h3>;
}

function assertNever(block: never): never {
  throw new Error(`Unsupported block: ${JSON.stringify(block)}`);
}
