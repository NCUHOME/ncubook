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
  if (block.presentation === "registration-timeline") {
    return (
      <div id={block.anchor} className="prototype-registration-timeline">
        {block.rows.map((row) => (
          <div id={anchorFromSourceId(row.id)} key={row.id} className="prototype-registration-row">
            <span className="prototype-registration-time">
              <RichText value={row.cells[0] ?? []} resolvePageRoute={resolvePageRoute} />
            </span>
            <span className="min-w-0 flex-1 text-small leading-compact text-ink">
              <RichText value={row.cells[1] ?? []} resolvePageRoute={resolvePageRoute} />
              {row.cells[2]?.some((part) => part.plainText) ? (
                <span className="text-muted"> · <RichText value={row.cells[2]} resolvePageRoute={resolvePageRoute} /></span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const isSalesScriptTable = block.presentation === "sales-script-table";

  return (
    <div id={block.anchor} className="overflow-x-auto rounded-small border border-line bg-surface">
      <table className="w-full table-fixed border-collapse font-body leading-body">
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
                      className={`border-r border-line px-control text-left align-top last:border-r-0 ${isHeader ? "py-s2 text-feedback font-semibold text-ink" : `py-table-row text-feedback font-normal leading-compact ${isSalesScriptTable && cellIndex === 1 ? "text-ink-sub" : ""}`}`}
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
