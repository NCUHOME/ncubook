// 组件：胶囊复合搜索栏 (CompositeSearch)，分区响应：左搜词条、右问小家园
"use client";

import { Search } from "lucide-react";
import { HollamaMascot } from "@/src/components/primitives/hollama-mascot";
import { useAsk } from "@/src/components/ask/provider";
import { useSearch } from "@/src/components/search/search-provider";

export function CompositeSearch() {
  const { openSearch } = useSearch();
  const { openAsk } = useAsk();

  return (
    <div className="w-full">
      <div className="flex min-h-tap items-center rounded-medium border border-line-mid bg-surface transition-all hover:border-brand">
        {/* 左侧：点击进入关键词全屏搜索 */}
        <button
          type="button"
          onClick={() => openSearch()}
          className="focus-ring flex h-11 flex-1 items-center gap-s3 px-s4 text-left text-muted transition-opacity hover:text-ink active:opacity-70"
          aria-label="搜索手册词条"
        >
          <Search className="size-icon-small shrink-0 text-muted" />
          <span className="truncate text-body text-muted">搜索手册，或直接提问</span>
        </button>

        {/* 分割线与右侧：向小家园知识库直接提问 */}
        <button
          type="button"
          onClick={() => openAsk({})}
          className="focus-ring flex h-8 items-center border-l border-line px-s3 transition-transform active:scale-90"
          aria-label="向此间知识库直接提问"
          title="向此间知识库直接提问"
        >
          <HollamaMascot size={22} />
        </button>
      </div>
    </div>
  );
}
