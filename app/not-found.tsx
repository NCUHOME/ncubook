// 页面路由：全站 404 未找到页面兜底组件，符合移动端优先排版与设计令牌契约
import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col items-center justify-center bg-canvas px-s5 py-s7 text-center">
      <div className="flex h-[64px] w-[64px] items-center justify-center rounded-round bg-surface-subtle text-muted">
        <FileQuestion className="h-s6 w-s6" />
      </div>
      <h1 className="mt-s5 font-display text-heading leading-heading font-semibold text-text">
        页面未找到
      </h1>
      <p className="mt-s3 max-w-[320px] font-body text-body leading-body text-muted">
        您访问的页面可能已被迁移、重命名，或暂时不可用。
      </p>
      <Link
        href="/"
        className="tap-target mt-s6 inline-flex items-center justify-center gap-s2 rounded-round bg-action px-s6 text-label font-medium text-canvas focus-ring active:opacity-90"
      >
        <ArrowLeft className="h-s4 w-s4" />
        返回首页提问
      </Link>
    </main>
  );
}
