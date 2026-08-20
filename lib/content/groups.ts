// 辅助工具：南昌大学生存手册标准章节二级分类（Group）映射表与分组计算器
export const CANONICAL_ARTICLE_GROUPS: Record<string, Record<string, string>> = {
  // 学习板块分组
  学习: {
    "新生必看": "入学必看",
    "不喜欢本专业 / 想学其他专业": "入学必看",
    "不喜欢本专业/想学其他专业": "入学必看",
    "不喜欢本专业": "入学必看",
    "英语": "考试",
    "学分、绩点、二课分、综测": "基本认识",
    "学分、绩点、二课分": "基本认识",
    "辅修 & 第二学士学位": "基本认识",
    "辅修&第二学士学位": "基本认识",
    "校园跑 & 体测": "基本认识",
    "校园跑&体测": "基本认识",
    "早点到 & 晚自习": "基本认识",
    "早点到&晚自习": "基本认识",
    "保研": "评优评先",
    "班干部": "评优评先",
    "评奖评优": "评优评先",
    "大创项目 & 科研训练项目": "评优评先",
    "大学生创新创业计划项目&科研训练": "评优评先",
    "大创项目": "评优评先",
  },
  // 生活板块分组
  生活: {
    "必备物品": "常识",
    "网络与流量卡": "常识",
    "NCU 校园卡简介": "常识",
    "NCU校园卡简介": "常识",
    "失物招领 & 寻物启事": "常识",
    "失物招领&寻物启事": "常识",
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
  // 课程板块分组
  课程: {
    "专业课": "培养方案",
    "通识课": "选课攻略",
  },
  // 黄页板块分组
  黄页: {
    "安全保卫": "紧急电话",
    "电话": "紧急电话",
    "家园注册": "账号指南",
    "南大家园注册": "账号指南",
  },
};

/**
 * 根据板块名与篇目名，获取其标准二级分组小标题（如「入学必看」「基本认识」「重要信息」等）
 */
export function getArticleGroup(sectionTitle?: string, articleTitle?: string): string | null {
  if (!sectionTitle || !articleTitle) return null;

  const cleanSec = sectionTitle.replace(/[\s·]/g, "");
  for (const [secKey, groupMap] of Object.entries(CANONICAL_ARTICLE_GROUPS)) {
    if (cleanSec.includes(secKey) || secKey.includes(cleanSec)) {
      const cleanTitle = articleTitle.replace(/[\s·]/g, "");
      for (const [titleKey, groupName] of Object.entries(groupMap)) {
        if (cleanTitle.includes(titleKey.replace(/[\s·]/g, ""))) {
          return groupName;
        }
      }
    }
  }
  return null;
}
