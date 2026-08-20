// 组件：管理后台全站埋点数据与运营洞察大盘 (AnalyticsDashboard)
// 支持文章中文名解析、一键直通前台/Notion、学生搜索零结果预警与人性化学生轨迹流水
"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Bot,
  Copy,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  Eye,
  CheckCircle2,
} from "lucide-react";
import type { AnalyticsSummary } from "@/lib/analytics/types";

export function AnalyticsDashboard({ initialSummary }: { initialSummary?: AnalyticsSummary } = {}) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(initialSummary || null);
  const [loading, setLoading] = useState(!initialSummary);

  const fetchAnalytics = () => {
    setLoading(true);
    fetch("/api/admin/analytics")
      .then((res) => res.json())
      .then((res) => {
        if (res?.ok && res?.data) {
          setSummary(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!initialSummary) {
      fetchAnalytics();
    }
  }, [initialSummary]);

  if (loading && !summary) {
    return (
      <div className="rounded-medium border border-line bg-surface p-s6 text-center text-muted">
        <RefreshCw className="size-icon animate-spin mx-auto mb-s2 text-brand" />
        <p className="text-body">正在汇总全站埋点数据与学生行为画像...</p>
      </div>
    );
  }

  const data: AnalyticsSummary = summary || {
    todayPv: 0,
    todayUv: 0,
    totalSearches: 0,
    zeroResultSearches: 0,
    totalAiAsks: 0,
    totalContactCopies: 0,
    topArticles: [],
    topSearchQueries: [],
    zeroResultQueries: [],
    recentEvents: [],
  };

  const maxViews = data.topArticles[0]?.views || 1;

  return (
    <div className="space-y-s6">
      {/* 顶部指标卡片 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title font-semibold text-ink">全站数据洞察与埋点大盘</h2>
          <p className="text-caption text-muted mt-s1">实时统计学生访问热度、搜索诉求与 AI 问答交互</p>
        </div>
        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={loading}
          className="focus-ring tap-target flex items-center gap-s1 rounded-small border border-line px-s3 py-s2 text-caption font-medium hover:bg-surface-subtle transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`size-icon-small ${loading ? "animate-spin text-brand" : ""}`} />
          <span>{loading ? "正在刷新..." : "刷新数据"}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-s4">
        <div className="rounded-medium border border-line bg-surface p-s4 space-y-s2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-caption font-medium">今日访问 (PV / UV)</span>
            <Users className="size-icon-small text-brand" />
          </div>
          <div className="flex items-baseline gap-s2">
            <strong className="text-display font-semibold text-ink">{data.todayPv}</strong>
            <span className="text-caption text-muted">/ {data.todayUv} 人</span>
          </div>
          <span className="text-caption text-brand flex items-center gap-s1">
            <TrendingUp className="size-icon-small" /> 实时活跃
          </span>
        </div>

        <div className="rounded-medium border border-line bg-surface p-s4 space-y-s2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-caption font-medium">搜索使用总量</span>
            <Search className="size-icon-small text-brand" />
          </div>
          <div className="flex items-baseline gap-s2">
            <strong className="text-display font-semibold text-ink">{data.totalSearches}</strong>
            <span className="text-caption text-muted">次</span>
          </div>
          {data.zeroResultSearches > 0 ? (
            <span className="text-caption text-danger flex items-center gap-s1">
              <AlertTriangle className="size-icon-small" /> {data.zeroResultSearches} 次未搜到
            </span>
          ) : (
            <span className="text-caption text-muted">全部命中匹配</span>
          )}
        </div>

        <div className="rounded-medium border border-line bg-surface p-s4 space-y-s2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-caption font-medium">AI 问答提问量</span>
            <Bot className="size-icon-small text-brand" />
          </div>
          <div className="flex items-baseline gap-s2">
            <strong className="text-display font-semibold text-ink">{data.totalAiAsks}</strong>
            <span className="text-caption text-muted">次</span>
          </div>
          <span className="text-caption text-muted">知识库精准答复</span>
        </div>

        <div className="rounded-medium border border-line bg-surface p-s4 space-y-s2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-caption font-medium">电话/服务复制转化</span>
            <Copy className="size-icon-small text-brand" />
          </div>
          <div className="flex items-baseline gap-s2">
            <strong className="text-display font-semibold text-ink">{data.totalContactCopies}</strong>
            <span className="text-caption text-muted">次</span>
          </div>
          <span className="text-caption text-brand">高实用价值触达</span>
        </div>
      </div>

      {/* 核心双列分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-s6">
        {/* 1. 热门阅读篇目 TOP 10（带真实中文名、分类与一键跳转） */}
        <div className="rounded-medium border border-line bg-surface p-s5 space-y-s4">
          <div className="flex items-center justify-between border-b border-line pb-s3">
            <div className="flex items-center gap-s2">
              <FileText className="size-icon text-brand" />
              <h3 className="text-label font-semibold text-ink">热门阅读篇目 TOP 10</h3>
            </div>
            <span className="text-caption text-muted">学生关注度最高</span>
          </div>

          {data.topArticles.length === 0 ? (
            <p className="text-caption text-muted py-s4 text-center">暂无文章访问记录，学生访问后将实时更新</p>
          ) : (
            <div className="space-y-s3.5">
              {data.topArticles.map((art, idx) => (
                <div key={art.slug} className="space-y-s1.5 p-s2 rounded-small hover:bg-surface-subtle transition-colors">
                  <div className="flex items-center justify-between text-body">
                    <div className="flex items-center gap-s2 truncate min-w-0">
                      <span className="text-caption font-bold text-muted w-s4 shrink-0">{idx + 1}.</span>
                      <strong className="font-semibold text-ink truncate">
                        {art.title || art.slug}
                      </strong>
                      {art.sectionTitle && (
                        <span className="text-caption text-muted bg-surface border border-line rounded-pill px-s2 py-s1 shrink-0">
                          {art.sectionTitle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-s2 shrink-0 ml-s2">
                      <span className="text-caption font-semibold text-brand">{art.views} 次</span>
                      {art.routePath && (
                        <a
                          href={art.routePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-caption text-muted hover:text-brand transition-colors"
                          title="在学生端新标签页查看"
                        >
                          <ExternalLink className="size-icon-small" />
                        </a>
                      )}
                      {art.notionUrl && (
                        <a
                          href={art.notionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-caption text-brand hover:underline"
                          title="在 Notion 中编辑"
                        >
                          <Sparkles className="size-icon-small" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="h-s1 w-full rounded-pill bg-line-light overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-pill transition-all"
                      style={{ width: `${Math.max(8, Math.round((art.views / maxViews) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. 搜索诉求洞察与零结果词预警 */}
        <div className="rounded-medium border border-line bg-surface p-s5 space-y-s4">
          <div className="flex items-center justify-between border-b border-line pb-s3">
            <div className="flex items-center gap-s2">
              <Search className="size-icon text-brand" />
              <h3 className="text-label font-semibold text-ink">学生搜索热词与零结果预警</h3>
            </div>
            <span className="text-caption text-muted">选题反哺与内容补充</span>
          </div>

          {/* 零结果词重点提示 */}
          {data.zeroResultQueries.length > 0 && (
            <div className="rounded-small border border-danger bg-danger-bg p-s3 space-y-s2">
              <div className="flex items-center gap-s2 text-danger font-semibold text-caption">
                <AlertTriangle className="size-icon-small" />
                <span>搜不到的关键词（急需在 Notion 中补充对应内容）</span>
              </div>
              <div className="flex flex-wrap gap-s2">
                {data.zeroResultQueries.map((zq) => (
                  <span
                    key={zq.query}
                    className="inline-flex items-center gap-s1 rounded-pill bg-surface border border-danger px-s2 py-s1 text-caption font-medium text-danger"
                  >
                    <span>{zq.query}</span>
                    <span className="opacity-70 text-caption">({zq.count}次)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 高频搜索词列表 */}
          <div>
            <span className="text-caption text-muted block mb-s2">高频搜索关键词排行：</span>
            {data.topSearchQueries.length === 0 ? (
              <p className="text-caption text-muted py-s4 text-center">暂无搜索记录</p>
            ) : (
              <div className="flex flex-wrap gap-s2">
                {data.topSearchQueries.map((q) => (
                  <span
                    key={q.query}
                    className={`inline-flex items-center gap-s1 rounded-pill px-s3 py-s1 text-caption font-medium border ${
                      q.zeroResult
                        ? "border-danger bg-danger-bg text-danger"
                        : "border-line bg-surface-subtle text-ink"
                    }`}
                  >
                    <span>{q.query}</span>
                    <span className="text-muted text-caption">· {q.count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 实时埋点流水日志（可视化学生行为流） */}
      <div className="rounded-medium border border-line bg-surface p-s5 space-y-s3">
        <div className="flex items-center justify-between border-b border-line pb-s3">
          <div className="flex items-center gap-s2">
            <Clock className="size-icon text-muted" />
            <h3 className="text-label font-semibold text-ink">最近实时学生行为流水</h3>
          </div>
          <span className="text-caption text-muted">最近 50 条学生端行为</span>
        </div>

        {data.recentEvents.length === 0 ? (
          <p className="text-caption text-muted py-s4 text-center">暂无埋点流水记录</p>
        ) : (
          <div className="divide-y divide-line max-h-96 overflow-y-auto text-caption">
            {data.recentEvents.map((ev) => {
              const d = (ev.eventData || {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

              return (
                <div key={ev.id} className="py-s2.5 flex items-center justify-between gap-s4 hover:bg-surface-subtle px-s2 rounded-small transition-colors">
                  <div className="flex items-center gap-s2 truncate min-w-0">
                    {ev.eventName === "page_view" && (
                      <span className="inline-flex items-center gap-s1 rounded-pill bg-brand-tint border border-brand px-s2 py-s1 text-caption font-bold text-brand shrink-0">
                        <Eye className="size-icon-small" />
                        <span>浏览</span>
                      </span>
                    )}
                    {ev.eventName === "search_query" && (
                      <span className="inline-flex items-center gap-s1 rounded-pill bg-brand text-surface px-s2 py-s1 text-caption font-bold shrink-0">
                        <Search className="size-icon-small" />
                        <span>搜索</span>
                      </span>
                    )}
                    {ev.eventName === "ai_ask_submitted" && (
                      <span className="inline-flex items-center gap-s1 rounded-pill bg-surface-subtle border border-line px-s2 py-s1 text-caption font-bold text-brand shrink-0">
                        <Bot className="size-icon-small" />
                        <span>AI 提问</span>
                      </span>
                    )}
                    {ev.eventName === "contact_copied" && (
                      <span className="inline-flex items-center gap-s1 rounded-pill bg-brand-tint border border-brand px-s2 py-s1 text-caption font-bold text-brand shrink-0">
                        <Copy className="size-icon-small" />
                        <span>复制</span>
                      </span>
                    )}
                    {ev.eventName === "article_read_complete" && (
                      <span className="inline-flex items-center gap-s1 rounded-pill bg-surface-subtle border border-line px-s2 py-s1 text-caption font-bold text-ink shrink-0">
                        <CheckCircle2 className="size-icon-small" />
                        <span>读完</span>
                      </span>
                    )}

                    {/* 可读化行为描述 */}
                    <div className="text-ink truncate">
                      {ev.eventName === "page_view" && (
                        <span>
                          {ev.resolvedTitle === "首页" || d.path === "/" || d.pageTitle === "首页" ? (
                            <span>学生访问了 <strong className="font-semibold text-ink">首页</strong></span>
                          ) : (
                            <span>
                              学生阅读了指南{" "}
                              <strong className="font-semibold text-ink">
                                《{ev.resolvedTitle || d.pageTitle || "校园指南"}》
                              </strong>
                              {ev.resolvedSection && <span className="text-muted"> ({ev.resolvedSection})</span>}
                            </span>
                          )}
                          {d.device && <span className="text-muted font-mono"> · {d.device}</span>}
                        </span>
                      )}

                      {ev.eventName === "search_query" && (
                        <span>
                          搜索了「<strong className="font-semibold text-ink">{d.query}</strong>」，匹配到{" "}
                          <span className={d.resultCount === 0 ? "text-danger font-bold" : "text-brand"}>
                            {d.resultCount}
                          </span>{" "}
                          条结果
                        </span>
                      )}

                      {ev.eventName === "ai_ask_submitted" && (
                        <span>
                          向 AI 询问「<strong className="font-semibold text-ink">{d.questionPreview}</strong>」
                        </span>
                      )}

                      {ev.eventName === "contact_copied" && (
                        <span>
                          复制了联系方式 <strong className="font-semibold text-ink">{d.label || d.value}</strong>
                        </span>
                      )}

                      {ev.eventName === "article_read_complete" && (
                        <span>
                          完整读完了《<strong>{ev.resolvedTitle || d.pageTitle || d.slug}</strong>》
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-s2 shrink-0">
                    {ev.routePath && (
                      <a
                        href={ev.routePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-caption text-brand hover:underline"
                      >
                        预览 ↗
                      </a>
                    )}
                    <span className="text-muted text-caption">
                      {new Date(ev.createdAt).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
