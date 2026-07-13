import Link from "next/link";
import { AlertCircle, ChevronRight, MessageSquareText, PencilLine } from "lucide-react";
import { AppHeader } from "@/app/components/AppHeader";
import { CardPreview } from "@/app/components/CardPreview";
import { SearchForm } from "@/app/components/SearchForm";
import { getRecentCards } from "@/lib/content/repository";
import { topics } from "@/lib/content/topics";

const quickQuestions = ["校园卡丢了怎么办", "校园网连不上", "宿舍怎么报修", "常用电话在哪里"];

export default async function HomePage() {
  const recentCards = await getRecentCards(3);

  return (
    <>
      <AppHeader />
      <main className="px-5 pb-12 pt-5">
        <section className="border-b border-[color:var(--line)] pb-6">
          <p className="sans mb-2 text-[13px] font-semibold text-[color:var(--green)]">独立 Web · 手机优先</p>
          <h1 className="max-w-[12em] text-[34px] leading-[1.12]">把校园问题变成能走下一步的答案</h1>
          <div className="mt-5">
            <SearchForm />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {quickQuestions.map((question) => (
              <Link
                key={question}
                href={`/search?q=${encodeURIComponent(question)}`}
                className="focus-ring sans tap-target flex items-center rounded-[8px] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 text-[13px] font-semibold"
              >
                {question}
              </Link>
            ))}
          </div>
        </section>

        <section className="py-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[22px] leading-7">高频入口</h2>
            <MessageSquareText className="text-[color:var(--blue)]" size={20} strokeWidth={1.8} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {topics.map((topic) => {
              const Icon = topic.icon;
              return (
                <Link
                  key={topic.slug}
                  href={`/topics/${topic.slug}`}
                  className="focus-ring min-h-[118px] rounded-[8px] border border-[color:var(--line)] bg-white p-4"
                >
                  <Icon className="mb-4 text-[color:var(--green)]" size={23} strokeWidth={1.8} />
                  <strong className="block text-[19px] leading-6">{topic.title}</strong>
                  <span className="sans mt-2 block text-[12px] leading-5 text-[color:var(--muted)]">{topic.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="py-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[22px] leading-7">最近更新</h2>
            <AlertCircle className="text-[color:var(--amber)]" size={20} strokeWidth={1.8} />
          </div>
          <div className="space-y-3">
            {recentCards.map((card) => (
              <CardPreview key={card.slug} card={card} />
            ))}
          </div>
        </section>

        <section className="mt-7 rounded-[8px] border border-[color:var(--ink)] bg-[color:var(--surface-soft)] p-4">
          <div className="flex gap-3">
            <PencilLine className="mt-1 shrink-0 text-[color:var(--green)]" size={21} strokeWidth={1.9} />
            <div>
              <h2 className="text-[20px] leading-6">发现信息过期？</h2>
              <p className="sans mt-2 text-[14px] leading-6 text-[color:var(--muted)]">提交修正，帮助后续同学少走弯路。</p>
              <Link
                href="/api/feedback"
                className="sans mt-4 inline-flex h-10 items-center gap-1 rounded-full bg-[color:var(--ink)] px-4 text-[13px] font-semibold text-white"
              >
                提交修正
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
