// 网站全局公共配置规范与默认兜底数据 (lib/content/site-config.ts)

export type SearchConfig = {
  placeholder: string;
  chips: string[];
  emptyHint: string;
  noResultTitle: string;
  noResultSub: string;
};

export type AiConfig = {
  suggestedQuestions: string[];
  assistantSubtitle: string;
  inputPlaceholder: string;
};

export type HomeHeroConfig = {
  title: string;
  quote: string;
};

export type HomeNoticeConfig = {
  title: string;
  date: string;
  desc: string;
  links: Array<{ text: string; slug: string }>;
};

export type HomeContributeConfig = {
  email: string;
  qq_group: string;
  desc: string;
};

export type FooterConfig = {
  thankPrefix: string;
  extraContributors: string[];
  disclaimer: string;
};

export type ArticleFeedbackConfig = {
  prompt: string;
  thankMsg: string;
  feishuUrl: string;
};

export type ArticleGroupsConfig = Record<string, Record<string, string>>;

export type AllSiteConfigs = {
  search_config: SearchConfig;
  ai_config: AiConfig;
  home_hero: HomeHeroConfig;
  home_notice: HomeNoticeConfig;
  home_contribute: HomeContributeConfig;
  footer_config: FooterConfig;
  article_feedback_config: ArticleFeedbackConfig;
  article_groups: ArticleGroupsConfig;
};

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  placeholder: "搜索校园指南（如：选课、绩点、校车、报修...）",
  chips: ["校车出行", "防诈指南", "保卫处电话", "GPA 绩点", "通识选课", "转专业"],
  emptyHint: "输入关键词实时检索校园指南文章与具体段落...",
  noResultTitle: "未找到相关篇目或段落",
  noResultSub: "未匹配到相关段落，建议换个关键词，或点击右下角小家园直接提问",
};

export const DEFAULT_AI_CONFIG: AiConfig = {
  suggestedQuestions: [
    "校内环游车怎么坐？",
    "转专业有什么条件？",
    "GPA 绩点怎么计算？",
    "保卫处电话是多少？",
  ],
  assistantSubtitle: "南大家园官方 AI 知识库助手",
  inputPlaceholder: "向小家园提问关于南大的任何事（如：转专业条件、体测标准...）",
};

export const DEFAULT_HOME_HERO_CONFIG: HomeHeroConfig = {
  title: "校园里的事<br>在此问明白",
  quote: "是什么曾经拯救过你，就用它来更好地拯救这个世界",
};

export const DEFAULT_HOME_NOTICE_CONFIG: HomeNoticeConfig = {
  title: "公告",
  date: "2026 年 8 月",
  desc: "南大家园《此间》校园知识库持续更新中，涵盖学业、生活、出行等各类指南；遇到问题可直接向小家园 AI 提问～",
  links: [
    { text: "新生必看", slug: "xinsheng" },
    { text: "关于我们", slug: "why" },
  ],
};

export const DEFAULT_HOME_CONTRIBUTE_CONFIG: HomeContributeConfig = {
  email: "book@nchuhome.club",
  qq_group: "930991836",
  desc: "发现内容有错漏，或想分享你的校园经验？欢迎通过下方邮箱或 QQ 群加入我们～",
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  thankPrefix: "感谢所有参与编写与完善本手册的同学",
  extraContributors: [],
  disclaimer:
    "自发组织、非盈利社区，并非任何官方机构，内容仅供交流学习；若认为内容侵犯您的合法权益，请通过上方邮箱联系我们。",
};

export const DEFAULT_ARTICLE_FEEDBACK_CONFIG: ArticleFeedbackConfig = {
  prompt: "这篇指南对你有帮助吗？",
  thankMsg: "感谢您的反馈与支持！",
  feishuUrl: "https://ncuos.feishu.cn/share/base/form/shrcnxQo4K5x4u40X8i4n78L4gb",
};

export const DEFAULT_ARTICLE_GROUPS_CONFIG: ArticleGroupsConfig = {
  学习: {
    "新生必看": "入学必看",
    "不喜欢本专业 / 想学其他专业": "入学必看",
    "英语": "考试",
    "学分、绩点、二课分、综测": "基本认识",
    "辅修 & 第二学士学位": "基本认识",
    "校园跑 & 体测": "基本认识",
    "早点到 & 晚自习": "基本认识",
    "保研": "评优评先",
    "班干部": "评优评先",
    "评奖评优": "评优评先",
    "大创项目 & 科研训练项目": "评优评先",
  },
  生活: {
    "必备物品": "常识",
    "网络与流量卡": "常识",
    "NCU 校园卡简介": "常识",
    "失物招领 & 寻物启事": "常识",
    "校医院就医": "常识",
    "学生证": "常识",
    "报修指南": "常识",
    "寝室生活": "常识",
    "校内出行": "重要信息",
    "校外交通": "重要信息",
    "社团介绍": "重要信息",
    "运动": "休闲",
    "吃饭": "休闲",
    "校外游玩": "休闲",
  },
};

function applyConfigOverride<K extends keyof AllSiteConfigs>(
  configs: AllSiteConfigs,
  key: K,
  value: unknown,
) {
  if (!value) return;
  if (typeof value === "object" && !Array.isArray(value)) {
    configs[key] = { ...configs[key], ...(value as Record<string, unknown>) };
  } else {
    configs[key] = value as AllSiteConfigs[K];
  }
}

/**
 * 服务端高效读取全站公共配置（带数据库与安全兜底合并）
 */
export async function getAllSiteConfigs(): Promise<AllSiteConfigs> {
  const configs: AllSiteConfigs = {
    search_config: { ...DEFAULT_SEARCH_CONFIG },
    ai_config: { ...DEFAULT_AI_CONFIG },
    home_hero: { ...DEFAULT_HOME_HERO_CONFIG },
    home_notice: { ...DEFAULT_HOME_NOTICE_CONFIG },
    home_contribute: { ...DEFAULT_HOME_CONTRIBUTE_CONFIG },
    footer_config: { ...DEFAULT_FOOTER_CONFIG },
    article_feedback_config: { ...DEFAULT_ARTICLE_FEEDBACK_CONFIG },
    article_groups: { ...DEFAULT_ARTICLE_GROUPS_CONFIG },
  };

  try {
    const { getSupabaseAdmin } = await import("@/lib/integrations/supabase");
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase.from("site_configs").select("key, value");
      if (Array.isArray(data)) {
        for (const item of data) {
          const key = item.key as keyof AllSiteConfigs;
          if (key in configs && item.value) {
            applyConfigOverride(configs, key, item.value);
          }
        }
      }
    }
  } catch {
    // 安全降级
  }

  return configs;
}
