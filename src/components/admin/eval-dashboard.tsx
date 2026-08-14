// 组件：AI 问答质量评测看板 (EvalDashboard)，对标 LangSmith / Dify 行业标准
"use client";

import { useState } from "react";
import {
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Clock,
  HelpCircle,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import type { EvaluationReport } from "@/scripts/eval";

type EvalDashboardProps = {
  initialReport?: EvaluationReport | null;
};

export function EvalDashboard({ initialReport = null }: EvalDashboardProps) {
  const [report, setReport] = useState<EvaluationReport | null>(initialReport);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("全部");
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runEvaluation = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/evals/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isMock }),
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        report?: EvaluationReport;
        error?: string;
      } | null;

      if (!res.ok || !data?.ok || !data.report) {
        throw new Error(data?.error ?? `评测失败 (HTTP ${res.status})`);
      }

      setReport(data.report);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "评测执行异常");
    } finally {
      setLoading(false);
    }
  };

  const details = report?.details ?? [];
  const categories = ["全部", ...Array.from(new Set(details.map((d) => d.category)))];

  const filteredDetails = details.filter((item) => {
    if (activeCategory === "仅看未通过") return !item.isPass;
    if (activeCategory === "全部") return true;
    return item.category === activeCategory;
  });

  const failCount = details.filter((d) => !d.isPass).length;

  return (
    <section className="space-y-s5">
      {/* 1. 顶部控制栏 */}
      <div className="flex flex-col gap-s3 sm:flex-row sm:items-center sm:justify-between rounded-medium border border-line bg-surface p-s5 shadow-subtle">
        <div>
          <div className="flex items-center gap-s2">
            <Sparkles className="size-icon" />
            <h2 className="font-display text-title font-semibold">AI 问答质量评测看板</h2>
          </div>
          <p className="mt-s1 text-caption leading-ui text-muted">
            基于真实南大知识库 35+ 题黄金事实基准，量化出处归因率、拒答率、事实符合率与防幻觉能力
          </p>
        </div>

        <div className="flex items-center gap-s3 flex-wrap">
          {/* 模式选择 */}
          <label className="flex items-center gap-s2 cursor-pointer text-caption text-muted hover:text-ink transition-colors">
            <input
              type="checkbox"
              checked={isMock}
              onChange={(e) => setIsMock(e.target.checked)}
              className="rounded-small border-line"
            />
            <span className="font-medium">基准模式 (离线秒级)</span>
          </label>

          <button
            type="button"
            onClick={runEvaluation}
            disabled={loading}
            className="focus-ring tap-target flex items-center justify-center gap-s2 rounded-small bg-ink px-s5 py-s2 text-label font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="size-icon animate-spin" /> : <Play className="size-icon" />}
            {loading ? "正在运行评测..." : "运行全量评测"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-s2 rounded-small border border-line bg-surface-subtle p-s4 text-label text-ink">
          <AlertCircle className="size-icon-small flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. 四维核心指标卡片 */}
      {report && (
        <div className="grid grid-cols-2 gap-s3 sm:grid-cols-4">
          <MetricCard
            title="出处归因合规率"
            value={`${Math.round(report.metrics.citationValidity * 100)}%`}
            target="目标 100%"
            status={report.metrics.citationValidity >= report.thresholds.citationValidity ? "success" : "failed"}
            subtext="每个事实均绑定稳定锚点"
          />
          <MetricCard
            title="未知与风控拒答率"
            value={`${Math.round(report.metrics.abstentionAccuracy * 100)}%`}
            target="目标 100%"
            status={report.metrics.abstentionAccuracy >= report.thresholds.abstentionAccuracy ? "success" : "failed"}
            subtext="无知识/越界问题严格拒答"
          />
          <MetricCard
            title="黄金事实符合率"
            value={`${Math.round(report.metrics.factualityRate * 100)}%`}
            target="目标 100%"
            status={report.metrics.factualityRate >= report.thresholds.factualityRate ? "success" : "failed"}
            subtext="核心数字/流程无遗漏"
          />
          <MetricCard
            title="P95 响应延迟"
            value={`${Math.round(report.metrics.p95LatencyMs)}ms`}
            target="标准 < 5000ms"
            status={report.metrics.p95LatencyMs <= report.thresholds.p95LatencyMs ? "success" : "failed"}
            subtext={`总用例: ${report.metrics.passCount}/${report.metrics.totalCount} 通过`}
          />
        </div>
      )}

      {/* 3. 评测用例列表与分类筛选 */}
      <div className="rounded-medium border border-line bg-surface p-s5 shadow-subtle">
        <div className="flex flex-col gap-s3 border-b border-line pb-s4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-s2">
            <Filter className="size-icon-small" />
            <h3 className="font-display text-body font-semibold">评测用例明细与判定</h3>
            {report && (
              <span className="rounded-small bg-surface-subtle px-s2 py-s1 text-caption font-mono text-muted">
                共 {details.length} 题
              </span>
            )}
          </div>

          {/* 分类过滤器 */}
          {details.length > 0 && (
            <div className="flex items-center gap-s2 overflow-x-auto pb-s1 text-caption">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-small px-s3 py-s1 font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-ink text-surface"
                      : "bg-surface-subtle text-muted hover:text-ink"
                  }`}
                >
                  {cat}
                </button>
              ))}
              {failCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveCategory("仅看未通过")}
                  className={`flex items-center gap-s1 rounded-small px-s3 py-s1 font-medium transition-colors ${
                    activeCategory === "仅看未通过"
                      ? "bg-ink text-surface"
                      : "bg-surface-subtle text-muted hover:text-ink"
                  }`}
                >
                  <AlertCircle className="size-icon-small" />
                  仅看未通过 ({failCount})
                </button>
              )}
            </div>
          )}
        </div>

        {/* 表格内容 */}
        {details.length === 0 ? (
          <div className="py-s7 text-center text-caption text-muted">
            <HelpCircle className="mx-auto size-icon mb-s2 opacity-50" />
            <p>暂无评测记录，请点击右上角「运行全量评测」开始跑批</p>
          </div>
        ) : (
          <div className="mt-s4 divide-y divide-line">
            {filteredDetails.map((item, idx) => {
              const isExpanded = expandedCaseId === item.id;
              return (
                <div key={item.id} className="py-s3">
                  <div
                    className="flex flex-col gap-s2 sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:bg-surface-subtle/50 p-s2 rounded-small transition-colors"
                    onClick={() => setExpandedCaseId(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-start gap-s3 min-w-0">
                      <span className="font-mono text-caption text-muted mt-s1 flex-shrink-0">
                        {String(idx + 1).padStart(2, "0")}.
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-s2 flex-wrap">
                          <span className="text-body font-medium text-ink">{item.question}</span>
                          <span className="rounded-small border border-line bg-surface-subtle px-s2 py-s1 text-caption font-mono text-muted">
                            {item.category}
                          </span>
                          {item.riskClass !== "normal" && (
                            <span className="rounded-small bg-surface-subtle px-s2 py-s1 text-caption font-mono text-muted">
                              {item.riskClass === "adversarial" ? "对抗防御" : "安全风控"}
                            </span>
                          )}
                        </div>
                        <p className="mt-s1 line-clamp-1 text-caption text-muted">
                          {item.answerSummary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-s4 self-end sm:self-center flex-shrink-0">
                      <div className="flex items-center gap-s1 text-caption font-mono text-muted">
                        <FileText className="size-icon-small" />
                        <span>{item.citationCount} 引用</span>
                      </div>
                      <div className="flex items-center gap-s1 text-caption font-mono text-muted">
                        <Clock className="size-icon-small" />
                        <span>{Math.round(item.latencyMs)}ms</span>
                      </div>
                      <span
                        className={`flex items-center gap-s1 rounded-small px-s2 py-s1 text-caption font-medium font-mono ${
                          item.isPass ? "bg-surface text-ink border border-ink" : "bg-surface text-muted border border-line"
                        }`}
                      >
                        {item.isPass ? <CheckCircle2 className="size-icon-small" /> : <AlertCircle className="size-icon-small" />}
                        {item.isPass ? "PASS" : "FAIL"}
                      </span>
                      {isExpanded ? <ChevronUp className="size-icon-small text-muted" /> : <ChevronDown className="size-icon-small text-muted" />}
                    </div>
                  </div>

                  {/* 展开的详情抽屉 */}
                  {isExpanded && (
                    <div className="mt-s3 rounded-small border border-line bg-surface-subtle p-s4 text-caption space-y-s3">
                      {!item.isPass && item.failReasons.length > 0 && (
                        <div className="rounded-small border border-line bg-surface p-s3">
                          <p className="font-semibold text-ink flex items-center gap-s1 mb-s1">
                            <ShieldAlert className="size-icon-small" /> 判定未通过原因:
                          </p>
                          <ul className="list-disc list-inside space-y-s1 text-muted">
                            {item.failReasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-ink mb-s1">回答断言与事实列表 ({item.claimCount} 条):</p>
                        {item.session?.claims && item.session.claims.length > 0 ? (
                          <div className="space-y-s2">
                            {item.session.claims.map((claim) => (
                              <div key={claim.id} className="rounded-small border border-line bg-surface p-s2">
                                <span className="font-medium text-ink">{claim.text}</span>
                                <div className="mt-s1 flex items-center gap-s2 text-muted font-mono">
                                  <span>状态: {claim.status}</span>
                                  <span>出处: {claim.citationIds.join(", ")}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted">（未生成事实断言，已按规范严格拒答）</p>
                        )}
                      </div>

                      {item.session?.citations && item.session.citations.length > 0 && (
                        <div>
                          <p className="font-semibold text-ink mb-s1">关联真实知识库出处 ({item.citationCount} 篇):</p>
                          <div className="space-y-s1">
                            {item.session.citations.map((c) => (
                              <div key={c.id} className="rounded-small border border-line bg-surface p-s2 text-muted font-mono">
                                <span className="text-ink font-medium">《{c.pageTitle}》</span>
                                <span className="ml-s2">定位: {c.anchor}</span>
                                <p className="mt-s1 text-caption text-muted line-clamp-2">“{c.excerpt}”</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  target,
  status,
  subtext,
}: {
  title: string;
  value: string;
  target: string;
  status: "success" | "failed";
  subtext: string;
}) {
  return (
    <div className="rounded-medium border border-line bg-surface p-s4 shadow-subtle flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-caption text-muted">
          <span>{title}</span>
          <span className="font-mono text-caption text-muted/70">{target}</span>
        </div>
        <p className="mt-s2 font-display text-display font-bold text-ink">{value}</p>
      </div>
      <div className="mt-s3 flex items-center gap-s1 text-caption font-medium">
        {status === "success" ? (
          <CheckCircle2 className="size-icon-small text-ink" />
        ) : (
          <AlertCircle className="size-icon-small text-muted" />
        )}
        <span className="text-muted truncate">{subtext}</span>
      </div>
    </div>
  );
}
