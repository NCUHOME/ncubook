// 页面路由：全站通用 Streaming 骨架屏加载退回组件，符合设计令牌与 360-430px 屏幕视觉契约
export default function Loading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[760px] animate-pulse bg-canvas px-s5 py-s6">
      {/* 顶栏 Header 骨架 */}
      <div className="flex h-[44px] items-center justify-between border-b border-line pb-s3">
        <div className="h-s4 w-[80px] rounded-round bg-surface-subtle" />
        <div className="h-s5 w-s5 rounded-round bg-surface-subtle" />
      </div>

      {/* 提问框骨架 */}
      <div className="mt-s6 rounded-round border border-line bg-surface-subtle p-s5">
        <div className="h-s5 w-[140px] rounded-round bg-border" />
        <div className="mt-s4 h-s6 w-full rounded-round bg-border" />
      </div>

      {/* 板块列表骨架 */}
      <div className="mt-s7 space-y-s4">
        <div className="h-s4 w-[100px] rounded-round bg-surface-subtle" />
        <div className="grid grid-cols-1 gap-s4 sm:grid-cols-2">
          <div className="h-[100px] rounded-round border border-line bg-surface-subtle" />
          <div className="h-[100px] rounded-round border border-line bg-surface-subtle" />
        </div>
      </div>
    </div>
  );
}
