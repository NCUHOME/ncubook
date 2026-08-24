// 组件：首页完善手册卡片（支持点击邮箱/QQ群复制并弹出 Toast 药丸提示）
"use client";

import { showToast } from "@/src/components/primitives/toast";
import { trackEvent } from "@/lib/analytics/client";

export function ContributeCard({
  email = "book[AT]nchuhome.club",
  qqGroup = "1056385156",
  desc = "如有发现错漏，或想把自己的经验写进来，欢迎加入我们～",
}: {
  email?: string;
  qqGroup?: string;
  desc?: string;
}) {
  const handleCopyEmail = () => {
    const copyValue = email.replace("[AT]", "@");
    navigator.clipboard?.writeText(copyValue).catch(() => {});
    trackEvent("contact_copied", { targetType: "email", value: copyValue, label: "投稿邮箱" });
    showToast(`已复制邮箱：${copyValue}`);
  };

  const handleCopyQQ = () => {
    navigator.clipboard?.writeText(qqGroup).catch(() => {});
    trackEvent("contact_copied", { targetType: "qq", value: qqGroup, label: "交流QQ群" });
    showToast(`已复制交流群：${qqGroup}`);
  };

  return (
    <section className="mt-s6" aria-labelledby="home-contribute-title">
      <h2 id="home-contribute-title" className="text-ui-title font-semibold leading-heading text-ink">
        完善手册
      </h2>
      <p className="mt-contribute-lead text-small leading-body text-ink-sub">{desc}</p>

      <div className="grid-label-value mt-s2 grid items-baseline gap-x-notice gap-y-compact text-small">
        <span className="text-contact-label text-muted">邮箱</span>
        <div>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="cursor-pointer text-left text-brand"
            style={{ color: "var(--brand-blue)" }}
          >
            {email}
          </button>
          <span className="ml-s1 text-caption text-muted">（替换 @）</span>
        </div>

        <span className="text-contact-label text-muted">QQ</span>
        <div>
          <button
            type="button"
            onClick={handleCopyQQ}
            className="cursor-pointer text-left text-brand"
            style={{ color: "var(--brand-blue)" }}
          >
            {qqGroup}
          </button>
        </div>
      </div>
    </section>
  );
}
