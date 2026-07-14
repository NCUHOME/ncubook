import { Search, X } from "lucide-react";
import Link from "next/link";

export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" method="get">
      <label htmlFor="keyword-search" className="sr-only">关键词</label>
      <div className="flex min-h-tap items-center gap-s3 border-b border-ink">
        <Search className="size-icon text-muted" strokeWidth={1.9} />
        <input id="keyword-search" name="q" defaultValue={defaultValue} className="min-w-0 flex-1 bg-transparent font-body text-body outline-none placeholder:text-muted" placeholder="搜索文档和段落" autoComplete="off" />
        {defaultValue ? <Link href="/search" className="focus-ring tap-target grid place-items-center rounded-round" aria-label="清除关键词"><X className="size-icon-small" /></Link> : null}
      </div>
    </form>
  );
}
