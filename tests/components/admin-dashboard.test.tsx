import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminTabs } from "@/src/components/admin/admin-tabs";
import { EvalDashboard } from "@/src/components/admin/eval-dashboard";
import { QAPlayground } from "@/src/components/admin/qa-playground";
import { VersionTimeline } from "@/src/components/admin/version-timeline";
import { AnalyticsDashboard } from "@/src/components/admin/analytics-dashboard";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("admin dashboard component suite", () => {
  it("renders AdminTabs and switches between panels smoothly", async () => {
    render(<AdminTabs currentVersion="content-test-v1" />);

    // 包含 5 个核心 Tab 栏
    expect(screen.getByText("数据洞察与埋点")).toBeDefined();
    expect(screen.getByText("内容发布与版本")).toBeDefined();
    expect(screen.getByText("网站与目录配置")).toBeDefined();
    expect(screen.getByText("用户反馈监控")).toBeDefined();
    expect(screen.getByText("AI 评测与沙盒")).toBeDefined();

    // 点击切换到内容发布面板
    fireEvent.click(screen.getByText("内容发布与版本"));
    expect(screen.getByText("Notion 文章更新")).toBeDefined();

    // 点击切换到 AI 评测与沙盒
    fireEvent.click(screen.getByText("AI 评测与沙盒"));
    expect(screen.getByText("35 项黄金基准评测看板")).toBeDefined();
    expect(screen.getByText("AI 问答调试沙盒")).toBeDefined();
  });

  it("renders AnalyticsDashboard with metrics and charts", () => {
    const mockSummary = {
      todayPv: 120,
      todayUv: 45,
      totalSearches: 88,
      zeroResultSearches: 3,
      totalAiAsks: 26,
      totalContactCopies: 14,
      topArticles: [{ slug: "xinsheng", title: "新生必看", views: 50 }],
      topSearchQueries: [{ query: "体测", count: 20, zeroResult: false }],
      zeroResultQueries: [{ query: "游泳馆", count: 3, lastSearchedAt: "2026-08-20T12:00:00Z" }],
      recentEvents: [],
    };

    render(<AnalyticsDashboard initialSummary={mockSummary} />);
    expect(screen.getByText("全站数据洞察与埋点大盘")).toBeDefined();
    expect(screen.getByText("今日访问 (PV / UV)")).toBeDefined();
    expect(screen.getByText("搜索使用总量")).toBeDefined();
    expect(screen.getByText("AI 问答提问量")).toBeDefined();
    expect(screen.getByText("电话/服务复制转化")).toBeDefined();
    expect(screen.getByText("新生必看")).toBeDefined();
  });

  it("renders EvalDashboard with initial report and metric cards", () => {
    const mockReport = {
      metrics: {
        citationValidity: 1,
        abstentionAccuracy: 1,
        unsupportedSensitiveClaims: 0,
        forbiddenHallucinations: 0,
        factualityRate: 1,
        p95LatencyMs: 250,
        passCount: 35,
        totalCount: 35,
      },
      thresholds: {
        citationValidity: 1,
        abstentionAccuracy: 1,
        unsupportedSensitiveClaims: 0,
        forbiddenHallucinations: 0,
        factualityRate: 1,
        p95LatencyMs: 5000,
      },
      details: [
        {
          id: "test-case-1",
          question: "校园环游车怎么付费？",
          category: "校内出行",
          expectedAnswerable: true,
          riskClass: "normal" as const,
          isPass: true,
          latencyMs: 120,
          failReasons: [],
          answerSummary: "单价 0.9 元",
          claimCount: 1,
          citationCount: 1,
        },
      ],
    };

    render(<EvalDashboard initialReport={mockReport} />);
    expect(screen.getByText("出处归因合规率")).toBeDefined();
    expect(screen.getByText("未知与风控拒答率")).toBeDefined();
    expect(screen.getByText("黄金事实符合率")).toBeDefined();
    expect(screen.getByText("P95 响应延迟")).toBeDefined();
    expect(screen.getByText("校园环游车怎么付费？")).toBeDefined();
  });

  it("renders QAPlayground with presets and inputs", () => {
    render(<QAPlayground />);
    expect(screen.getByPlaceholderText("输入需要测试的校园问题...")).toBeDefined();
    expect(screen.getByText("测试问答")).toBeDefined();
    expect(screen.getByText("快捷预设:")).toBeDefined();
  });

  it("renders VersionTimeline with current and historical versions with delete and rollback actions", async () => {
    const mockVersions = [
      { version: "content-current-v2", createdAt: "2026-08-19T00:00:00Z", isCurrent: true, status: "published" as const },
      { version: "content-history-v1", createdAt: "2026-08-18T00:00:00Z", isCurrent: false, status: "published" as const },
    ];

    render(<VersionTimeline currentVersion="content-current-v2" initialVersions={mockVersions} />);

    expect(screen.getByText("当前线上版本")).toBeDefined();
    expect(screen.getByText("历史版本")).toBeDefined();
    expect(screen.getByText("恢复此版本")).toBeDefined();
    expect(screen.getByText("删除此版本")).toBeDefined();
  });
});
