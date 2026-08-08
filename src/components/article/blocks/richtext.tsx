// 组件：Notion 富文本内联片段渲染器，将加粗、斜体、代码行与站内/站外链接映射为 HTML 行内元素
import type { RichText as RichTextValue } from "@/lib/content/published-schema";

export function RichText({ value, resolvePageRoute }: { value: RichTextValue; resolvePageRoute: (pageId: string) => string }) {
  return (
    <>
      {value.map((segment, index) => {
        let node: React.ReactNode = segment.plainText;
        if (segment.annotations.bold) node = <strong key={index}>{node}</strong>;
        if (segment.annotations.italic) node = <em key={index}>{node}</em>;
        if (segment.annotations.code) node = <code key={index} className="rounded-small border border-line bg-surface-subtle px-1 py-0.5 font-mono text-caption text-ink">{node}</code>;
        if (segment.href || segment.pageId) {
          const href = segment.pageId ? resolvePageRoute(segment.pageId) : segment.href ?? "#";
          node = <a key={index} href={href} className="focus-ring underline underline-offset-4">{node}</a>;
        }
        return <span key={index}>{node}</span>;
      })}
    </>
  );
}
