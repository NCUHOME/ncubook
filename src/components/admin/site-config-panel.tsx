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
import { ArticleLinkPicker, type ArticleOption } from "@/src/components/admin/config/article-link-picker";
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

  const [availableArticles, setAvailableArticles] = useState<ArticleOption[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((res) => {
        if (res.ok) {
          if (Array.isArray(res.allArticles)) setAvailableArticles(res.allArticles);
          if (Array.isArray(res.data)) {
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
        }
      })
      .catch(() => {});
  }, []);

  const saveConfig = async (key: string, value: unknown, successMsg: string) => {
    setSavingKey(key);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "success", text: successMsg });
      } else {
        setMessage({ type: "error", text: `保存失败: ${data.error || "未知错误"}` });
      }
    } catch {
      setMessage({ type: "error", text: "网络异常，保存失败" });
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
      {/* 顶部标题区 */}
      <div className="flex items-center justify-between border-b border-line pb-s3">
        <div>
          <h2 className="text-title font-semibold text-ink">全站公共信息配置中心</h2>
          <p className="text-caption text-muted mt-s1">
            动态编辑并即时更新全站搜索推荐、AI预设问题、首页公告与各渠道文案（无需重新发布发版）
          </p>
        </div>
      </div>

      {/* 提示消息 */}
      {message && (
        <div
          className={`flex items-center gap-s2 rounded-small p-s3 text-body font-medium ${
            message.type === "success" ? "bg-brand-tint text-brand border border-brand" : "bg-danger-bg text-danger border border-danger"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="size-icon-small" /> : <AlertCircle className="size-icon-small" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 子分类 Tab 切换 */}
      <div className="flex items-center gap-s2 overflow-x-auto border-b border-line pb-s2 no-scrollbar">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setMessage(null);
              }}
              className={`focus-ring tap-target flex shrink-0 items-center gap-s2 rounded-pill px-s4 py-s1.5 text-caption font-medium transition-colors ${
                isActive ? "bg-brand text-surface shadow-subtle" : "bg-surface-subtle text-muted hover:text-ink"
              }`}
            >
              <Icon className="size-icon-small shrink-0" />
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
              <h3 className="text-label font-semibold text-ink">全站即搜即显与推荐配置 (search_config)</h3>
              <p className="text-caption text-muted mt-s1">控制学生端全屏搜索抽屉的占位语、推荐标签与无结果提示</p>
            </div>

            {/* 1. 占位语 */}
            <div className="space-y-s2">
              <label className="text-label font-medium text-ink">搜索框占位语 (Placeholder)</label>
              <input
                type="text"
                value={searchConfig.placeholder}
                onChange={(e) => setSearchConfig({ ...searchConfig, placeholder: e.target.value })}
                className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                placeholder="搜索手册（如：出行、绩点、报修...）"
              />
            </div>

            {/* 2. Chips 推荐标签 */}
            <TagInput
              label="热门推荐标签 (Chips)"
              hint="学生点击即可一键填入搜索词并触发极速检索"
              tags={searchConfig.chips}
              onChange={(newChips) => setSearchConfig({ ...searchConfig, chips: newChips })}
              placeholder="输入标签词后回车或点击添加..."
            />

            {/* 3. 空态与无结果提示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">初始空态引导语</label>
                <input
                  type="text"
                  value={searchConfig.emptyHint}
                  onChange={(e) => setSearchConfig({ ...searchConfig, emptyHint: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>

              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">无结果主标题 (支持 {"{query}"} 占位)</label>
                <input
                  type="text"
                  value={searchConfig.noResultTitle}
                  onChange={(e) => setSearchConfig({ ...searchConfig, noResultTitle: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>
            </div>

            <div className="space-y-s2">
              <label className="text-label font-medium text-ink">无结果副提示文案</label>
              <input
                type="text"
                value={searchConfig.noResultSub}
                onChange={(e) => setSearchConfig({ ...searchConfig, noResultSub: e.target.value })}
                className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
              />
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
                onClick={() => saveConfig("search_config", searchConfig, "搜索配置保存成功")}
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
              <span>搜索抽屉即时效果预览</span>
            </div>
            <div className="rounded-small border border-line bg-surface-subtle p-s3 space-y-s3">
              <div className="h-9 rounded-medium border border-line bg-surface px-s3 flex items-center text-caption text-muted">
                <Search className="size-icon-small mr-s2 text-muted" />
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

          {/* 2. 公告栏与导读文章选择器 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-s6">
            <div className="lg:col-span-2 rounded-medium border border-line bg-surface p-s5 space-y-s5">
              <div className="border-b border-line pb-s3">
                <h3 className="text-label font-semibold text-ink">首页公告栏与重点导读推荐 (home_notice)</h3>
                <p className="text-caption text-muted mt-s1">
                  编辑展示在学生端首页顶部的公告卡片，可直接下拉选择已有指南文章作为快捷导读按钮
                </p>
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

              {/* 智能文章导读选择器 */}
              <div className="space-y-s2">
                <label className="text-label font-semibold text-ink">公告内导读快捷推荐列表</label>
                <ArticleLinkPicker
                  links={noticeConfig.links}
                  onChange={(newLinks) => setNoticeConfig({ ...noticeConfig, links: newLinks })}
                  availableArticles={availableArticles}
                />
              </div>

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

            {/* 首页公告 1:1 即时微预览 */}
            <div className="rounded-medium border border-line bg-surface p-s5 space-y-s3 self-start">
              <div className="flex items-center gap-s2 text-caption text-muted border-b border-line pb-s2 font-semibold">
                <Sparkles className="size-icon-small text-brand" />
                <span>首页公告卡片 1:1 实景微预览</span>
              </div>
              <div className="rounded-r-small border-l-[3px] border-brand bg-surface-subtle p-s4 space-y-s2">
                <div className="flex items-baseline justify-between">
                  <span className="text-body font-semibold text-ink">{noticeConfig.title || "公告"}</span>
                  {noticeConfig.date && <span className="text-caption text-muted">{noticeConfig.date}</span>}
                </div>
                {noticeConfig.desc && <p className="text-body leading-body text-ink-body">{noticeConfig.desc}</p>}
                {noticeConfig.links && noticeConfig.links.length > 0 && (
                  <ul className="list-disc pl-s4 text-body leading-body text-ink-body space-y-s1">
                    {noticeConfig.links.map((link, idx) => (
                      <li key={idx}>
                        请先查阅 <span className="text-brand font-semibold underline">{link.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: 完善手册、页脚与反馈 */}
      {activeTab === "channels" && (
        <div className="space-y-s6">
          {/* 完善手册联系 */}
          <div className="rounded-medium border border-line bg-surface p-s5 space-y-s4">
            <div className="border-b border-line pb-s3">
              <h3 className="text-label font-semibold text-ink">完善手册联系渠道 (home_contribute)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">投稿/纠错邮箱</label>
                <input
                  type="text"
                  value={contributeConfig.email}
                  onChange={(e) => setContributeConfig({ ...contributeConfig, email: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>

              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">交流/加入 QQ 群号</label>
                <input
                  type="text"
                  value={contributeConfig.qq_group}
                  onChange={(e) => setContributeConfig({ ...contributeConfig, qq_group: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>
            </div>

            <div className="space-y-s2">
              <label className="text-label font-medium text-ink">招新与加入文案</label>
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
                onClick={() => saveConfig("home_contribute", contributeConfig, "联系方式配置保存成功")}
                disabled={savingKey === "home_contribute"}
                className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-brand px-s4 py-s2 text-label font-medium text-surface"
              >
                <Save className="size-icon-small" />
                <span>{savingKey === "home_contribute" ? "正在保存..." : "保存联系配置"}</span>
              </button>
            </div>
          </div>

          {/* 页脚致谢与声明 */}
          <div className="rounded-medium border border-line bg-surface p-s5 space-y-s4">
            <div className="border-b border-line pb-s3">
              <h3 className="text-label font-semibold text-ink">页脚致谢与免责声明 (footer_config)</h3>
            </div>

            <div className="space-y-s2">
              <label className="text-label font-medium text-ink">致谢文案前缀</label>
              <input
                type="text"
                value={footerConfig.thankPrefix}
                onChange={(e) => setFooterConfig({ ...footerConfig, thankPrefix: e.target.value })}
                className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
              />
            </div>

            <div className="space-y-s2">
              <label className="text-label font-medium text-ink">非盈利免责声明</label>
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

          {/* 文章底部反馈条 */}
          <div className="rounded-medium border border-line bg-surface p-s5 space-y-s4">
            <div className="border-b border-line pb-s3">
              <h3 className="text-label font-semibold text-ink">文章有用性反馈与飞书工单 (article_feedback_config)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-s4">
              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">底部反馈引导语</label>
                <input
                  type="text"
                  value={feedbackConfig.prompt}
                  onChange={(e) => setFeedbackConfig({ ...feedbackConfig, prompt: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>

              <div className="space-y-s2">
                <label className="text-label font-medium text-ink">点赞感谢提示</label>
                <input
                  type="text"
                  value={feedbackConfig.thankMsg}
                  onChange={(e) => setFeedbackConfig({ ...feedbackConfig, thankMsg: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink"
                />
              </div>
            </div>

            <div className="space-y-s2">
              <label className="text-label font-medium text-ink">飞书工单表单 URL (点踩没帮助直通)</label>
              <div className="flex items-center gap-s2">
                <input
                  type="text"
                  value={feedbackConfig.feishuUrl}
                  onChange={(e) => setFeedbackConfig({ ...feedbackConfig, feishuUrl: e.target.value })}
                  className="focus-ring w-full rounded-small border border-line bg-surface px-s3 py-s2 text-body text-ink font-mono text-caption"
                />
                {feedbackConfig.feishuUrl && (
                  <a
                    href={feedbackConfig.feishuUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring tap-target grid place-items-center rounded-small border border-line p-s2 text-muted hover:text-ink"
                    title="在浏览器中测试打开"
                  >
                    <ExternalLink className="size-icon-small" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-s2 border-t border-line">
              <button
                type="button"
                onClick={() => saveConfig("article_feedback_config", feedbackConfig, "文章反馈配置保存成功")}
                disabled={savingKey === "article_feedback_config"}
                className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-brand px-s4 py-s2 text-label font-medium text-surface"
              >
                <Save className="size-icon-small" />
                <span>{savingKey === "article_feedback_config" ? "正在保存..." : "保存文章反馈配置"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: 目录二级分类 */}
      {activeTab === "groups" && (
        <div className="rounded-medium border border-line bg-surface p-s5 space-y-s4">
          <div className="border-b border-line pb-s3">
            <h3 className="text-label font-semibold text-ink">篇目二级分类与蓝色小标映射 (article_groups)</h3>
            <p className="text-caption text-muted mt-s1">
              定义每个大板块（如“学习”、“生活”）下各篇文章所属的二级分类小标（如“入学必看”、“考试”、“常识”等）
            </p>
          </div>

          <div className="space-y-s2">
            <label className="text-label font-medium text-ink">分类映射 JSON 配置</label>
            <textarea
              rows={12}
              value={articleGroupsJson}
              onChange={(e) => setArticleGroupsJson(e.target.value)}
              className="focus-ring w-full font-mono rounded-small border border-line bg-surface-subtle p-s3 text-caption text-ink"
            />
          </div>

          <div className="flex items-center justify-between border-t border-line pt-s4">
            <button
              type="button"
              onClick={() => setArticleGroupsJson(JSON.stringify(DEFAULT_ARTICLE_GROUPS_CONFIG, null, 2))}
              className="focus-ring tap-target flex items-center gap-s1 text-caption text-muted hover:text-ink transition-colors"
            >
              <RotateCcw className="size-icon-small" />
              <span>恢复默认分类映射</span>
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  const parsed = JSON.parse(articleGroupsJson);
                  saveConfig("article_groups", parsed, "二级分类配置保存成功");
                } catch {
                  setMessage({ type: "error", text: "JSON 格式有误，请核对后再保存" });
                }
              }}
              disabled={savingKey === "article_groups"}
              className="focus-ring tap-target flex items-center gap-s2 rounded-small bg-brand px-s4 py-s2 text-label font-medium text-surface hover:opacity-90 transition-opacity"
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
