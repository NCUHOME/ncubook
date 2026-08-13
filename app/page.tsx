// 首页路由：M1 骨架结构，符合编辑黑白视觉与 360-430px 屏幕排版
export default function HomePage() {
  return (
    <main className="px-s5 pb-s7 pt-s7">
      <section>
        <p className="text-caption leading-ui tracking-widest text-muted">南昌大学 · 校园知识</p>
        <h1 className="mt-s4 font-display text-display leading-heading font-semibold">
          校园里的事，<br />在此问明白。
        </h1>
        <p className="mt-s4 max-w-prose font-body text-body leading-body text-muted">
          查规则、找地点、了解经验。答案保留出处，也保留原文的完整表达。
        </p>
      </section>
    </main>
  );
}
