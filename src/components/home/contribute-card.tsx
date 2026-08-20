// 组件：首页完善手册卡片（支持点击邮箱/QQ群复制并弹出 Toast 药丸提示）
"use client";

import { showToast } from "@/src/components/primitives/toast";

export function ContributeCard({
  email = "book@nchuhome.club",
  qqGroup = "930991836",
  desc = "如有发现错漏，或想把自己的经验写进来，欢迎加入我们～",
}: {
  email?: string;
  qqGroup?: string;
  desc?: string;
}) {
  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(email).catch(() => {});
    showToast(`已复制邮箱：${email}`);
  };

  const handleCopyQQ = () => {
    navigator.clipboard?.writeText(qqGroup).catch(() => {});
    showToast(`已复制交流群：${qqGroup}`);
  };

  return (
    <section className="mt-s7" aria-labelledby="home-contribute-title">
      <h2 id="home-contribute-title" className="text-title font-semibold text-ink">
        完善手册
      </h2>
      <p className="mt-s1 text-body text-ink-sub leading-body">{desc}</p>

      <div className="mt-s3 grid grid-cols-[auto_1fr] items-baseline gap-x-s4 gap-y-s2 text-body">
        <span className="text-caption text-muted">邮箱</span>
        <div>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="text-brand font-medium hover:underline text-left"
          >
            {email}
          </button>
          <span className="ml-s2 text-caption text-muted">（点击复制）</span>
        </div>

        <span className="text-caption text-muted">QQ群</span>
        <div>
          <button
            type="button"
            onClick={handleCopyQQ}
            className="text-brand font-medium hover:underline text-left"
          >
            {qqGroup}
          </button>
          <span className="ml-s2 text-caption text-muted">（点击复制）</span>
        </div>
      </div>
    </section>
  );
}
