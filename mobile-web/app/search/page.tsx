import Link from "next/link";
import { ArrowLeft, FileSearch, ShieldCheck } from "lucide-react";
import { CardPreview } from "@/app/components/CardPreview";
import { SearchForm } from "@/app/components/SearchForm";
import { TrustBadge } from "@/app/components/TrustBadge";
import { getPublishedCards } from "@/lib/content/repository";
import { composeSearchAnswer } from "@/lib/search/answer";
import { searchCards } from "@/lib/search/search-cards";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const cards = await getPublishedCards();
  const results = query ? searchCards(query, cards) : [];
  const answer = query ? composeSearchAnswer(query, results) : null;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[rgba(248,245,238,0.92)] px-5 py-3 backdrop-blur">
        <div className="mb-3 flex items-center gap-3">
          <Link className="focus-ring tap-target grid w-10 place-items-center rounded-full bg-white" href="/" aria-label="返回首页">
            <ArrowLeft size={18} strokeWidth={2} />
          </Link>
          <div>
            <strong className="block text-[18px] leading-6">搜索</strong>
            <span className="sans text-[12px] text-[color:var(--muted)]">先找卡片，再生成答案</span>
          </div>
        </div>
        <SearchForm defaultValue={query} compact />
      </header>

      <main className="px-5 pb-12 pt-5">
        {!query ? (
          <section className="rounded-[8px] border border-[color:var(--line)] bg-white p-5">
            <FileSearch className="mb-4 text-[color:var(--green)]" size={26} strokeWidth={1.8} />
            <h1 className="text-[24px] leading-8">搜一个校园问题</h1>
            <p className="sans mt-2 text-[14px] leading-6 text-[color:var(--muted)]">比如校园卡、校园网、宿舍报修、常用电话。</p>
          </section>
        ) : null}

        {answer ? (
          <section className="rounded-[8px] border border-[color:var(--ink)] bg-white p-5 shadow-[0_10px_0_rgba(23,25,21,0.08)]">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-[color:var(--green)]" strokeWidth={1.9} />
              <span className="sans text-[13px] font-semibold text-[color:var(--green)]">
                {answer.state === "answered" ? "已找到可引用信息" : "需要补充信息"}
              </span>
            </div>
            <h1 className="text-[25px] leading-8">{answer.conclusion}</h1>

            {answer.steps.length > 0 ? (
              <ol className="sans mt-5 space-y-3 text-[15px] leading-6">
                {answer.steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--green-soft)] text-[13px] font-bold text-[color:var(--green)]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {answer.notes.length > 0 ? (
              <div className="sans mt-5 space-y-2 text-[13px] leading-6 text-[color:var(--muted)]">
                {answer.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            ) : null}

            {answer.sources.length > 0 ? (
              <div className="mt-5 border-t border-[color:var(--line)] pt-4">
                <h2 className="mb-3 text-[18px] leading-6">信息来源</h2>
                <div className="space-y-2">
                  {answer.sources.map((source) => (
                    <Link
                      key={source.slug}
                      href={`/cards/${source.slug}`}
                      className="focus-ring flex items-center justify-between gap-3 rounded-[8px] bg-[color:var(--surface-soft)] p-3"
                    >
                      <span className="sans text-[14px] font-semibold">{source.title}</span>
                      <TrustBadge status={source.trustStatus as never} />
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {query ? (
          <section className="mt-6">
            <h2 className="mb-3 text-[22px] leading-7">相关卡片</h2>
            <div className="space-y-3">
              {results.map((result) => (
                <CardPreview key={result.card.slug} card={result.card} reason={result.reasons[0]} />
              ))}
              {results.length === 0 ? (
                <div className="rounded-[8px] border border-[color:var(--line)] bg-white p-5">
                  <p className="sans text-[14px] leading-6 text-[color:var(--muted)]">没有匹配卡片。这个问题可以进入反馈队列。</p>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
