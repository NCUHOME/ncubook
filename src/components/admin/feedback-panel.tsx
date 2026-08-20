// 组件：管理后台用户反馈监控与 Linear 风格工单化聚合系统 (FeedbackPanel)
// 支持按文章智能合并聚合、四级状态流转 (待处理/已解决/归档/忽略)、一键直通前台预览与 Notion 编辑
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Archive,
  Layers,
  List,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { getFeishuAdminWikiUrl } from "@/lib/feishu";
import type { FeedbackStatus } from "@/app/api/admin/feedbacks/route";

type FeedbackStats = {
  total: number;
  helpful: number;
  unhelpful: number;
  pending: number;
  resolved: number;
  archived: number;
  helpfulRate: string;
};

type FeedbackItem = {
  id: string;
  target_type: "article" | "answer";
  target_id: string;
  is_helpful: boolean;
  comment: string | null;
  created_at: string;
  status: FeedbackStatus;
  article_title: string;
  section_title?: string;
  route_path?: string;
  notion_url?: string;
};

type GroupedFeedbackIssue = {
  targetId: string;
  targetType: "article" | "answer";
  title: string;
  sectionTitle?: string;
  routePath?: string;
  notionUrl?: string;
  items: FeedbackItem[];
  helpfulCount: number;
  unhelpfulCount: number;
  pendingCount: number;
  latestAt: string;
  status: FeedbackStatus;
};

type FilterTab = "all" | "pending" | "resolved" | "archived" | "negative_only";

export function FeedbackPanel() {
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0,
    helpful: 0,
    unhelpful: 0,
    pending: 0,
    resolved: 0,
    archived: 0,
    helpfulRate: "100%",
  });
  const [list, setList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [filterTab, setFilterTab] = useState<FilterTab>("pending");
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchFeedbacks = () => {
    setLoading(true);
    fetch("/api/admin/feedbacks")
      .then((res) => res.json())
      .then((res) => {
        if (res?.ok) {
          if (res.stats) setStats(res.stats);
          if (Array.isArray(res.recent)) setList(res.recent);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // 工单状态变更
  const handleUpdateStatus = async (ids: string[], newStatus: FeedbackStatus) => {
    if (ids.length === 0) return;
    setActionLoadingId(ids.join(","));
    try {
      const res = await fetch("/api/admin/feedbacks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: newStatus }),
      });
      const data = await res.json();
      if (data?.ok) {
        setList((prev) =>
          prev.map((item) => (ids.includes(item.id) ? { ...item, status: newStatus } : item)),
        );
        setSelectedIds(new Set());
      }
    } catch {
      // 容错
    } finally {
      setActionLoadingId(null);
    }
  };

  // 聚合生成工单卡片
  const groupedIssues: GroupedFeedbackIssue[] = useMemo(() => {
    const map: Record<string, GroupedFeedbackIssue> = {};

    for (const item of list) {
      const key = `${item.target_type}-${item.target_id}`;
      if (!map[key]) {
        map[key] = {
          targetId: item.target_id,
          targetType: item.target_type,
          title: item.article_title || item.target_id,
          sectionTitle: item.section_title,
          routePath: item.route_path,
          notionUrl: item.notion_url,
          items: [],
          helpfulCount: 0,
          unhelpfulCount: 0,
          pendingCount: 0,
          latestAt: item.created_at,
          status: item.status,
        };
      }

      map[key].items.push(item);
      if (item.is_helpful) map[key].helpfulCount++;
      else map[key].unhelpfulCount++;

      if (item.status === "pending" && !item.is_helpful) {
        map[key].pendingCount++;
        map[key].status = "pending";
      }

      if (new Date(item.created_at) > new Date(map[key].latestAt)) {
        map[key].latestAt = item.created_at;
      }
    }

    return Object.values(map).sort(
      (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
    );
  }, [list]);

  // 过滤后的工单
  const filteredIssues = useMemo(() => {
    return groupedIssues.filter((issue) => {
      if (filterTab === "pending") return issue.items.some((i) => i.status === "pending" && !i.is_helpful);
      if (filterTab === "resolved") return issue.items.every((i) => i.status === "resolved");
      if (filterTab === "archived") return issue.items.every((i) => i.status === "archived");
      if (filterTab === "negative_only") return issue.unhelpfulCount > 0;
      return true;
    });
  }, [groupedIssues, filterTab]);

  // 过滤后的明细列表
  const filteredFlatList = useMemo(() => {
    return list.filter((item) => {
      if (filterTab === "pending") return item.status === "pending" && !item.is_helpful;
      if (filterTab === "resolved") return item.status === "resolved";
      if (filterTab === "archived") return item.status === "archived";
      if (filterTab === "negative_only") return !item.is_helpful;
      return true;
    });
  }, [list, filterTab]);

  const toggleExpand = (targetKey: string) => {
    setExpandedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(targetKey)) next.delete(targetKey);
      else next.add(targetKey);
      return next;
    });
  };

  return (
    <div className="space-y-s6">
      {/* 顶部标题与快速操作 */}
      <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line pb-s4">
        <div>
          <div className="flex items-center gap-s2">
            <MessageSquare className="size-icon text-brand" />
            <h2 className="text-title font-semibold text-ink">用户反馈与好评监控工单</h2>
          </div>
          <p className="text-caption text-muted mt-s1">
            聚合学生对各篇指南与 AI 问答的有用性反馈，支持工单归档、一键学生端核对与 Notion 编辑
          </p>
        </div>
        <div className="flex items-center gap-s2">
          <a
            href={getFeishuAdminWikiUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring tap-target flex items-center gap-s1 rounded-small border border-line px-s3 py-s2 text-caption font-medium text-brand hover:bg-brand-tint transition-colors"
          >
            <span>飞书 Wiki 反馈表</span>
            <ExternalLink className="size-icon-small" />
          </a>
          <button
            type="button"
            onClick={fetchFeedbacks}
            disabled={loading}
            className="focus-ring tap-target flex items-center gap-s1 rounded-small bg-surface border border-line px-s3 py-s2 text-caption font-medium text-ink hover:bg-surface-subtle transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`size-icon-small ${loading ? "animate-spin text-brand" : ""}`} />
            <span>{loading ? "正在刷新..." : "刷新"}</span>
          </button>
        </div>
      </div>

      {/* 4 大核心统计指标卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-s4">
        <div className="rounded-medium border border-line bg-surface p-s4 space-y-s1">
          <span className="text-caption text-muted">总收集反馈</span>
          <div className="text-display font-bold text-ink">{stats.total}</div>
          <span className="text-caption text-muted">包含文章与 AI 问答</span>
        </div>
        <div className="rounded-medium border border-line bg-brand-tint p-s4 space-y-s1">
          <span className="text-caption text-brand">总体好评率</span>
          <div className="text-display font-bold text-brand">{stats.helpfulRate}</div>
          <span className="text-caption text-brand font-medium">学生满意度</span>
        </div>
        <div className="rounded-medium border border-danger bg-danger-bg p-s4 space-y-s1">
          <div className="flex items-center justify-between text-danger">
            <span className="text-caption font-semibold">待处理差评 (待修正)</span>
            <ThumbsDown className="size-icon-small" />
          </div>
          <div className="text-display font-bold text-danger">{stats.unhelpful}</div>
          <span className="text-caption text-danger">急需去 Notion 核对</span>
        </div>
        <div className="rounded-medium border border-line bg-surface p-s4 space-y-s1">
          <div className="flex items-center justify-between text-brand">
            <span className="text-caption font-medium">有用点赞</span>
            <ThumbsUp className="size-icon-small" />
          </div>
          <div className="text-display font-bold text-ink">{stats.helpful}</div>
          <span className="text-caption text-muted">内容质量符合预期</span>
        </div>
      </div>

      {/* 工单视图与过滤控制器 */}
      <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line pb-s3">
        {/* 状态分类标签 Tab */}
        <div className="flex items-center gap-s2 overflow-x-auto no-scrollbar">
          {[
            { key: "pending", label: "待处理 (需优化)", count: stats.unhelpful },
            { key: "all", label: "全部反馈", count: stats.total },
            { key: "resolved", label: "已标记解决", count: stats.resolved },
            { key: "archived", label: "已归档", count: stats.archived },
            { key: "negative_only", label: "仅看差评", count: stats.unhelpful },
          ].map((tab) => {
            const isActive = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterTab(tab.key as FilterTab)}
                className={`focus-ring rounded-pill px-s3 py-s1 text-caption font-medium transition-colors shrink-0 ${
                  isActive
                    ? "bg-ink text-surface shadow-subtle"
                    : "bg-surface-subtle text-muted hover:text-ink"
                }`}
              >
                {tab.label} {tab.count !== undefined ? `(${tab.count})` : ""}
              </button>
            );
          })}
        </div>

        {/* 聚合视图 / 单条流水 切换 */}
        <div className="flex items-center gap-s1 rounded-small border border-line bg-surface-subtle p-s1">
          <button
            type="button"
            onClick={() => setViewMode("grouped")}
            className={`flex items-center gap-s1 rounded-small px-s2.5 py-s1 text-caption font-medium transition-colors ${
              viewMode === "grouped" ? "bg-surface text-ink shadow-subtle" : "text-muted hover:text-ink"
            }`}
          >
            <Layers className="size-icon-small" />
            <span>按文章聚合</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("flat")}
            className={`flex items-center gap-s1 rounded-small px-s2.5 py-s1 text-caption font-medium transition-colors ${
              viewMode === "flat" ? "bg-surface text-ink shadow-subtle" : "text-muted hover:text-ink"
            }`}
          >
            <List className="size-icon-small" />
            <span>明细流水</span>
          </button>
        </div>
      </div>

      {/* 批量操作工具条（当有选中时展示） */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-medium bg-brand-tint border border-brand p-s3">
          <span className="text-caption font-semibold text-brand">已选中 {selectedIds.size} 条反馈</span>
          <div className="flex items-center gap-s2">
            <button
              type="button"
              onClick={() => handleUpdateStatus(Array.from(selectedIds), "resolved")}
              className="focus-ring rounded-small bg-brand px-s3 py-s1 text-caption font-semibold text-surface hover:bg-brand-dark transition-colors"
            >
              批量标记为已解决
            </button>
            <button
              type="button"
              onClick={() => handleUpdateStatus(Array.from(selectedIds), "archived")}
              className="focus-ring rounded-small border border-line bg-surface px-s3 py-s1 text-caption font-medium text-ink hover:bg-surface-subtle transition-colors"
            >
              批量归档
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-caption text-muted hover:underline"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 视图 1：Linear 风格聚合工单卡片 */}
      {viewMode === "grouped" && (
        <div className="space-y-s4">
          {filteredIssues.length === 0 ? (
            <div className="rounded-medium border border-line bg-surface p-s8 text-center text-muted">
              <CheckCircle2 className="size-icon mx-auto mb-s2 text-brand" />
              <p className="text-body font-medium text-ink">当前分类下暂无待处理工单</p>
              <p className="text-caption text-muted mt-s1">校园指南运行良好，点赞反馈将实时同步</p>
            </div>
          ) : (
            filteredIssues.map((issue) => {
              const targetKey = `${issue.targetType}-${issue.targetId}`;
              const isExpanded = expandedTargets.has(targetKey);
              const allItemIds = issue.items.map((i) => i.id);

              return (
                <div
                  key={targetKey}
                  className="rounded-medium border border-line bg-surface overflow-hidden transition-shadow hover:shadow-subtle"
                >
                  {/* 工单卡片头部 */}
                  <div className="flex flex-wrap items-center justify-between gap-s3 p-s4 border-b border-line bg-surface">
                    <div className="space-y-s1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-s2">
                        {issue.targetType === "article" ? (
                          <span className="rounded-pill bg-brand-tint border border-brand px-s2 py-s1 text-caption font-bold text-brand">
                            文章
                          </span>
                        ) : (
                          <span className="rounded-pill bg-surface-subtle border border-line px-s2 py-s1 text-caption font-bold text-brand">
                            AI 智能问答
                          </span>
                        )}

                        <span className="text-body-large font-bold text-ink truncate">
                          {issue.title}
                        </span>

                        {issue.sectionTitle && (
                          <span className="text-caption text-muted bg-surface-subtle border border-line rounded-pill px-s2 py-s1">
                            {issue.sectionTitle}
                          </span>
                        )}

                        <span className="text-caption text-muted font-mono">
                          ({issue.targetId})
                        </span>
                      </div>

                      <div className="flex items-center gap-s3 text-caption text-muted">
                        <span className="flex items-center gap-s1">
                          <Clock className="size-icon-small" />
                          最新：
                          {new Date(issue.latestAt).toLocaleString("zh-CN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                          })}
                        </span>
                        <span>·</span>
                        <span className="text-danger font-semibold flex items-center gap-s1">
                          <ThumbsDown className="size-icon-small" /> {issue.unhelpfulCount} 次没帮助
                        </span>
                        {issue.helpfulCount > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-brand font-medium flex items-center gap-s1">
                              <ThumbsUp className="size-icon-small" /> {issue.helpfulCount} 次点赞
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 工单操作按钮组 */}
                    <div className="flex items-center gap-s2 shrink-0">
                      {issue.routePath && (
                        <a
                          href={issue.routePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring tap-target flex items-center gap-s1 rounded-small border border-line px-s2.5 py-s1.5 text-caption font-medium text-ink hover:bg-surface-subtle transition-colors"
                          title="在学生端新标签页打开预览"
                        >
                          <FileText className="size-icon-small text-muted" />
                          <span>学生端预览 ↗</span>
                        </a>
                      )}

                      {issue.notionUrl && (
                        <a
                          href={issue.notionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring tap-target flex items-center gap-s1 rounded-small border border-line px-s2.5 py-s1.5 text-caption font-medium text-brand hover:bg-brand-tint transition-colors"
                          title="前往 Notion 编辑源直接修改"
                        >
                          <Sparkles className="size-icon-small" />
                          <span>Notion 编辑 ↗</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(allItemIds, "resolved")}
                        disabled={actionLoadingId !== null}
                        className="focus-ring tap-target flex items-center gap-s1 rounded-small bg-brand px-s3 py-s1.5 text-caption font-semibold text-surface hover:bg-brand-dark transition-colors"
                      >
                        <CheckCircle2 className="size-icon-small" />
                        <span>标记已解决</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(allItemIds, "archived")}
                        disabled={actionLoadingId !== null}
                        className="focus-ring tap-target flex items-center gap-s1 rounded-small border border-line px-s2.5 py-s1.5 text-caption font-medium text-muted hover:text-ink hover:bg-surface-subtle transition-colors"
                      >
                        <Archive className="size-icon-small" />
                        <span>归档</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(targetKey)}
                        className="focus-ring tap-target grid place-items-center rounded-round text-muted hover:text-ink hover:bg-surface-subtle p-s1"
                        aria-label="展开明细"
                      >
                        {isExpanded ? <ChevronUp className="size-icon" /> : <ChevronDown className="size-icon" />}
                      </button>
                    </div>
                  </div>

                  {/* 展开的单条反馈明细列表 */}
                  {isExpanded && (
                    <div className="bg-surface-subtle p-s4 divide-y divide-line">
                      <div className="text-caption font-semibold text-muted pb-s2">
                        共有 {issue.items.length} 条具体反馈记录：
                      </div>
                      {issue.items.map((item) => (
                        <div key={item.id} className="py-s2.5 flex items-start justify-between gap-s3">
                          <div className="space-y-s1">
                            <div className="flex items-center gap-s2">
                              <span
                                className={`text-caption font-bold flex items-center gap-s1 ${
                                  item.is_helpful ? "text-brand" : "text-danger"
                                }`}
                              >
                                {item.is_helpful ? (
                                  <ThumbsUp className="size-icon-small" />
                                ) : (
                                  <ThumbsDown className="size-icon-small" />
                                )}
                                {item.is_helpful ? "点赞" : "没帮助"}
                              </span>
                              <span className="text-caption text-muted">
                                状态：
                                {item.status === "resolved"
                                  ? "已解决"
                                  : item.status === "archived"
                                  ? "已归档"
                                  : "待处理"}
                              </span>
                            </div>
                            {item.comment ? (
                              <p className="text-body text-ink bg-surface border border-line p-s2 rounded-small">
                                学生留言：{item.comment}
                              </p>
                            ) : (
                              <p className="text-caption text-muted italic">（未填写文字留言）</p>
                            )}
                          </div>
                          <span className="text-caption text-muted shrink-0">
                            {new Date(item.created_at).toLocaleString("zh-CN", {
                              month: "numeric",
                              day: "numeric",
                              hour: "numeric",
                              minute: "numeric",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 视图 2：单条明细流水列表 */}
      {viewMode === "flat" && (
        <div className="rounded-medium border border-line bg-surface overflow-hidden">
          {filteredFlatList.length === 0 ? (
            <p className="text-body text-muted py-s6 text-center">暂无匹配的单条记录</p>
          ) : (
            <div className="divide-y divide-line">
              {filteredFlatList.map((item) => (
                <div
                  key={item.id}
                  className="p-s3.5 flex flex-wrap items-start justify-between gap-s3 hover:bg-surface-subtle transition-colors"
                >
                  <div className="space-y-s1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-s2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(item.id);
                            else next.delete(item.id);
                            return next;
                          });
                        }}
                        className="rounded border-line text-brand focus:ring-brand mr-s1"
                      />
                      <span className="text-caption font-bold px-s2 py-s1 rounded-pill bg-surface-subtle border border-line text-muted">
                        {item.target_type === "article" ? "文章" : "AI 问答"}
                      </span>
                      <strong className="text-body font-semibold text-ink">{item.article_title}</strong>
                      <span
                        className={`text-caption font-semibold flex items-center gap-s1 ${
                          item.is_helpful ? "text-brand" : "text-danger"
                        }`}
                      >
                        {item.is_helpful ? (
                          <ThumbsUp className="size-icon-small" />
                        ) : (
                          <ThumbsDown className="size-icon-small" />
                        )}
                        {item.is_helpful ? "有帮助" : "没帮助"}
                      </span>
                    </div>
                    {item.comment && (
                      <p className="text-body text-ink-sub bg-surface-subtle border border-line p-s2 rounded-small">
                        {item.comment}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-s2 shrink-0">
                    <span className="text-caption text-muted">
                      {new Date(item.created_at).toLocaleString("zh-CN", {
                        month: "numeric",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                      })}
                    </span>
                    {item.route_path && (
                      <a
                        href={item.route_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-caption text-brand hover:underline"
                      >
                        查看 ↗
                      </a>
                    )}
                    {item.notion_url && (
                      <a
                        href={item.notion_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-caption text-brand hover:underline"
                      >
                        Notion ↗
                      </a>
                    )}
                    {item.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus([item.id], "resolved")}
                        className="focus-ring rounded-small border border-line px-s2 py-s1 text-caption text-brand hover:bg-brand-tint"
                      >
                        标记已解决
                      </button>
                    ) : (
                      <span className="text-caption text-muted">
                        {item.status === "resolved" ? "已解决" : "已归档"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
