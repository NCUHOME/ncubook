// 组件：Notion 数据表格渲染器，支持表头行 (<th>)、表格行锚点 (anchorFromSourceId) 与单元格内联富文本
import { anchorFromSourceId } from "@/lib/content/published-repository";
import type { Block } from "@/lib/content/published-schema";
import { RichText } from "@/src/components/article/blocks/richtext";

export function TableBlock({ block, resolvePageRoute }: { block: Extract<Block, { type: "table" }>; resolvePageRoute: (pageId: string) => string }) {
  return (
    <div id={block.anchor} className="overflow-x-auto border-y border-line">
      <table className="w-full min-w-max border-collapse font-body text-label leading-body">
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr id={anchorFromSourceId(row.id)} key={row.id} className="border-b border-line last:border-b-0">
              {row.cells.map((cell, cellIndex) => {
                const Cell = block.hasHeaderRow && rowIndex === 0 ? "th" : "td";
                return (
                  <Cell key={`${row.id}-${cellIndex}`} className="px-s4 py-s3 text-left align-top font-regular">
                    <RichText value={cell} resolvePageRoute={resolvePageRoute} />
                  </Cell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
