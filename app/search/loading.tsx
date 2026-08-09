// 页面路由：关键词搜索结果页专属 Streaming 骨架屏组件 (/search/loading.tsx)
export default function SearchLoading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[760px] animate-pulse bg-canvas px-s5 py-s6">
      {/* 搜索 Header 框骨架 */}
      <div className="flex h-[44px] items-center gap-s3 border-b border-line pb-s3">
        <div className="h-s4 w-s4 rounded-round bg-surface-subtle" />
        <div className="h-s6 flex-1 rounded-round bg-surface-subtle" />
      </div>

      {/* 搜索结果条目骨架列表 */}
      <div className="mt-s6 space-y-s4">
        <div className="h-s3 w-[120px] rounded-round bg-surface-subtle" />
        <div className="rounded-round border border-line p-s4">
          <div className="h-s3 w-[80px] rounded-round bg-surface-subtle" />
          <div className="mt-s2 h-s5 w-[180px] rounded-round bg-surface-subtle" />
          <div className="mt-s3 h-s4 w-full rounded-round bg-surface-subtle" />
        </div>
        <div className="rounded-round border border-line p-s4">
          <div className="h-s3 w-[80px] rounded-round bg-surface-subtle" />
          <div className="mt-s2 h-s5 w-[160px] rounded-round bg-surface-subtle" />
          <div className="mt-s3 h-s4 w-[90%] rounded-round bg-surface-subtle" />
        </div>
      </div>
    </div>
  );
}
