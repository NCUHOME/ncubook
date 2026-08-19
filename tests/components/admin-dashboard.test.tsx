import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminTabs } from "@/src/components/admin/admin-tabs";
import { EvalDashboard } from "@/src/components/admin/eval-dashboard";
import { QAPlayground } from "@/src/components/admin/qa-playground";
import { VersionTimeline } from "@/src/components/admin/version-timeline";

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

    // 默认展示内容发布面板
    expect(screen.getByText("内容发布与版本")).toBeDefined();
    expect(screen.getByText("AI 质量评测")).toBeDefined();
    expect(screen.getByText("问答测试沙盒")).toBeDefined();
    expect(screen.getByText("Notion 文章更新")).toBeDefined();

    // 点击切换到 AI 评测看板
    fireEvent.click(screen.getByText("AI 质量评测"));
    expect(screen.getByText("运行评测")).toBeDefined();

    // 点击切换到问答沙盒
    fireEvent.click(screen.getByText("问答测试沙盒"));
    expect(screen.getByText("测试问答")).toBeDefined();
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
