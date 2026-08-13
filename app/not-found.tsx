// 页面路由：全站 404 未找到页面兜底组件，符合移动端优先排版与设计令牌契约
import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { StatusPage } from "@/src/components/primitives/status-page";

export default function NotFound() {
  return (
    <StatusPage
      icon={<FileQuestion className="h-s6 w-s6" />}
      iconClassName="text-muted"
      title="页面未找到"
      description="您访问的页面可能已被迁移、重命名，或暂时不可用。"
      actions={
        <Link
          href="/"
          className="tap-target inline-flex items-center justify-center gap-s2 rounded-round bg-action px-s6 text-label font-medium text-canvas focus-ring active:opacity-90"
        >
          <ArrowLeft className="h-s4 w-s4" />
          返回首页提问
        </Link>
      }
    />
  );
}
