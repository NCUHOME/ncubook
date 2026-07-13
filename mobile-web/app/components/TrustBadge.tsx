import type { InformationCard } from "@/lib/content/schema";

export function TrustBadge({ status }: { status: InformationCard["trustStatus"] }) {
  const className =
    status === "官方来源"
      ? "bg-[color:var(--green-soft)] text-[color:var(--green)]"
      : status === "同学经验已核实"
        ? "bg-[color:var(--blue-soft)] text-[color:var(--blue)]"
        : "bg-[color:var(--amber-soft)] text-[color:var(--amber)]";

  return (
    <span className={`sans inline-flex h-7 items-center rounded-full px-3 text-[12px] font-semibold ${className}`}>
      {status}
    </span>
  );
}
