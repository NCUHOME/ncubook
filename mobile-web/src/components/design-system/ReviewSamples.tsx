import { ArrowUp, Search } from "lucide-react";

const widths = [360, 390, 430] as const;

export function ReviewSamples() {
  return (
    <main className="bg-surface-subtle p-s5">
      <header className="mx-auto mb-s6 max-w-3xl">
        <p className="text-caption leading-ui text-muted">此间 · 设计系统审阅</p>
        <h1 className="font-display text-heading leading-heading font-semibold text-ink">编辑黑白基础组件</h1>
      </header>
      <div className="flex flex-wrap items-start justify-center gap-s5">
        {widths.map((width) => (
          <section
            key={width}
            data-review-width={String(width)}
            className="min-h-screen overflow-hidden border border-line bg-canvas"
            style={{ width }}
            aria-label={`${width} 像素审阅框`}
          >
            <div className="flex items-center justify-between border-b border-line p-s5">
              <strong className="text-title leading-ui">此间</strong>
              <button className="focus-ring tap-target grid place-items-center rounded-round border border-line" aria-label="搜索">
                <Search className="size-icon" strokeWidth={1.9} />
              </button>
            </div>
            <div className="p-s5">
              <p className="text-caption leading-ui tracking-widest text-muted">南昌大学 · 校园知识</p>
              <h2 className="mt-s5 font-display text-display leading-heading font-semibold">校园里的事，<br />在此问明白。</h2>
              <p className="mt-s4 font-body text-body leading-body text-muted">可靠的校园信息，从一个问题开始。每个回答都能回到具体文档与段落。</p>
              <div className="mt-s6 flex items-center border-y border-ink py-s2 pl-s1">
                <span className="font-body text-label text-muted">输入你想了解的问题</span>
                <button className="focus-ring tap-target ml-auto grid place-items-center rounded-round bg-action text-surface" aria-label="提交问题">
                  <ArrowUp className="size-icon" strokeWidth={1.9} />
                </button>
              </div>
              <div className="mt-s6 border-t border-line">
                {['入学报到', '校园生活', '学习考试'].map((label) => (
                  <div key={label} className="flex min-h-tap items-center border-b border-line text-label">{label}</div>
                ))}
              </div>
              <div className="mt-s6 border-l-2 border-ink bg-surface-subtle p-s4 font-body text-label leading-body">提示、加载、空状态与错误状态都使用同一套语义令牌。</div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
