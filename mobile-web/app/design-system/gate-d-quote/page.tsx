import { FileText } from "lucide-react";

const attachments = [
  "金榜题名之后 _ 大学生出路分化之谜 -- 郑雅君, author -- 复旦教育研究曦光丛书, 2023.pdf",
  "上海交通大学学生生存手册.pdf",
] as const;

export default function GateDQuoteReviewPage() {
  return <main className="mx-auto min-h-screen w-full max-w-[390px] bg-canvas px-s5 py-s6">
    <p className="text-caption text-muted">Gate D · 390px 结构样张</p>
    <header className="border-b border-line pb-s5 pt-s6">
      <p className="font-body text-label text-muted">南昌大学 · 校园知识</p>
      <h1 className="mt-s3 font-display text-heading leading-heading font-semibold">写在前面</h1>
    </header>

    <article className="py-s6">
      <p className="font-body text-body leading-body">此间保留原文的表达和组织方式，附件也应留在作者原本放置它的位置。</p>
      <h2 className="mt-s6 text-title leading-heading font-semibold">延伸阅读</h2>

      <blockquote className="mt-s5 border-l border-ink pl-s4 font-body text-body leading-body text-muted">
        <p>是什么曾经拯救过你，你最好就用它来更好地拯救这个世界。</p>
        <div className="mt-s3 space-y-s3 text-ink">
          {attachments.map((name) => <a key={name} className="focus-ring flex min-h-tap items-center gap-s3 border-y border-line py-s3 text-label underline underline-offset-4" href="#review-only">
            <FileText aria-hidden="true" className="size-icon shrink-0" strokeWidth={1.9} />
            <span>{name}</span>
          </a>)}
        </div>
      </blockquote>

      <p className="mt-s6 font-body text-body leading-body">附件之后，正文继续沿原有阅读顺序展开，不被拆成卡片或跳转到 Notion。</p>
    </article>
  </main>;
}
