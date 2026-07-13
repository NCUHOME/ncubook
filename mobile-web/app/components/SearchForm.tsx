import { Search, SendHorizontal } from "lucide-react";

export function SearchForm({
  defaultValue = "",
  compact = false,
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <form action="/search" className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex min-h-[54px] items-center gap-2 rounded-[8px] border border-[color:var(--ink)] bg-white px-3 shadow-[0_10px_0_rgba(23,25,21,0.08)]">
        <Search className="shrink-0 text-[color:var(--green)]" size={19} strokeWidth={2} />
        <input
          name="q"
          defaultValue={defaultValue}
          className="sans min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[color:var(--muted)]"
          placeholder="搜索攻略，或问小家园"
          autoComplete="off"
        />
        <button
          type="submit"
          className="focus-ring tap-target grid w-10 place-items-center rounded-full bg-[color:var(--green)] text-white"
          aria-label="发送"
        >
          <SendHorizontal size={17} strokeWidth={2.1} />
        </button>
      </div>
    </form>
  );
}
