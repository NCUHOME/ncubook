import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { InformationCard } from "@/lib/content/schema";
import { TrustBadge } from "@/app/components/TrustBadge";

export function CardPreview({ card, reason }: { card: InformationCard; reason?: string }) {
  return (
    <Link
      href={`/cards/${card.slug}`}
      className="focus-ring block rounded-[8px] border border-[color:var(--line)] bg-white p-4 shadow-[0_8px_18px_rgba(23,25,21,0.05)]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="sans text-[12px] font-semibold text-[color:var(--muted)]">{card.category}</span>
          <h3 className="mt-1 text-[18px] leading-6">{card.title}</h3>
        </div>
        <ChevronRight className="mt-4 shrink-0 text-[color:var(--muted)]" size={17} strokeWidth={1.8} />
      </div>
      <p className="sans line-clamp-2 text-[14px] leading-6 text-[color:var(--muted)]">{card.conclusion}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <TrustBadge status={card.trustStatus} />
        {reason ? <span className="sans text-[12px] text-[color:var(--muted)]">{reason}</span> : null}
      </div>
    </Link>
  );
}
