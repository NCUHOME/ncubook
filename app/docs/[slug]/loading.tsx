// 页面路由：校园知识文档阅读页专属 Streaming 骨架屏组件 (/docs/[slug]/loading.tsx)
import { Skeleton } from "@/src/components/primitives/skeleton";

export default function DocumentLoading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[760px] px-s5 py-s6">
      {/* 顶部 Header 骨架 */}
      <div className="flex h-[44px] items-center justify-between border-b border-line pb-s3">
        <Skeleton className="h-s4 w-[60px]" />
        <Skeleton className="h-s4 w-[120px]" />
        <Skeleton className="h-s5 w-s5" />
      </div>

      {/* 文章标题与元数据骨架 */}
      <div className="mt-s6 border-b border-line pb-s5">
        <Skeleton className="h-s3 w-[80px]" />
        <Skeleton className="mt-s3 h-s7 w-[240px]" />
        <Skeleton className="mt-s3 h-s3 w-[120px]" />
      </div>

      {/* 文章正文 Block 段落骨架 */}
      <div className="mt-s6 space-y-s5">
        <Skeleton className="h-s4 w-full" />
        <Skeleton className="h-s4 w-[90%]" />
        <Skeleton className="h-s4 w-[95%]" />
        <Skeleton className="my-s6 h-[120px]" />
        <Skeleton className="h-s4 w-full" />
        <Skeleton className="h-s4 w-[85%]" />
      </div>
    </div>
  );
}
