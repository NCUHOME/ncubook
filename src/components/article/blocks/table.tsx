// 组件：Notion 数据表格渲染器，支持表头行 (<th>)、表格行锚点 (anchorFromSourceId) 与单元格内联富文本
import { anchorFromSourceId } from "@/lib/content/schema";
import type { Block } from "@/lib/content/schema";
import { RichText } from "@/src/components/article/blocks/richtext";

export function TableBlock({
  block,
  resolvePageRoute,
}: {
  block: Extract<Block, { type: "table" }>;
  resolvePageRoute: (pageId: string) => string;
}) {
  return (
    <div id={block.anchor} className="overflow-x-auto rounded-small border border-line my-s4 shadow-subtle bg-surface">
      <table className="w-full min-w-max border-collapse font-body text-label leading-body">
        <tbody>
          {block.rows.map((row, rowIndex) => {
            const isHeader = block.hasHeaderRow && rowIndex === 0;
            return (
              <tr
                id={anchorFromSourceId(row.id)}
                key={row.id}
                className={`border-b border-line last:border-b-0 ${isHeader ? "bg-surface-subtle font-semibold text-ink" : "text-ink-body"}`}
              >
                {row.cells.map((cell, cellIndex) => {
                  const Cell = isHeader ? "th" : "td";
                  return (
                    <Cell
                      key={`${row.id}-${cellIndex}`}
                      className={`px-s4 py-s3 text-left align-top ${isHeader ? "font-semibold text-ink" : "font-normal"}`}
                    >
                      <RichText value={cell} resolvePageRoute={resolvePageRoute} />
                    </Cell>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
