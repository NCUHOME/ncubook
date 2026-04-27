import assert from "node:assert/strict";
import { classifyOfficialContent } from "../lib/official-content";

function assertCase(
    name: string,
    input: Parameters<typeof classifyOfficialContent>[0],
    expected: {
        status: "ignored" | "watching" | "candidate";
        riskLevel?: "low" | "medium" | "high";
        suggestedDocPath?: string | null;
        reasonPattern?: RegExp;
    }
) {
    const result = classifyOfficialContent(input);
    assert.equal(result.status, expected.status, `${name}: status`);

    if (expected.riskLevel) {
        assert.equal(result.riskLevel, expected.riskLevel, `${name}: riskLevel`);
    }

    if ("suggestedDocPath" in expected) {
        assert.equal(result.suggestedDocPath, expected.suggestedDocPath, `${name}: suggestedDocPath`);
    }

    if (expected.reasonPattern) {
        assert.match(result.reason, expected.reasonPattern, `${name}: reason`);
    }
}

assertCase(
    "学院会议新闻应忽略",
    {
        sourceKey: "college-news",
        department: "学院新闻",
        title: "信息工程学院召开本科教育教学审核评估工作推进会",
        text: "学院领导参加会议并调研走访，会议强调要持续推进宣传工作。",
        url: "https://example.edu.cn/news/1",
    },
    { status: "ignored", riskLevel: "low" }
);

assertCase(
    "领导调研走访应忽略",
    {
        sourceKey: "college-visit",
        department: "学院新闻",
        title: "校领导赴学院调研走访学生工作",
        text: "校领导走访学院并召开座谈会，听取学院发展情况汇报。",
        url: "https://example.edu.cn/news/2",
    },
    { status: "ignored", riskLevel: "low" }
);

assertCase(
    "普通活动通知不能只因通知入队",
    {
        sourceKey: "activity-notice",
        department: "学院通知",
        title: "关于开展校园文化主题活动的通知",
        text: "本次活动面向全体学生自愿参加，具体活动安排由学院另行发布。",
        url: "https://example.edu.cn/notice/3",
    },
    { status: "ignored", riskLevel: "low" }
);

assertCase(
    "转专业通知应高风险入队",
    {
        sourceKey: "jwc-major-change",
        department: "教务处",
        title: "关于做好2025级本科生转专业工作的通知",
        text: "各学院制定实施细则，学生可申请转专业，接收人数原则上为新生学生数5%-20%，截止时间以通知为准。",
        url: "https://jwc.ncu.edu.cn/content.jsp?urltype=news.NewsContentUrl&wbnewsid=56481&wbtreeid=1541",
    },
    {
        status: "candidate",
        riskLevel: "high",
        suggestedDocPath: "docs/academics/major-change.md",
        reasonPattern: /转专业|资格|时间|材料|政策/,
    }
);

assertCase(
    "奖助学金通知应高风险入队",
    {
        sourceKey: "xszz-funding",
        department: "学生资助中心",
        title: "关于开展国家奖学金、国家励志奖学金评审工作的通知",
        text: "学生需按时提交申请材料，学院公示名单后报送学校审核，逾期不再受理。",
        url: "https://xszz.ncu.edu.cn/info/1036/4343.htm",
    },
    {
        status: "candidate",
        riskLevel: "high",
        suggestedDocPath: "docs/career/awards.md",
    }
);

assertCase(
    "后勤服务变化应关联报修页",
    {
        sourceKey: "hq-repair",
        department: "后勤保障处",
        title: "关于寒假期间校园后勤服务安排的通知",
        text: "后勤服务时间、报修电话、服务地点和办理入口在寒假期间有调整，师生可关注南昌大学后勤公众号。",
        url: "https://www.ncu.edu.cn/info/1046/224081.htm",
    },
    {
        status: "candidate",
        suggestedDocPath: "docs/campus-life/repair.md",
    }
);

assertCase(
    "校园网服务变化应关联网络页",
    {
        sourceKey: "xxwl-network",
        department: "网络与信息中心",
        title: "关于校园网认证系统入口调整的通知",
        text: "校园网账号、密码、认证地址和服务电话发生调整，学生宿舍区请使用新的系统入口办理。",
        url: "https://xxwl.ncu.edu.cn/info/1010/6179.htm",
    },
    {
        status: "candidate",
        suggestedDocPath: "docs/onboarding/network.md",
    }
);

assertCase(
    "一码通服务变化应关联校园卡页",
    {
        sourceKey: "net-card-code",
        department: "网络与信息中心",
        title: "校园一码通使用简介",
        text: "校园一码通与实体校园卡共享账户，可用于食堂消费、宿舍电费缴费、图书借还和校园交通。",
        url: "https://net.ncu.edu.cn/info/1025/4779.htm",
    },
    {
        status: "candidate",
        suggestedDocPath: "docs/onboarding/campus-card.md",
    }
);

console.log("official source filter tests passed: 新闻排除、政策入队、服务变化可定位");
