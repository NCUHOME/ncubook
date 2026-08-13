// 首页路由：提问优先架构下的学生端首页 RSC (直接加载已发布知识库仓储，结合 AppHeader、QuestionForm 与校园板块导航)
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { loadPublishedRepository } from "@/lib/content/server";
import { QuestionForm } from "@/src/components/ask/form";
import { AppHeader } from "@/src/components/primitives/header";

export default async function HomePage() {
  const repository = await loadPublishedRepository();
  const sections = repository.getPublishedSections();
  const resolveRoute = repository.resolvePageRoute;

  return (
    <>
      <AppHeader />
      <main className="px-s5 pb-s7 pt-s7">
        <section>
          <p className="text-caption leading-ui tracking-widest text-muted">南昌大学 · 校园知识</p>
          <h1 className="mt-s4 font-display text-display leading-heading font-semibold">
            校园里的事，<br />在此问明白。
          </h1>
          <p className="mt-s4 max-w-prose font-body text-body leading-body text-muted">
            查规则、找地点、了解经验。答案保留出处，也保留原文的完整表达。
          </p>
          <div className="mt-s7">
            <QuestionForm />
          </div>
        </section>
        <section className="mt-s7" aria-labelledby="home-sections-title">
          <div className="flex items-center justify-between border-b border-line pb-s3">
            <h2 id="home-sections-title" className="text-title leading-heading font-semibold">
              浏览校园内容
            </h2>
            <span className="text-caption text-muted">查看目录</span>
          </div>
          <div className="grid grid-cols-2">
            {sections.slice(0, 6).map((section) => (
              <Link
                key={section.id}
                href={resolveRoute(section.id)}
                className="focus-ring flex min-h-tap items-center justify-between border-b border-line py-s3 text-label odd:pr-s3 even:pl-s3"
              >
                <span>{section.title}</span>
                <ChevronRight className="size-icon-small text-muted" strokeWidth={1.9} />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
