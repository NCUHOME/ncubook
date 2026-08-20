import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AdminTabs } from "@/src/components/admin/admin-tabs";
import { EvalDashboard } from "@/src/components/admin/eval-dashboard";
import { QAPlayground } from "@/src/components/admin/qa-playground";
import { VersionTimeline } from "@/src/components/admin/version-timeline";
import { AnalyticsDashboard } from "@/src/components/admin/analytics-dashboard";
import { SiteConfigPanel } from "@/src/components/admin/site-config-panel";
import { FeedbackPanel } from "@/src/components/admin/feedback-panel";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("admin dashboard component suite", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/admin/feedbacks")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                ok: true,
                stats: { total: 2, helpful: 1, unhelpful: 1, pending: 1, resolved: 0, archived: 0, helpfulRate: "50%" },
                recent: [
                  {
                    id: "1",
                    target_type: "article",
                    target_id: "page-xinsheng",
                    is_helpful: false,
                    comment: "时间写错了",
                    created_at: "2026-08-20T12:00:00Z",
                    status: "pending",
                    article_title: "新生必看",
                    section_title: "学习",
                  },
                ],
              }),
          });
        }
        if (url.includes("/api/admin/config") || url.includes("/api/config")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                ok: true,
                data: [],
                allArticles: [{ title: "校内出行", slug: "page-chuxing", sectionTitle: "生活" }],
              }),
          });
        }
        if (url.includes("/api/admin/analytics")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                ok: true,
                data: {
                  todayPv: 120,
                  todayUv: 45,
                  totalSearches: 88,
                  zeroResultSearches: 3,
                  totalAiAsks: 26,
                  totalContactCopies: 14,
                  topArticles: [{ slug: "xinsheng", title: "新生必看指南", views: 50 }],
                  topSearchQueries: [{ query: "体测", count: 20, zeroResult: false }],
                  zeroResultQueries: [{ query: "游泳馆", count: 3, lastSearchedAt: "2026-08-20T12:00:00Z" }],
                  recentEvents: [],
                },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        });
      }),
    );
  });

  it("renders AdminTabs and switches between panels smoothly with Keep-Alive", async () => {
    await act(async () => {
      render(<AdminTabs currentVersion="content-test-v1" />);
    });

    // 包含 5 个核心 Tab 栏
    expect(screen.getByText("数据洞察与埋点")).toBeDefined();
    expect(screen.getByText("内容发布与版本")).toBeDefined();
    expect(screen.getByText("网站与目录配置")).toBeDefined();
    expect(screen.getByText("用户反馈监控")).toBeDefined();
    expect(screen.getByText("AI 评测与沙盒")).toBeDefined();

    // 点击切换到内容发布面板
    await act(async () => {
      fireEvent.click(screen.getByText("内容发布与版本"));
    });
    expect(screen.getByText("Notion 文章更新")).toBeDefined();

    // 点击切换到 AI 评测与沙盒
    await act(async () => {
      fireEvent.click(screen.getByText("AI 评测与沙盒"));
    });
    expect(screen.getByText("35 项黄金基准评测看板")).toBeDefined();
    expect(screen.getByText("AI 问答调试沙盒")).toBeDefined();

    // 点击切换到用户反馈监控
    await act(async () => {
      fireEvent.click(screen.getByText("用户反馈监控"));
    });
    expect(screen.getByText("用户反馈与好评监控工单")).toBeDefined();
  });

  it("renders AnalyticsDashboard with metrics, readable titles and events", async () => {
    const mockSummary = {
      todayPv: 120,
      todayUv: 45,
      totalSearches: 88,
      zeroResultSearches: 3,
      totalAiAsks: 26,
      totalContactCopies: 14,
      topArticles: [
        {
          slug: "xinsheng",
          title: "新生必看指南",
          sectionTitle: "学习",
          routePath: "/docs/xinsheng",
          views: 50,
        },
      ],
      topSearchQueries: [{ query: "体测", count: 20, zeroResult: false }],
      zeroResultQueries: [{ query: "游泳馆", count: 3, lastSearchedAt: "2026-08-20T12:00:00Z" }],
      recentEvents: [
        {
          id: 1,
          eventName: "page_view" as const,
          eventData: { slug: "xinsheng", device: "mobile" },
          resolvedTitle: "新生必看指南",
          resolvedSection: "学习",
          createdAt: "2026-08-20T12:00:00Z",
        },
      ],
    };

    await act(async () => {
      render(<AnalyticsDashboard initialSummary={mockSummary} />);
    });
    expect(screen.getByText("全站数据洞察与埋点大盘")).toBeDefined();
    expect(screen.getByText("今日访问 (PV / UV)")).toBeDefined();
    expect(screen.getByText("搜索使用总量")).toBeDefined();
    expect(screen.getByText("AI 问答提问量")).toBeDefined();
    expect(screen.getByText("电话/服务复制转化")).toBeDefined();
    expect(screen.getByText("新生必看指南")).toBeDefined();
    expect(screen.getByText("最近实时学生行为流水")).toBeDefined();
  });

  it("renders FeedbackPanel with status filter tabs and Linear style workflow", async () => {
    await act(async () => {
      render(<FeedbackPanel />);
    });
    expect(screen.getByText("用户反馈与好评监控工单")).toBeDefined();
    expect(screen.getAllByText(/待处理/).length).toBeGreaterThan(0);
    expect(screen.getByText(/全部反馈/)).toBeDefined();
    expect(screen.getByText("按文章聚合")).toBeDefined();
    expect(screen.getByText("明细流水")).toBeDefined();
  });

  it("renders SiteConfigPanel and switches between 5 configuration sub-tabs", async () => {
    await act(async () => {
      render(<SiteConfigPanel />);
    });
    expect(screen.getByText("全站公共信息配置中心")).toBeDefined();
    expect(screen.getByText("搜索与推荐配置")).toBeDefined();
    expect(screen.getByText("AI 助手与预设问题")).toBeDefined();
    expect(screen.getByText("首页标语与公告栏")).toBeDefined();
    expect(screen.getByText("完善手册与渠道声明")).toBeDefined();
    expect(screen.getByText("目录二级分类前称")).toBeDefined();

    // 默认展示搜索配置
    expect(screen.getByText("热门推荐标签 (Chips)")).toBeDefined();

    // 切换到 AI 助手
    await act(async () => {
      fireEvent.click(screen.getByText("AI 助手与预设问题"));
    });
    expect(screen.getByText("推荐快捷提问列表 (Suggested Questions)")).toBeDefined();

    // 切换到 首页标语与公告栏
    await act(async () => {
      fireEvent.click(screen.getByText("首页标语与公告栏"));
    });
    expect(screen.getByText("首页主标语与人文名言 (home_hero)")).toBeDefined();
    expect(screen.getByText(/什么是「导读快捷链接」？/)).toBeDefined();

    // 切换到 完善手册与渠道声明
    await act(async () => {
      fireEvent.click(screen.getByText("完善手册与渠道声明"));
    });
    expect(screen.getByText("完善手册联系渠道 (home_contribute)")).toBeDefined();

    // 切换到 目录二级分类前称
    await act(async () => {
      fireEvent.click(screen.getByText("目录二级分类前称"));
    });
    expect(screen.getByText("篇目二级分类与蓝色小标映射 (article_groups)")).toBeDefined();
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
