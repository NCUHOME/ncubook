// 组件：交互式标签药丸编辑器 (TagInput)，支持动态增删、回车添加与快捷防重
"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

export function TagInput({
  tags,
  onChange,
  placeholder = "输入新标签后回车或点击添加...",
  label,
  hint,
}: {
  tags: string[];
  onChange: (newTags: string[]) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, tags.length - 1));
    }
  };

  const handleRemove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-s2">
      {label && (
        <div className="flex items-baseline justify-between">
          <label className="text-label font-medium text-ink">{label}</label>
          {hint && <span className="text-caption text-muted">{hint}</span>}
        </div>
      )}

      {/* 标签 Pill 容器 */}
      <div className="flex flex-wrap items-center gap-s2 rounded-small border border-line bg-surface p-s2 focus-within:border-brand transition-colors min-h-tap">
        {tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-s1 rounded-pill border border-line bg-surface-subtle px-s3 py-s1 text-caption font-medium text-ink"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="focus-ring rounded-round text-muted hover:text-danger hover:bg-danger-bg p-s1 transition-colors"
              aria-label={`删除标签 ${tag}`}
            >
              <X className="size-icon-small" />
            </button>
          </span>
        ))}

        <div className="flex flex-1 items-center gap-s1 min-w-0">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : "添加更多..."}
            className="focus-ring flex-1 bg-transparent px-s2 py-s1 text-body text-ink outline-none placeholder:text-muted"
          />
          {draft.trim() && (
            <button
              type="button"
              onClick={handleAdd}
              className="focus-ring inline-flex items-center gap-s1 rounded-small bg-brand px-s2 py-s1 text-caption font-medium text-surface transition-colors"
            >
              <Plus className="size-icon-small" />
              <span>添加</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
