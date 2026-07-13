import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CardPreview } from "@/app/components/CardPreview";
import { getCardsByTags } from "@/lib/content/repository";
import { getTopic } from "@/lib/content/topics";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();
  const cards = await getCardsByTags(topic.tags);
  const Icon = topic.icon;

  return (
    <>
      <header className="border-b border-[color:var(--line)] px-5 py-3">
        <Link className="focus-ring tap-target inline-flex items-center gap-2 rounded-full bg-white px-3" href="/" aria-label="返回首页">
          <ArrowLeft size={17} strokeWidth={2} />
          <span className="sans text-[13px] font-semibold">返回</span>
        </Link>
      </header>
      <main className="px-5 pb-12 pt-5">
        <section className="border-b border-[color:var(--line)] pb-5">
          <Icon className="mb-4 text-[color:var(--green)]" size={30} strokeWidth={1.8} />
          <h1 className="text-[34px] leading-[1.12]">{topic.title}</h1>
          <p className="sans mt-3 text-[15px] leading-6 text-[color:var(--muted)]">{topic.label}</p>
        </section>
        <section className="mt-5 space-y-3">
          {cards.map((card) => (
            <CardPreview key={card.slug} card={card} />
          ))}
          {cards.length === 0 ? (
            <div className="rounded-[8px] border border-[color:var(--line)] bg-white p-5">
              <p className="sans text-[14px] leading-6 text-[color:var(--muted)]">这个主题还没有发布卡片。</p>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
