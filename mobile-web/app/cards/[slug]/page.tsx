import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { TrustBadge } from "@/app/components/TrustBadge";
import { getCardBySlug } from "@/lib/content/repository";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card) notFound();

  return (
    <>
      <header className="border-b border-[color:var(--line)] px-5 py-3">
        <Link className="focus-ring tap-target inline-flex items-center gap-2 rounded-full bg-white px-3" href="/" aria-label="返回首页">
          <ArrowLeft size={17} strokeWidth={2} />
          <span className="sans text-[13px] font-semibold">返回</span>
        </Link>
      </header>
      <main className="px-5 pb-12 pt-5">
        <article>
          <div className="mb-4 flex flex-wrap gap-2">
            <TrustBadge status={card.trustStatus} />
            <span className="sans inline-flex h-7 items-center rounded-full bg-white px-3 text-[12px] font-semibold text-[color:var(--muted)]">
              {card.updatedAt}
            </span>
          </div>
          <p className="sans mb-2 text-[13px] font-semibold text-[color:var(--green)]">{card.category}</p>
          <h1 className="text-[34px] leading-[1.12]">{card.title}</h1>
          <p className="sans mt-5 text-[17px] leading-8">{card.conclusion}</p>

          <section className="mt-7 rounded-[8px] border border-[color:var(--line)] bg-white p-4">
            <h2 className="text-[21px] leading-7">适用对象</h2>
            <p className="sans mt-2 text-[14px] leading-6 text-[color:var(--muted)]">{card.audience}</p>
          </section>

          {card.steps.length > 0 ? (
            <section className="mt-5">
              <h2 className="mb-3 text-[21px] leading-7">办理步骤</h2>
              <ol className="space-y-3">
                {card.steps.map((step, index) => (
                  <li key={step} className="sans flex gap-3 rounded-[8px] border border-[color:var(--line)] bg-white p-4 text-[15px] leading-6">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--green-soft)] text-[13px] font-bold text-[color:var(--green)]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {card.notes.length > 0 ? (
            <section className="mt-5 rounded-[8px] border border-[color:var(--line)] bg-[color:var(--amber-soft)] p-4">
              <h2 className="text-[21px] leading-7 text-[color:var(--amber)]">注意事项</h2>
              <div className="sans mt-3 space-y-2 text-[14px] leading-6 text-[color:var(--ink)]">
                {card.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-5 rounded-[8px] border border-[color:var(--line)] bg-white p-4">
            <h2 className="text-[21px] leading-7">来源</h2>
            <p className="sans mt-2 text-[14px] leading-6 text-[color:var(--muted)]">{card.sourceType}</p>
            {card.sourceUrl ? (
              <a
                href={card.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="sans mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-[color:var(--ink)] px-4 text-[13px] font-semibold text-white"
              >
                打开来源
                <ExternalLink size={14} />
              </a>
            ) : null}
          </section>
        </article>
      </main>
    </>
  );
}
