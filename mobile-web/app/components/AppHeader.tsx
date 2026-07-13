import Link from "next/link";
import { Search } from "lucide-react";

export function AppHeader({ title = "此间", subtitle = "南昌大学生存手册" }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[rgba(248,245,238,0.88)] px-5 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="focus-ring block rounded-md">
          <strong className="block text-[20px] leading-6">{title}</strong>
          <span className="sans text-[12px] text-[color:var(--muted)]">{subtitle}</span>
        </Link>
        <Link
          href="/search"
          className="focus-ring tap-target grid w-11 place-items-center rounded-full border border-[color:var(--line)] bg-white"
          aria-label="搜索"
        >
          <Search size={18} strokeWidth={1.9} />
        </Link>
      </div>
    </header>
  );
}
