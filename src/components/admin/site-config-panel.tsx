// 组件：管理后台全站公共信息配置中心 (SiteConfigPanel)，支持 8 大配置域与可视化交互编辑器
"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Bot,
  Home,
  MessageSquare,
  Tags,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_AI_CONFIG,
  DEFAULT_HOME_HERO_CONFIG,
  DEFAULT_HOME_NOTICE_CONFIG,
  DEFAULT_HOME_CONTRIBUTE_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_ARTICLE_FEEDBACK_CONFIG,
  DEFAULT_ARTICLE_GROUPS_CONFIG,
  type SearchConfig,
  type AiConfig,
  type HomeHeroConfig,
  type HomeNoticeConfig,
  type HomeContributeConfig,
  type FooterConfig,
  type ArticleFeedbackConfig,
} from "@/lib/content/site-config";
import { TagInput } from "@/src/components/admin/config/tag-input";
import { LinkListEditor } from "@/src/components/admin/config/link-list-editor";
import { HollamaMascot } from "@/src/components/primitives/hollama-mascot";

type ConfigTabKey = "search" | "ai" | "home" | "channels" | "groups";

export function SiteConfigPanel() {
  const [activeTab, setActiveTab] = useState<ConfigTabKey>("search");

  // 1. 搜索配置
  const [searchConfig, setSearchConfig] = useState<SearchConfig>(DEFAULT_SEARCH_CONFIG);
  // 2. AI 配置
  const [aiConfig, setAiConfig] = useState<AiConfig>(DEFAULT_AI_CONFIG);
  // 3. 首页标语与公告
  const [heroConfig, setHeroConfig] = useState<HomeHeroConfig>(DEFAULT_HOME_HERO_CONFIG);
  const [noticeConfig, setNoticeConfig] = useState<HomeNoticeConfig>(DEFAULT_HOME_NOTICE_CONFIG);
  // 4. 完善手册、页脚与反馈
  const [contributeConfig, setContributeConfig] = useState<HomeContributeConfig>(DEFAULT_HOME_CONTRIBUTE_CONFIG);
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [feedbackConfig, setFeedbackConfig] = useState<ArticleFeedbackConfig>(DEFAULT_ARTICLE_FEEDBACK_CONFIG);
  // 5. 目录二级分类
  const [articleGroupsJson, setArticleGroupsJson] = useState(JSON.stringify(DEFAULT_ARTICLE_GROUPS_CONFIG, null, 2));

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          for (const item of res.data) {
            if (item.key === "search_config" && item.value) setSearchConfig({ ...DEFAULT_SEARCH_CONFIG, ...item.value });
            if (item.key === "ai_config" && item.value) setAiConfig({ ...DEFAULT_AI_CONFIG, ...item.value });
            if (item.key === "home_hero" && item.value) setHeroConfig({ ...DEFAULT_HOME_HERO_CONFIG, ...item.value });
            if (item.key === "home_notice" && item.value) setNoticeConfig({ ...DEFAULT_HOME_NOTICE_CONFIG, ...item.value });
            if (item.key === "home_contribute" && item.value) setContributeConfig({ ...DEFAULT_HOME_CONTRIBUTE_CONFIG, ...item.value });
            if (item.key === "footer_config" && item.value) setFooterConfig({ ...DEFAULT_FOOTER_CONFIG, ...item.value });
            if (item.key === "article_feedback_config" && item.value) setFeedbackConfig({ ...DEFAULT_ARTICLE_FEEDBACK_CONFIG, ...item.value });
            if (item.key === "article_groups" && item.value) setArticleGroupsJson(JSON.stringify(item.value, null, 2));
          }
        }
      })
      .catch(() => {});
  }, []);

  const saveConfig = async (key: string, value: unknown, successText: string) => {
    setSavingKey(key);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "保存失败");
      }
      setMessage({ type: "success", text: successText });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "保存失败" });
    } finally {
      setSavingKey(null);
    }
  };

  const navTabs: Array<{ key: ConfigTabKey; label: string; icon: typeof Search }> = [
    { key: "search", label: "搜索与推荐配置", icon: Search },
    { key: "ai", label: "AI 助手与预设问题", icon: Bot },
    { key: "home", label: "首页标语与公告栏", icon: Home },
    { key: "channels", label: "完善手册与渠道声明", icon: MessageSquare },
    { key: "groups", label: "目录二级分类前称", icon: Tags },
  ];

  return (
    <div className="space-y-s6">
      {/* 顶部标题与提示消息 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-s3">
        <div>
          <h2 className="text-title font-semibold text-ink">全站公共信息配置中心</h2>
          <p className="text-caption text-muted mt-s1">
            动态修改前台搜索推荐词、AI 预设问题、公告与联系方式，100% 数据库持久化
          </p>
        </div>

        {message && (
          <div
            className={`flex items-center gap-s2 rounded-small px-s3 py-s2 text-caption font-medium animate-in fade-in duration-fast ${
              message.type === "success"
                ? "bg-brand-tint text-brand border border-brand"
                : "bg-danger-bg text-danger border border-danger"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="size-icon-small shrink-0" />
            ) : (
              <AlertCircle className="size-icon-small shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* 5 大配置域切换导航 */}
      <div className="flex items-center gap-s2 border-b border-line pb-s2 overflow-x-auto no-scrollbar">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`focus-ring tap-target flex shrink-0 items-center gap-s2 rounded-small px-s3 py-s2 text-caption font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-brand text-surface shadow-subtle font-semibold"
                  : "text-muted hover:text-ink hover:bg-surface-subtle"
              }`}
            >
              <Icon className="size-icon-small" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: 搜索与推荐配置 */}
      {activeTab === "search" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-s6">
          <div className="lg:col-span-2 space-y-s5 rounded-medium border border-line bg-surface p-s5">
            <div className="border-b border-line pb-s3">
              <h3 className="text-label font-semibold text-ink">搜索输入框与推荐标签 (search_config)</h3>
              <p className="text-caption text-muted mt-s1">配置学生端全屏搜索抽屉的占位提示与快捷标签</p>
            </div>

            {/* 1. 热门推荐标签 Chips */}
            <TagInput
              label="热门推荐标签 (Chips)"
              hint="学生点击可立即触发搜索，回车添加，点击 ✕ 移除"
              tags={searchConfig.chips}
              onChange={(newChips) => setSearchConfig({ ...searchConfig, chips: newChips })}
              placeholder="输入推荐词（如：校车时刻表）后回车..."
            />

            {/* 2. 占位提示语 */}
            <div className="space-y-s2">
              <label className="text-label font-medium text-ink">搜索框占位提示语 (Placeholder)</label>
              <input
                type="text"
                value={searchConfig.placeholder}
                onChange={(e) => setSearchConfig({ ...searchConfig, placeholder: e.target.value })}
                className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
              />
            </div>

            {/* 3. 空态与无结果提示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">空态引导文案</label>
                <input
                  type="text"
                  value={searchConfig.emptyHint}
                  onChange={(e) => setSearchConfig({ ...searchConfig, emptyHint: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>

              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">未找到结果提示文案</label>
                <input
                  type="text"
                  value={searchConfig.noResultTitle}
                  onChange={(e) => setSearchConfig({ ...searchConfig, noResultTitle: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-s4">
              <button
                type="button"
                onClick={() => setSearchConfig(DEFAULT_SEARCH_CONFIG)}
                className="focus-ring tap-target flex items-center gap-s1 text-caption text-muted hover:text-ink transition-colors"
              >
                <RotateCcw className="size-icon-small" />
                <span>恢复默认搜索配置</span>
              </button>

              <button
                type="button"
                onClick={() => saveConfig("search_config", searchConfig, "搜索与推荐配置保存成功")}
                disabled={savingKey === "search_config"}
                className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-brand px-s4 py-s2 text-label font-medium text-surface hover:opacity-90 transition-opacity"
              >
                <Save className="size-icon-small" />
                <span>{savingKey === "search_config" ? "正在保存..." : "保存搜索配置"}</span>
              </button>
            </div>
          </div>

          {/* 实时微预览 */}
          <div className="rounded-medium border border-line bg-surface p-s5 space-y-s3 self-start">
            <div className="flex items-center gap-s2 text-caption text-muted border-b border-line pb-s2 font-semibold">
              <Sparkles className="size-icon-small text-brand" />
              <span>前台效果即时预览</span>
            </div>
            <div className="rounded-small border border-line bg-surface-subtle p-s3 space-y-s3">
              <div className="flex items-center gap-s2 rounded-small border border-line bg-surface px-s3 py-s2 text-caption text-muted">
                <Search className="size-icon-small text-muted" />
                <span className="truncate">{searchConfig.placeholder}</span>
              </div>
              <div className="flex flex-wrap gap-s1">
                {searchConfig.chips.map((c) => (
                  <span key={c} className="rounded-pill border border-line bg-surface px-s2 py-s1 text-caption text-ink font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI 助手与预设问题 */}
      {activeTab === "ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-s6">
          <div className="lg:col-span-2 space-y-s5 rounded-medium border border-line bg-surface p-s5">
            <div className="border-b border-line pb-s3">
              <h3 className="text-label font-semibold text-ink">AI 助手预设问题与文案 (ai_config)</h3>
              <p className="text-caption text-muted mt-s1">配置学生向吉祥物提问时展示的高频预设问题</p>
            </div>

            {/* 1. 预设提问列表 */}
            <TagInput
              label="推荐快捷提问列表 (Suggested Questions)"
              hint="学生点击即可立即向 AI 发送该问题"
              tags={aiConfig.suggestedQuestions}
              onChange={(newQuestions) => setAiConfig({ ...aiConfig, suggestedQuestions: newQuestions })}
              placeholder="输入预设问题（如：图书馆开放时间？）后回车..."
            />

            {/* 2. 助手副标题与输入提示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">AI 助手副标题</label>
                <input
                  type="text"
                  value={aiConfig.assistantSubtitle}
                  onChange={(e) => setAiConfig({ ...aiConfig, assistantSubtitle: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>

              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">提问输入框占位语</label>
                <input
                  type="text"
                  value={aiConfig.inputPlaceholder}
                  onChange={(e) => setAiConfig({ ...aiConfig, inputPlaceholder: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-s4">
              <button
                type="button"
                onClick={() => setAiConfig(DEFAULT_AI_CONFIG)}
                className="focus-ring tap-target flex items-center gap-s1 text-caption text-muted hover:text-ink transition-colors"
              >
                <RotateCcw className="size-icon-small" />
                <span>恢复默认 AI 配置</span>
              </button>

              <button
                type="button"
                onClick={() => saveConfig("ai_config", aiConfig, "AI 助手配置保存成功")}
                disabled={savingKey === "ai_config"}
                className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-brand px-s4 py-s2 text-label font-medium text-surface hover:opacity-90 transition-opacity"
              >
                <Save className="size-icon-small" />
                <span>{savingKey === "ai_config" ? "正在保存..." : "保存 AI 配置"}</span>
              </button>
            </div>
          </div>

          {/* 实时微预览 */}
          <div className="rounded-medium border border-line bg-surface p-s5 space-y-s3 self-start">
            <div className="flex items-center gap-s2 text-caption text-muted border-b border-line pb-s2 font-semibold">
              <Sparkles className="size-icon-small text-brand" />
              <span>AI 弹层即时预览</span>
            </div>
            <div className="rounded-small border border-line bg-surface-subtle p-s3 space-y-s2">
              <div className="flex items-center gap-s2">
                <HollamaMascot size={22} />
                <div>
                  <span className="text-caption font-semibold text-ink">询问此间</span>
                  <p className="text-caption text-muted">{aiConfig.assistantSubtitle}</p>
                </div>
              </div>
              <div className="space-y-s1 pt-s2 border-t border-line">
                <span className="text-caption text-muted block">快捷提问：</span>
                {aiConfig.suggestedQuestions.map((q) => (
                  <div key={q} className="rounded-small bg-surface border border-line px-s2 py-s1 text-caption text-ink font-medium">
                    {q}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 首页标语与公告栏 */}
      {activeTab === "home" && (
        <div className="space-y-s6">
          {/* 1. 标语引言 */}
          <div className="rounded-medium border border-line bg-surface p-s5 space-y-s4">
            <div className="border-b border-line pb-s3">
              <h3 className="text-label font-semibold text-ink">首页主标语与人文名言 (home_hero)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">主标题 (支持 &lt;br&gt; 换行)</label>
                <input
                  type="text"
                  value={heroConfig.title}
                  onChange={(e) => setHeroConfig({ ...heroConfig, title: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>

              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">人文引言名言</label>
                <input
                  type="text"
                  value={heroConfig.quote}
                  onChange={(e) => setHeroConfig({ ...heroConfig, quote: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>
            </div>

            <div className="flex justify-end pt-s2 border-t border-line">
              <button
                type="button"
                onClick={() => saveConfig("home_hero", heroConfig, "首页标语配置保存成功")}
                disabled={savingKey === "home_hero"}
                className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-brand px-s4 py-s2 text-label font-medium text-surface"
              >
                <Save className="size-icon-small" />
                <span>{savingKey === "home_hero" ? "正在保存..." : "保存标语配置"}</span>
              </button>
            </div>
          </div>

          {/* 2. 公告栏 */}
          <div className="rounded-medium border border-line bg-surface p-s5 space-y-s5">
            <div className="border-b border-line pb-s3">
              <h3 className="text-label font-semibold text-ink">首页公告栏与重点导读 (home_notice)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">公告标题</label>
                <input
                  type="text"
                  value={noticeConfig.title}
                  onChange={(e) => setNoticeConfig({ ...noticeConfig, title: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>

              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">发布/更新日期</label>
                <input
                  type="text"
                  value={noticeConfig.date}
                  onChange={(e) => setNoticeConfig({ ...noticeConfig, date: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>
            </div>

            <div className="space-y-s2">
              <label className="text-label font-medium text-ink">公告正文说明</label>
              <textarea
                rows={2}
                value={noticeConfig.desc}
                onChange={(e) => setNoticeConfig({ ...noticeConfig, desc: e.target.value })}
                className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
              />
            </div>

            {/* 动态导读链接列表 */}
            <LinkListEditor
              links={noticeConfig.links}
              onChange={(newLinks) => setNoticeConfig({ ...noticeConfig, links: newLinks })}
            />

            <div className="flex justify-end pt-s2 border-t border-line">
              <button
                type="button"
                onClick={() => saveConfig("home_notice", noticeConfig, "首页公告配置保存成功")}
                disabled={savingKey === "home_notice"}
                className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-brand px-s4 py-s2 text-label font-medium text-surface"
              >
                <Save className="size-icon-small" />
                <span>{savingKey === "home_notice" ? "正在保存..." : "保存公告配置"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: 完善手册、页脚与渠道声明 */}
      {activeTab === "channels" && (
        <div className="space-y-s6">
          {/* 1. 完善手册卡片 */}
          <div className="rounded-medium border border-line bg-surface p-s5 space-y-s4">
            <div className="border-b border-line pb-s3">
              <h3 className="text-label font-semibold text-ink">完善手册联系渠道 (home_contribute)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">投稿/联系邮箱</label>
                <input
                  type="email"
                  value={contributeConfig.email}
                  onChange={(e) => setContributeConfig({ ...contributeConfig, email: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink font-mono text-caption"
                />
              </div>

              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">交流 QQ 群号</label>
                <input
                  type="text"
                  value={contributeConfig.qq_group}
                  onChange={(e) => setContributeConfig({ ...contributeConfig, qq_group: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink font-mono text-caption"
                />
              </div>
            </div>

            <div className="space-y-s2">
              <label className="text-label font-medium text-ink">卡片说明正文</label>
              <input
                type="text"
                value={contributeConfig.desc}
                onChange={(e) => setContributeConfig({ ...contributeConfig, desc: e.target.value })}
                className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
              />
            </div>

            <div className="flex justify-end pt-s2 border-t border-line">
              <button
                type="button"
                onClick={() => saveConfig("home_contribute", contributeConfig, "联系渠道配置保存成功")}
                disabled={savingKey === "home_contribute"}
                className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-brand px-s4 py-s2 text-label font-medium text-surface"
              >
                <Save className="size-icon-small" />
                <span>{savingKey === "home_contribute" ? "正在保存..." : "保存联系配置"}</span>
              </button>
            </div>
          </div>

          {/* 2. 页脚致谢与声明 */}
          <div className="rounded-medium border border-line bg-surface p-s5 space-y-s4">
            <div className="border-b border-line pb-s3">
              <h3 className="text-label font-semibold text-ink">页脚致谢与免责声明 (footer_config)</h3>
            </div>

            <div className="space-y-s2">
              <label className="text-label font-medium text-ink">致谢前缀文案</label>
              <input
                type="text"
                value={footerConfig.thankPrefix}
                onChange={(e) => setFooterConfig({ ...footerConfig, thankPrefix: e.target.value })}
                className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
              />
            </div>

            <div className="space-y-s2">
              <label className="text-label font-medium text-ink">非盈利免责声明正文</label>
              <textarea
                rows={2}
                value={footerConfig.disclaimer}
                onChange={(e) => setFooterConfig({ ...footerConfig, disclaimer: e.target.value })}
                className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
              />
            </div>

            <div className="flex justify-end pt-s2 border-t border-line">
              <button
                type="button"
                onClick={() => saveConfig("footer_config", footerConfig, "页脚配置保存成功")}
                disabled={savingKey === "footer_config"}
                className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-brand px-s4 py-s2 text-label font-medium text-surface"
              >
                <Save className="size-icon-small" />
                <span>{savingKey === "footer_config" ? "正在保存..." : "保存页脚配置"}</span>
              </button>
            </div>
          </div>

          {/* 3. 文章反馈与飞书工单 */}
          <div className="rounded-medium border border-line bg-surface p-s5 space-y-s4">
            <div className="border-b border-line pb-s3">
              <h3 className="text-label font-semibold text-ink">文章反馈与飞书收集表 (article_feedback_config)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">反馈引导提示语</label>
                <input
                  type="text"
                  value={feedbackConfig.prompt}
                  onChange={(e) => setFeedbackConfig({ ...feedbackConfig, prompt: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>

              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">点赞感谢语</label>
                <input
                  type="text"
                  value={feedbackConfig.thankMsg}
                  onChange={(e) => setFeedbackConfig({ ...feedbackConfig, thankMsg: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>
            </div>

            <div className="space-y-s2">
              <div className="flex items-center justify-between">
                <label className="text-label font-medium text-ink">飞书多维表格收集表地址</label>
                {feedbackConfig.feishuUrl && (
                  <a
                    href={feedbackConfig.feishuUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-s1 text-caption text-brand hover:underline"
                  >
                    <span>测试打开</span>
                    <ExternalLink className="size-icon-small" />
                  </a>
                )}
              </div>
              <input
                type="url"
                value={feedbackConfig.feishuUrl}
                onChange={(e) => setFeedbackConfig({ ...feedbackConfig, feishuUrl: e.target.value })}
                className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink font-mono text-caption"
              />
            </div>

            <div className="flex justify-end pt-s2 border-t border-line">
              <button
                type="button"
                onClick={() => saveConfig("article_feedback_config", feedbackConfig, "文章反馈配置保存成功")}
                disabled={savingKey === "article_feedback_config"}
                className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-brand px-s4 py-s2 text-label font-medium text-surface"
              >
                <Save className="size-icon-small" />
                <span>{savingKey === "article_feedback_config" ? "正在保存..." : "保存反馈配置"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: 目录二级分类前称 */}
      {activeTab === "groups" && (
        <div className="rounded-medium border border-line bg-surface p-s5 space-y-s4">
          <div className="border-b border-line pb-s3">
            <h3 className="text-label font-semibold text-ink">篇目二级分类与蓝色小标映射 (article_groups)</h3>
            <p className="text-caption text-muted mt-s1">
              配置各板块下文章所属分类（如：入学必看、考试、基本认识、常识等），前端自动按分类桶连续聚类
            </p>
          </div>

          <div className="space-y-s2">
            <label className="text-label font-medium text-ink">分类映射 JSON</label>
            <textarea
              rows={14}
              value={articleGroupsJson}
              onChange={(e) => setArticleGroupsJson(e.target.value)}
              className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 font-mono text-caption text-ink"
            />
          </div>

          <div className="flex justify-between items-center pt-s2 border-t border-line">
            <button
              type="button"
              onClick={() => setArticleGroupsJson(JSON.stringify(DEFAULT_ARTICLE_GROUPS_CONFIG, null, 2))}
              className="focus-ring tap-target flex items-center gap-s1 text-caption text-muted hover:text-ink transition-colors"
            >
              <RotateCcw className="size-icon-small" />
              <span>恢复默认分类</span>
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  const parsed = JSON.parse(articleGroupsJson);
                  saveConfig("article_groups", parsed, "目录分类配置保存成功");
                } catch {
                  setMessage({ type: "error", text: "JSON 格式有误，请检查语法" });
                }
              }}
              disabled={savingKey === "article_groups"}
              className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-brand px-s4 py-s2 text-label font-medium text-surface"
            >
              <Save className="size-icon-small" />
              <span>{savingKey === "article_groups" ? "正在保存..." : "保存分类配置"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
