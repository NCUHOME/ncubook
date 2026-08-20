// 组件：电话号码交互标签（点击在移动端唤起系统拨号，并弹出 Toast 提示）
"use client";

import { showToast } from "@/src/components/primitives/toast";

export function PhoneTag({ phone }: { phone: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    showToast(`已唤起拨号：${phone}`);
    window.location.href = `tel:${phone.replace(/[^0-9+]/g, "")}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="focus-ring inline-flex items-center gap-s1 font-semibold text-brand underline underline-offset-2 hover:opacity-80 active:opacity-60 cursor-pointer"
      title={`拨打电话：${phone}`}
    >
      <span>{phone}</span>
    </button>
  );
}
