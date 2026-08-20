// 工具库：飞书多维表格（Bitable）收集表自动预填链接生成器与环境变量管理
export type FeishuFeedbackSource = "文档页" | "AI";

export type FeishuFeedbackParams = {
  source: FeishuFeedbackSource;
  pageTitle?: string;
  pageSlug?: string;
  question?: string;
  isHelpful?: boolean;
};

// 飞书收集表公开分享 URL（学生端点击直达表单）
export const DEFAULT_FEISHU_FEEDBACK_FORM_URL =
  "https://ncuhomer.feishu.cn/share/base/form/shrcnRe1BNvn40z4qo7k3miWAN0";

// 飞书多维表格数据大盘 URL（管理员在后台查看收集记录）
export const DEFAULT_FEISHU_ADMIN_WIKI_URL =
  "https://ncuhomer.feishu.cn/wiki/QFvewamk0i5MWvkI8zVcDxWcnPb?table=tblISr5HwymQ2YAq&view=vewW891LQV";

/**
 * 根据用户点击来源（文档页 / AI 问答）生成带有字段自动预填（Prefill）的飞书收集表 URL
 * 经过浏览器实测，飞书收集表要求完全匹配列名字段：
 * - `prefill_来源（自动填写）`：单选（文档页 / AI）
 * - `prefill_页面（自动填写）`：文本（页面标题与路由）
 * - `prefill_问题（自动填写）`：文本（截取前 200 字符）
 */
export function getFeishuFeedbackUrl(params: FeishuFeedbackParams): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_FEISHU_FEEDBACK_FORM_URL || DEFAULT_FEISHU_FEEDBACK_FORM_URL;

  try {
    const url = new URL(baseUrl);

    // 1. 预填来源（单选选项：文档页 / AI）
    url.searchParams.set("prefill_来源（自动填写）", params.source);

    // 2. 预填页面信息（文本：页面标题与路由）
    if (params.pageTitle || params.pageSlug) {
      const pageInfo = params.pageSlug
        ? `${params.pageTitle || params.pageSlug} (/docs/${params.pageSlug})`
        : params.pageTitle || "";
      url.searchParams.set("prefill_页面（自动填写）", pageInfo);
    }

    // 3. 预填问题（文本：截取前 200 字符）
    if (params.question) {
      const truncated = params.question.trim().slice(0, 200);
      url.searchParams.set("prefill_问题（自动填写）", truncated);
    }

    return url.toString();
  } catch {
    return baseUrl;
  }
}

/**
 * 获取管理后台直通飞书多维表格（Bitable）数据管理看板的 URL
 */
export function getFeishuAdminWikiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_FEISHU_ADMIN_WIKI_URL || DEFAULT_FEISHU_ADMIN_WIKI_URL
  );
}
