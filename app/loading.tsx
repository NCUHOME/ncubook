// 页面路由：全站通用 Streaming 骨架屏加载退回组件，符合设计令牌与 360-430px 屏幕视觉契约
import { Skeleton } from "@/src/components/primitives/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[760px] px-s5 py-s6">
      {/* 顶栏 Header 骨架 */}
      <div className="flex h-[44px] items-center justify-between border-b border-line pb-s3">
        <Skeleton className="h-s4 w-[80px]" />
        <Skeleton className="h-s5 w-s5" />
      </div>

      {/* 提问框骨架 */}
      <div className="mt-s6 rounded-round border border-line bg-surface-subtle p-s5">
        <Skeleton className="h-s5 w-[140px] bg-line" />
        <Skeleton className="mt-s4 h-s6 w-full bg-line" />
      </div>

      {/* 板块列表骨架 */}
      <div className="mt-s7 space-y-s4">
        <Skeleton className="h-s4 w-[100px]" />
        <div className="grid grid-cols-1 gap-s4 sm:grid-cols-2">
          <Skeleton className="h-[100px] border border-line" />
          <Skeleton className="h-[100px] border border-line" />
        </div>
      </div>
    </div>
  );
}
