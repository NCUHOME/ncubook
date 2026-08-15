// 页面路由：关键词搜索结果页专属 Streaming 骨架屏组件 (/search/loading.tsx)
import { Skeleton } from "@/src/components/primitives/skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-shell px-s5 py-s6">
      {/* 搜索 Header 框骨架 */}
      <div className="flex h-tap items-center gap-s3 border-b border-line pb-s3">
        <Skeleton className="h-s4 w-s4" />
        <Skeleton className="h-s6 flex-1" />
      </div>

      {/* 搜索结果条目骨架列表 */}
      <div className="mt-s6 space-y-s4">
        <Skeleton className="h-s3 w-28" />
        <div className="rounded-round border border-line p-s4">
          <Skeleton className="h-s3 w-20" />
          <Skeleton className="mt-s2 h-s5 w-44" />
          <Skeleton className="mt-s3 h-s4 w-full" />
        </div>
        <div className="rounded-round border border-line p-s4">
          <Skeleton className="h-s3 w-20" />
          <Skeleton className="mt-s2 h-s5 w-40" />
          <Skeleton className="mt-s3 h-s4 w-11/12" />
        </div>
      </div>
    </div>
  );
}
