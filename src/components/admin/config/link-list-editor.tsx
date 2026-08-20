// 组件：动态键值对与导读链接编辑器 (LinkListEditor)
"use client";

import { Plus, Trash2 } from "lucide-react";

export type LinkItem = {
  text: string;
  slug: string;
};

export function LinkListEditor({
  links,
  onChange,
  label = "导读快捷链接列表",
  hint = "配置公告中推荐阅读的篇目快捷链接",
}: {
  links: LinkItem[];
  onChange: (newLinks: LinkItem[]) => void;
  label?: string;
  hint?: string;
}) {
  const handleAdd = () => {
    onChange([...links, { text: "", slug: "" }]);
  };

  const handleUpdate = (index: number, field: "text" | "slug", val: string) => {
    const updated = links.map((item, i) => (i === index ? { ...item, [field]: val } : item));
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-s3">
      <div className="flex items-baseline justify-between">
        <label className="text-label font-medium text-ink">{label}</label>
        {hint && <span className="text-caption text-muted">{hint}</span>}
      </div>

      <div className="space-y-s2">
        {links.map((link, idx) => (
          <div key={idx} className="flex items-center gap-s2">
            <input
              type="text"
              value={link.text}
              onChange={(e) => handleUpdate(idx, "text", e.target.value)}
              placeholder="链接文本（如：新生必看）"
              className="focus-ring flex-1 rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink placeholder:text-muted"
            />
            <input
              type="text"
              value={link.slug}
              onChange={(e) => handleUpdate(idx, "slug", e.target.value)}
              placeholder="页面 Slug（如：xinsheng）"
              className="focus-ring flex-1 rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink placeholder:text-muted font-mono text-caption"
            />
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="focus-ring tap-target rounded-small p-s2 text-muted hover:text-danger hover:bg-danger-bg transition-colors"
              aria-label={`删除第 ${idx + 1} 条链接`}
            >
              <Trash2 className="size-icon-small" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="focus-ring tap-target inline-flex items-center gap-s1 rounded-small border border-dashed border-line px-s3 py-s2 text-caption font-medium text-brand hover:bg-brand-tint transition-colors"
      >
        <Plus className="size-icon-small" />
        <span>添加一条导读链接</span>
      </button>
    </div>
  );
}
