// 组件：管理后台用户反馈监控大盘（好评率、反馈列表、直通飞书 Wiki）
"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, ExternalLink, RefreshCw } from "lucide-react";
import { getFeishuAdminWikiUrl } from "@/lib/feishu";

type FeedbackStats = {
  total: number;
  helpful: number;
  unhelpful: number;
  helpfulRate: string;
};

type FeedbackItem = {
  id: string;
  target_type: "article" | "answer";
  target_id: string;
  is_helpful: boolean;
  comment: string | null;
  created_at: string;
};

export function FeedbackPanel() {
  const [stats, setStats] = useState<FeedbackStats>({ total: 0, helpful: 0, unhelpful: 0, helpfulRate: "100%" });
  const [list, setList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFeedbacks = () => {
    setLoading(true);
    fetch("/api/admin/feedbacks")
      .then((res) => res.json())
      .then((res) => {
        if (res.ok) {
          if (res.stats) setStats(res.stats);
          if (Array.isArray(res.recent)) setList(res.recent);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  return (
    <div className="rounded-medium border border-line bg-surface p-s5 space-y-s5">
      <div className="flex items-center justify-between border-b border-line pb-s3">
        <div className="flex items-center gap-s2">
          <MessageSquare className="size-icon text-brand" />
          <h2 className="text-title font-semibold">用户反馈与好评监控</h2>
        </div>
        <div className="flex items-center gap-s2">
          <a
            href={getFeishuAdminWikiUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring tap-target flex items-center gap-s1 rounded-small border border-line px-s3 py-s2 text-label font-medium text-brand hover:bg-brand-tint transition-colors"
          >
            <span>飞书 Wiki 反馈库</span>
            <ExternalLink className="size-icon-small" />
          </a>
          <button
            type="button"
            onClick={fetchFeedbacks}
            disabled={loading}
            className="focus-ring tap-target flex items-center gap-s1 rounded-small bg-surface-subtle border border-line px-s3 py-s2 text-label font-medium hover:bg-line transition-colors"
          >
            <RefreshCw className={`size-icon-small ${loading ? "animate-spin" : ""}`} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 好评率核心指标卡 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-s4">
        <div className="rounded-small border border-line bg-surface-subtle p-s4">
          <div className="text-caption text-muted">总反馈数</div>
          <div className="mt-s1 text-heading font-bold text-ink">{stats.total}</div>
        </div>
        <div className="rounded-small border border-line bg-brand-tint p-s4">
          <div className="text-caption text-brand">总体好评率</div>
          <div className="mt-s1 text-heading font-bold text-brand">{stats.helpfulRate}</div>
        </div>
        <div className="rounded-small border border-line bg-surface-subtle p-s4">
          <div className="text-caption text-muted flex items-center gap-s1">
            <ThumbsUp className="size-icon-small text-brand" />
            <span>有帮助 (点赞)</span>
          </div>
          <div className="mt-s1 text-heading font-bold text-ink">{stats.helpful}</div>
        </div>
        <div className="rounded-small border border-line bg-surface-subtle p-s4">
          <div className="text-caption text-muted flex items-center gap-s1">
            <ThumbsDown className="size-icon-small text-danger" />
            <span>没帮助 (待改进)</span>
          </div>
          <div className="mt-s1 text-heading font-bold text-danger">{stats.unhelpful}</div>
        </div>
      </div>

      {/* 最近反馈明细列表 */}
      <div className="space-y-s3">
        <h3 className="text-label font-semibold text-ink">最近用户反馈记录 (前 50 条)</h3>
        {list.length === 0 ? (
          <p className="text-body text-muted py-s4 text-center">暂无用户反馈数据</p>
        ) : (
          <div className="divide-y divide-line border border-line rounded-small overflow-hidden">
            {list.map((item) => (
              <div key={item.id} className="p-s3 flex items-start justify-between bg-surface hover:bg-surface-subtle transition-colors">
                <div className="space-y-s1">
                  <div className="flex items-center gap-s2">
                    <span className="text-caption font-medium px-s2 py-s1 rounded-pill bg-surface-subtle border border-line text-muted">
                      {item.target_type === "article" ? "文章" : "AI 问答"}
                    </span>
                    <span className="text-body font-medium text-ink">{item.target_id}</span>
                    <span className={`text-caption font-semibold flex items-center gap-s1 ${item.is_helpful ? "text-brand" : "text-danger"}`}>
                      {item.is_helpful ? <ThumbsUp className="size-icon-small" /> : <ThumbsDown className="size-icon-small" />}
                      {item.is_helpful ? "有帮助" : "没帮助"}
                    </span>
                  </div>
                  {item.comment && <p className="text-body text-ink-sub pl-s1">💬 {item.comment}</p>}
                </div>
                <span className="text-caption text-muted shrink-0">
                  {new Date(item.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
