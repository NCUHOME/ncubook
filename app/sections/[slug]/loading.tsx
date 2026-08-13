// 页面路由：校园内容板块导引页专属 Streaming 骨架屏组件 (/sections/[slug]/loading.tsx)
import { Skeleton } from "@/src/components/primitives/skeleton";

export default function SectionLoading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[760px] px-s5 py-s6">
      {/* 板块 Header 骨架 */}
      <div className="flex h-[44px] items-center justify-between border-b border-line pb-s3">
        <Skeleton className="h-s4 w-[60px]" />
        <Skeleton className="h-s4 w-[100px]" />
        <Skeleton className="h-s5 w-s5" />
      </div>

      {/* 板块标题与介绍段落骨架 */}
      <div className="mt-s6 border-b border-line pb-s5">
        <Skeleton className="h-s7 w-[180px]" />
        <Skeleton className="mt-s4 h-s4 w-full" />
        <Skeleton className="mt-s2 h-s4 w-[80%]" />
      </div>

      {/* 子文档导航树骨架 */}
      <div className="mt-s6 space-y-s3">
        <Skeleton className="h-s3 w-[100px]" />
        <Skeleton className="h-[64px] border border-line" />
        <Skeleton className="h-[64px] border border-line" />
        <Skeleton className="h-[64px] border border-line" />
      </div>
    </div>
  );
}
