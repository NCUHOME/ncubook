// 组件：Notion 富文本内联片段渲染器，将加粗、斜体、代码行、链接、URL、邮箱与电话号码映射为相应交互元素
import type { RichText as RichTextValue } from "@/lib/content/schema";
import { PhoneTag } from "@/src/components/article/phone-tag";

const PHONE_REGEX = /(?:0\d{2,3}-)?\d{7,8}|1[3-9]\d{9}/g;
const URL_REGEX = /https?:\/\/[^\s<>"'()（）\u4e00-\u9fa5]+/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+(?:@|\[AT\])[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function RichText({
  value,
  resolvePageRoute,
}: {
  value: RichTextValue;
  resolvePageRoute: (pageId: string) => string;
}) {
  return (
    <>
      {value.map((segment, index) => {
        let node: React.ReactNode = segment.plainText;

        // 若不是超链接，则自动扫描识别文本中的 URL、邮箱及电话号码
        if (!segment.href && !segment.pageId && typeof segment.plainText === "string") {
          const text = segment.plainText;
          // 合并提取所有可交互模式
          const matches: Array<{
            type: "url" | "email" | "phone" | "internal";
            start: number;
            end: number;
            text: number | string;
            url?: string;
          }> = [];

          // 1. 匹配 URL
          for (const m of text.matchAll(URL_REGEX)) {
            if (typeof m.index === "number") {
              let matchedStr = m[0];
              while (/[.,;:!?。，、）)]$/.test(matchedStr)) {
                matchedStr = matchedStr.slice(0, -1);
              }
              if (matchedStr) {
                matches.push({
                  type: "url",
                  start: m.index,
                  end: m.index + matchedStr.length,
                  text: matchedStr,
                  url: matchedStr,
                });
              }
            }
          }

          // 2. 匹配邮箱（包括 [AT] 防垃圾邮件格式）
          for (const m of text.matchAll(EMAIL_REGEX)) {
            if (typeof m.index === "number") {
              const actualEmail = m[0].replace("[AT]", "@");
              matches.push({
                type: "email",
                start: m.index,
                end: m.index + m[0].length,
                text: m[0],
                url: `mailto:${actualEmail}`,
              });
            }
          }

          // 3. 匹配电话号码
          for (const m of text.matchAll(PHONE_REGEX)) {
            if (typeof m.index === "number") {
              matches.push({
                type: "phone",
                start: m.index,
                end: m.index + m[0].length,
                text: m[0],
              });
            }
          }

          // 4. 识别特定高频内联关键词（如“查看完整贡献者名单”、“贡献者名单”）
          const keywordMatches = [
            { kw: "查看完整贡献者名单", href: "/docs/gongxianzhe" },
            { kw: "完整贡献者名单", href: "/docs/gongxianzhe" },
          ];
          for (const item of keywordMatches) {
            let searchIdx = text.indexOf(item.kw);
            while (searchIdx !== -1) {
              matches.push({
                type: "internal",
                start: searchIdx,
                end: searchIdx + item.kw.length,
                text: item.kw,
                url: item.href,
              });
              searchIdx = text.indexOf(item.kw, searchIdx + item.kw.length);
            }
          }

          if (matches.length > 0) {
            // 按起始位置升序排序，过滤重叠区间
            matches.sort((a, b) => a.start - b.start);
            const filteredMatches: typeof matches = [];
            let lastPos = 0;
            for (const m of matches) {
              if (m.start >= lastPos) {
                filteredMatches.push(m);
                lastPos = m.end;
              }
            }

            const parts: React.ReactNode[] = [];
            let cursor = 0;
            filteredMatches.forEach((match, mIdx) => {
              if (match.start > cursor) {
                parts.push(text.slice(cursor, match.start));
              }

              if (match.type === "phone") {
                parts.push(<PhoneTag key={`phone-${mIdx}`} phone={String(match.text)} />);
              } else if (match.type === "url" || match.type === "email" || match.type === "internal") {
                const isExt = match.type === "url" || match.type === "email";
                parts.push(
                  <a
                    key={`link-${mIdx}`}
                    href={match.url}
                    target={isExt ? "_blank" : undefined}
                    rel={isExt ? "noopener noreferrer" : undefined}
                    className="focus-ring underline underline-offset-4 text-brand font-medium hover:underline transition-colors"
                    style={{ color: "var(--brand-blue)" }}
                  >
                    {match.text}
                  </a>,
                );
              }
              cursor = match.end;
            });

            if (cursor < text.length) {
              parts.push(text.slice(cursor));
            }
            node = parts;
          }
        }

        if (segment.annotations.bold) node = <strong key={index}>{node}</strong>;
        if (segment.annotations.italic) node = <em key={index}>{node}</em>;
        if (segment.annotations.code) {
          node = (
            <code
              key={index}
              className="rounded-small border border-line bg-surface-subtle px-s1 py-s1 font-mono text-caption text-ink"
            >
              {node}
            </code>
          );
        }
        if (segment.href || segment.pageId) {
          const href = segment.pageId ? resolvePageRoute(segment.pageId) : segment.href ?? "#";
          const isExternal = href.startsWith("http") || href.startsWith("mailto:");
          node = (
            <a
              key={index}
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="focus-ring underline underline-offset-4 text-brand font-medium hover:underline transition-colors"
              style={{ color: "var(--brand-blue)" }}
            >
              {node}
            </a>
          );
        }
        return <span key={index}>{node}</span>;
      })}
    </>
  );
}
