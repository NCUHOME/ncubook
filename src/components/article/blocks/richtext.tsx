// 组件：Notion 富文本内联片段渲染器，将加粗、斜体、代码行、链接与电话号码映射为相应交互元素
import type { RichText as RichTextValue } from "@/lib/content/schema";
import { PhoneTag } from "@/src/components/article/phone-tag";

const PHONE_REGEX = /(?:0\d{2,3}-)?\d{7,8}|1[3-9]\d{9}/g;

export function RichText({ value, resolvePageRoute }: { value: RichTextValue; resolvePageRoute: (pageId: string) => string }) {
  return (
    <>
      {value.map((segment, index) => {
        let node: React.ReactNode = segment.plainText;

        // 若不是超链接且文本中包含电话号码，则将电话号码包装为可拨号标签
        if (!segment.href && !segment.pageId && PHONE_REGEX.test(segment.plainText)) {
          const parts: React.ReactNode[] = [];
          let lastIndex = 0;
          const matches = Array.from(segment.plainText.matchAll(PHONE_REGEX));

          matches.forEach((match, mIdx) => {
            const start = match.index ?? 0;
            const phone = match[0];
            if (start > lastIndex) {
              parts.push(segment.plainText.slice(lastIndex, start));
            }
            parts.push(<PhoneTag key={`phone-${mIdx}`} phone={phone} />);
            lastIndex = start + phone.length;
          });

          if (lastIndex < segment.plainText.length) {
            parts.push(segment.plainText.slice(lastIndex));
          }
          node = parts;
        }

        if (segment.annotations.bold) node = <strong key={index}>{node}</strong>;
        if (segment.annotations.italic) node = <em key={index}>{node}</em>;
        if (segment.annotations.code) {
          node = (
            <code key={index} className="rounded-small border border-line bg-surface-subtle px-1 py-0.5 font-mono text-caption text-ink">
              {node}
            </code>
          );
        }
        if (segment.href || segment.pageId) {
          const href = segment.pageId ? resolvePageRoute(segment.pageId) : segment.href ?? "#";
          node = (
            <a key={index} href={href} className="focus-ring underline underline-offset-4 text-brand hover:underline">
              {node}
            </a>
          );
        }
        return <span key={index}>{node}</span>;
      })}
    </>
  );
}
