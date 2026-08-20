// 组件：首页公告导读快捷链接可视化文章选择与排序编辑器 (ArticleLinkPicker)
// 支持搜索选择已有指南文章自动填入、拖动/上下排序、业务场景解释与即时微预览
"use client";

import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, BookOpen, Link as LinkIcon, Info } from "lucide-react";

export type GuideLink = {
  text: string;
  slug: string;
};

export type ArticleOption = {
  title: string;
  slug: string;
  sectionTitle?: string;
};

type ArticleLinkPickerProps = {
  links: GuideLink[];
  onChange: (links: GuideLink[]) => void;
  availableArticles?: ArticleOption[];
};

export function ArticleLinkPicker({
  links = [],
  onChange,
  availableArticles = [],
}: ArticleLinkPickerProps) {
  const [selectedArticleSlug, setSelectedArticleSlug] = useState("");

  const handleTextChange = (index: number, text: string) => {
    const item = links[index];
    if (!item) return;
    const updated = [...links];
    updated[index] = { text, slug: item.slug };
    onChange(updated);
  };

  const handleSlugChange = (index: number, slug: string) => {
    const item = links[index];
    if (!item) return;
    const updated = [...links];
    updated[index] = { text: item.text, slug };
    onChange(updated);
  };

  const handleSelectArticle = (index: number, slug: string) => {
    const item = links[index];
    if (!item) return;
    const found = availableArticles.find((a) => a.slug === slug);
    const updated = [...links];
    if (found) {
      updated[index] = {
        text: item.text || found.title,
        slug: found.slug,
      };
    } else {
      updated[index] = { text: item.text, slug };
    }
    onChange(updated);
  };

  const handleAdd = () => {
    if (selectedArticleSlug) {
      const found = availableArticles.find((a) => a.slug === selectedArticleSlug);
      if (found) {
        onChange([...links, { text: found.title, slug: found.slug }]);
        setSelectedArticleSlug("");
        return;
      }
    }
    onChange([...links, { text: "新导读", slug: "" }]);
  };

  const handleRemove = (index: number) => {
    onChange(links.filter((_, idx) => idx !== index));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= links.length) return;
    const itemA = links[index];
    const itemB = links[targetIdx];
    if (!itemA || !itemB) return;
    const updated = [...links];
    updated[index] = itemB;
    updated[targetIdx] = itemA;
    onChange(updated);
  };

  return (
    <div className="space-y-s4">
      {/* 业务场景解释卡片 */}
      <div className="rounded-small border border-brand bg-brand-tint p-s3 text-caption text-ink space-y-s1">
        <div className="flex items-center gap-s1 font-semibold text-brand">
          <Info className="size-icon-small" />
          <span>什么是「导读快捷链接」？</span>
        </div>
        <p className="text-muted leading-body">
          导读链接会展示在学生端首页顶部【公告卡片】正文下方（例如：<em>“请先查阅 [新生必看] · [关于我们]”</em>）。
          新生进入首页后，无需逐层展开目录即可 1 秒直达最重要的高频核心指南。
        </p>
      </div>

      {/* 快捷添加栏（从已有文章库选择） */}
      {availableArticles.length > 0 && (
        <div className="flex flex-wrap items-center gap-s2 p-s3 rounded-small border border-line bg-surface-subtle">
          <span className="text-caption font-medium text-ink flex items-center gap-s1">
            <BookOpen className="size-icon-small text-brand" />
            <span>从已有文章库直接添加：</span>
          </span>
          <select
            value={selectedArticleSlug}
            onChange={(e) => setSelectedArticleSlug(e.target.value)}
            className="focus-ring h-8 rounded-small border border-line bg-surface px-s3 text-caption text-ink"
          >
            <option value="">-- 选择已有指南文章 --</option>
            {availableArticles.map((art) => (
              <option key={art.slug} value={art.slug}>
                {art.sectionTitle ? `[${art.sectionTitle}] ` : ""}
                {art.title} ({art.slug})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedArticleSlug}
            className="focus-ring tap-target flex items-center gap-s1 rounded-small bg-brand px-s3 py-s1 text-caption font-medium text-surface disabled:opacity-50 hover:bg-brand-dark transition-colors"
          >
            <Plus className="size-icon-small" />
            <span>添加为导读</span>
          </button>
        </div>
      )}

      {/* 链接列表 */}
      {links.length === 0 ? (
        <div className="rounded-small border border-dashed border-line p-s4 text-center text-caption text-muted">
          暂无导读链接，点击下方按钮添加
        </div>
      ) : (
        <div className="space-y-s2">
          {links.map((link, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center gap-s2 rounded-small border border-line bg-surface p-s2.5 hover:border-brand transition-colors"
            >
              {/* 排序按钮 */}
              <div className="flex items-center gap-s1">
                <button
                  type="button"
                  onClick={() => handleMove(idx, "up")}
                  disabled={idx === 0}
                  className="focus-ring rounded p-s1 text-muted hover:text-ink disabled:opacity-30"
                  title="上移"
                >
                  <ArrowUp className="size-icon-small" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, "down")}
                  disabled={idx === links.length - 1}
                  className="focus-ring rounded p-s1 text-muted hover:text-ink disabled:opacity-30"
                  title="下移"
                >
                  <ArrowDown className="size-icon-small" />
                </button>
              </div>

              {/* 显示文本 */}
              <div className="min-w-0 flex-1">
                <label className="sr-only">链接显示名称</label>
                <input
                  type="text"
                  value={link.text}
                  onChange={(e) => handleTextChange(idx, e.target.value)}
                  placeholder="按钮文字（如：新生必看）"
                  className="focus-ring h-8 w-full rounded-small border border-line bg-surface px-s2.5 text-caption font-medium text-ink"
                />
              </div>

              {/* 目标 Slug / 快速换选 */}
              <div className="min-w-0 flex-1 flex items-center gap-s1">
                <LinkIcon className="size-icon-small text-muted shrink-0" />
                <input
                  type="text"
                  value={link.slug}
                  onChange={(e) => handleSlugChange(idx, e.target.value)}
                  placeholder="文章 Slug 或路由（如：xinsheng）"
                  className="focus-ring h-8 w-full rounded-small border border-line bg-surface px-s2.5 text-caption text-ink font-mono"
                />
              </div>

              {/* 下拉替换 */}
              {availableArticles.length > 0 && (
                <select
                  value={availableArticles.some((a) => a.slug === link.slug) ? link.slug : ""}
                  onChange={(e) => handleSelectArticle(idx, e.target.value)}
                  className="focus-ring h-8 rounded-small border border-line bg-surface-subtle px-s2 text-caption text-muted w-auto truncate"
                  title="从文章库快速替换"
                >
                  <option value="">快速换选篇目</option>
                  {availableArticles.map((art) => (
                    <option key={art.slug} value={art.slug}>
                      {art.title}
                    </option>
                  ))}
                </select>
              )}

              {/* 删除 */}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="focus-ring tap-target grid place-items-center rounded-round p-s1 text-muted hover:text-danger hover:bg-danger-bg transition-colors"
                title="删除该链接"
              >
                <Trash2 className="size-icon-small" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 自定义空白添加 */}
      <button
        type="button"
        onClick={() => onChange([...links, { text: "新导读", slug: "" }])}
        className="focus-ring tap-target flex items-center gap-s1 rounded-small border border-dashed border-line px-s3 py-s2 text-caption font-medium text-muted hover:text-brand hover:border-brand transition-colors"
      >
        <Plus className="size-icon-small" />
        <span>+ 手动添加一条空白链接</span>
      </button>
    </div>
  );
}
