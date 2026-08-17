// 核心业务领域：AI 问答 Session 数据契约、反序列化校验、防篡改机制与测试 Fixtures
export const FIXTURE_CONTENT_VERSION = "fixture-v1";

export type Citation = {
  id: string;
  pageId: string;
  pageTitle: string;
  anchor: string;
  contentVersion: string;
  excerpt: string;
  sourceUrl?: string;
};

export type AnswerClaim = {
  id: string;
  text: string;
  citationIds: string[];
  status: "grounded" | "needs-verification" | "insufficient";
};

export type AnswerSession = {
  id: string;
  question: string;
  pageContext?: { pageId: string; anchor?: string };
  citations: Citation[];
  claims: AnswerClaim[];
  confidence: "grounded" | "partial" | "insufficient";
};

export function validateAnswerSession(
  value: unknown,
  activeContentVersion?: string,
): AnswerSession {
  const source = requireRecord(value, "Answer session");
  const session: AnswerSession = {
    id: requireText(source.id, "Answer session id"),
    question: requireText(source.question, "Answer session question"),
    confidence: parseConfidence(source.confidence),
    citations: requireArray(source.citations, "Answer citations").map(parseCitation),
    claims: requireArray(source.claims, "Answer claims").map(parseClaim),
    ...(source.pageContext === undefined ? {} : { pageContext: parsePageContext(source.pageContext) }),
  };
  if (!session.id || !session.question) throw new Error("Answer session requires an id and question");
  if (session.confidence === "insufficient" && session.claims.length > 0) {
    throw new Error("An insufficient answer cannot contain factual claims");
  }

  const citations = new Map(session.citations.map((citation) => [citation.id, citation]));
  if (citations.size !== session.citations.length) throw new Error("Answer session contains duplicate citation ids");
  const claimIds = new Set(session.claims.map((claim) => claim.id));
  if (claimIds.size !== session.claims.length) throw new Error("Answer session contains duplicate claim ids");
  for (const citation of session.citations) {
    if (!citation.anchor.startsWith("b-")) throw new Error(`Invalid citation anchor: ${citation.anchor}`);
    if (!citation.contentVersion || !citation.contentVersion.trim()) {
      throw new Error(`Citation ${citation.id} is missing a content version`);
    }
    if (activeContentVersion && citation.contentVersion !== activeContentVersion) {
      throw new Error(`Citation ${citation.id} uses an inactive content version`);
    }
  }

  for (const claim of session.claims) {
    if (claim.citationIds.length === 0) {
      throw new Error(`Factual claim ${claim.id} requires a citation`);
    }
    for (const citationId of claim.citationIds) {
      if (!citations.has(citationId)) throw new Error(`Unknown citation: ${citationId}`);
    }
  }

  if (session.confidence === "grounded" && session.claims.some((claim) => claim.status !== "grounded")) {
    throw new Error("Grounded confidence requires every claim to be grounded");
  }

  return session;
}

function parseCitation(value: unknown): Citation {
  const source = requireRecord(value, "Answer citation");
  const sourceUrl = source.sourceUrl;
  if (sourceUrl !== undefined && typeof sourceUrl !== "string") throw new Error("Answer citation source URL must be text");
  return {
    id: requireText(source.id, "Citation id"),
    pageId: requireText(source.pageId, "Citation page id"),
    pageTitle: requireText(source.pageTitle, "Citation page title"),
    anchor: requireText(source.anchor, "Citation anchor"),
    contentVersion: requireText(source.contentVersion, "Citation content version"),
    excerpt: requireText(source.excerpt, "Citation excerpt"),
    ...(sourceUrl ? { sourceUrl } : {}),
  };
}

function parseClaim(value: unknown): AnswerClaim {
  const source = requireRecord(value, "Answer claim");
  const status = source.status;
  if (status !== "grounded" && status !== "needs-verification" && status !== "insufficient") throw new Error("Answer claim has an invalid status");
  return {
    id: requireText(source.id, "Claim id"),
    text: requireText(source.text, "Claim text"),
    citationIds: requireArray(source.citationIds, "Claim citations").map((id) => requireText(id, "Claim citation id")),
    status,
  };
}

function parsePageContext(value: unknown): NonNullable<AnswerSession["pageContext"]> {
  const source = requireRecord(value, "Answer page context");
  const anchor = source.anchor;
  if (anchor !== undefined && (typeof anchor !== "string" || !anchor.startsWith("b-"))) throw new Error("Answer context anchor is invalid");
  return { pageId: requireText(source.pageId, "Answer context page id"), ...(anchor ? { anchor } : {}) };
}

function parseConfidence(value: unknown): AnswerSession["confidence"] {
  if (value !== "grounded" && value !== "partial" && value !== "insufficient") throw new Error("Answer session has invalid confidence");
  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value;
}

export function createAnswerFixture(
  question: string,
  pageContext?: AnswerSession["pageContext"],
): AnswerSession {
  const q = question.trim();

  // 1. 环游车付费
  if (/环游车.*付费|支持微信/.test(q)) {
    return makeAnswer(q, pageContext, "page-campus-shuttle", "校园环游车", "b-fare", [
      "校园环游车单次单价 0.9 元。",
      "可通过支付宝搜索洪城一卡通开通支付，或直接扫车载二维码付款。",
    ]);
  }
  // 2. 红牌与蓝牌车
  if (/红牌车.*蓝牌车|蓝牌.*红牌/.test(q)) {
    return makeAnswer(q, pageContext, "page-campus-shuttle", "校园环游车", "b-route", [
      "蓝牌车为天健至医学院往返的长途车，红牌车为天健至白帆运动场的短途车（短途车不前往医学院）。",
    ]);
  }
  // 3. 运营时间
  if (/运营时间|发车间隔/.test(q)) {
    return makeAnswer(q, pageContext, "page-campus-shuttle", "校园环游车", "b-time", [
      "运营发车时间约为 07:00~21:30，高峰时段发车间隔为 6 分钟/班，平峰时段为 12 分钟/班。",
    ]);
  }
  // 4. 床铺尺寸
  if (/床铺.*凉席|凉席尺寸/.test(q)) {
    return makeAnswer(q, pageContext, "page-24e7d60a0dda8003", "寝室生活", "b-bed", [
      "前湖校区宿舍床铺规格为 2m × 0.9m，凉席建议尺寸为 1.9m × 0.9m。",
    ]);
  }
  // 5. 功率限制
  if (/最大限制功率|功率是多少瓦/.test(q)) {
    return makeAnswer(q, pageContext, "page-2577d60a0dda807b", "必备物品", "b-power", [
      "宿舍电子设备限制功率为 800 瓦（800W），携带电器时请务必核对额定功率。",
    ]);
  }
  // 6. 宿舍报修
  if (/怎么线上报修|水工电工要收费吗/.test(q)) {
    return makeAnswer(q, pageContext, "page-22c7d60a0dda8091", "报修指南", "b-repair", [
      "关注微信公众号【南昌大学后勤】，进入智慧后勤线上报修，木工、水工、电工项目全部免费，工作人员会在 48 小时内上门查看并维修。",
    ]);
  }
  // 7. 洗衣机软件
  if (/洗衣机.*软件|扫码使用/.test(q)) {
    return makeAnswer(q, pageContext, "page-24e7d60a0dda8003", "寝室生活", "b-laundry", [
      "宿舍楼内智慧洗衣房需下载使用「U净」手机 App 扫码洗衣。",
    ]);
  }
  // 8. 修贤1-4栋卫浴
  if (/修贤1-4栋.*卫浴|室内洗手池/.test(q)) {
    return makeAnswer(q, pageContext, "page-24e7d60a0dda8003", "寝室生活", "b-xiuxian", [
      "前湖校区修贤 1-4 栋为公共卫生间，宿舍内无洗手池，且上铺为爬梯式设计。",
    ]);
  }
  // 9. 校园卡初始密码
  if (/NCU校园卡初始密码|校园卡.*初始密码/.test(q)) {
    return makeAnswer(q, pageContext, "page-22c7d60a0dda8042", "NCU校园卡简介", "b-card-pwd", [
      "系统消费与查询初始密码均为 6 位，默认是身份证号后 6 位（身份证尾号 X 对应 0）。",
    ]);
  }
  // 10. 学生证发放
  if (/什么时候可以发到学生证|学生证.*发/.test(q)) {
    return makeAnswer(q, pageContext, "page-23a7d60a0dda80f6", "学生证", "b-student-card", [
      "学生证在新生入校三个月取得正式学籍后，由学院学工处统一印制并发放。",
    ]);
  }
  // 11. 教学区校园网
  if (/教学区.*WiFi|手动认证网址/.test(q)) {
    return makeAnswer(q, pageContext, "page-22c7d60a0dda8081", "网络与流量卡", "b-teaching-wifi", [
      "教学区连接无线网 NCUWLAN 免费，登录账号为学号，如未自动弹窗可在浏览器输入 aaa.ncu.edu.cn 进行认证。",
    ]);
  }
  // 12. 宿舍区网络
  if (/宿舍楼里有免费.*NCUWLAN|寝室怎么上网/.test(q)) {
    return makeAnswer(q, pageContext, "page-22c7d60a0dda8081", "网络与流量卡", "b-dorm-wifi", [
      "宿舍区没有免费的 NCUWLAN，需连接运营商维护的 NCU-5G / NCU-2.4G 无线网络或办理寝室宽带网线。",
    ]);
  }
  // 13. 四级报名时间
  if (/新生最早什么时候可以报考英语四级|四级.*报考/.test(q)) {
    return makeAnswer(q, pageContext, "page-2577d60a0dda8034", "英语", "b-cet4", [
      "南昌大学本科生四级最早可以在大一第二学期报考。",
    ]);
  }
  // 14. 六级报名条件
  if (/六级.*四级分数|报考英语六级/.test(q)) {
    return makeAnswer(q, pageContext, "page-2577d60a0dda8034", "英语", "b-cet6", [
      "英语四级成绩必须达到 425 分及以上，方可报考全国大学英语六级考试。",
    ]);
  }
  // 15. 四六级听力设备
  if (/四六级听力.*耳机|准备什么耳机/.test(q)) {
    return makeAnswer(q, pageContext, "page-2577d60a0dda8034", "英语", "b-cet-device", [
      "听力考试需佩戴可以接收无线电广播信号的专用耳机或收音机加有线耳机。",
    ]);
  }
  // 16. 学位英语取消
  if (/学士学位英语|强制要求考过学士学位/.test(q)) {
    return makeAnswer(q, pageContext, "page-2577d60a0dda8034", "英语", "b-degree-eng", [
      "从 2025 届毕业生开始，学校已全面取消本科毕业学士学位英语的考核要求。",
    ]);
  }
  // 17. 通识课学分
  if (/通识课.*修满多少学分|跨几个模块/.test(q)) {
    return makeAnswer(q, pageContext, "page-2587d60a0dda80a4", "通识课", "b-general-credits", [
      "每个学生在校期间至少需要选修满 10 学分通识课，且至少要跨 4 个模块。",
    ]);
  }
  // 18. 通识课挂科
  if (/通识课.*挂科.*补考|通识课.*补考/.test(q)) {
    return makeAnswer(q, pageContext, "page-2587d60a0dda80a4", "通识课", "b-general-retake", [
      "通识课如果挂科是没有补考的，需要在下学期重新选课修读。",
    ]);
  }
  // 19. 重修学费
  if (/挂科重修每个学分要交多少钱|重修.*老生/.test(q)) {
    return makeAnswer(q, pageContext, "page-2587d60a0dda8090", "学分绩点", "b-retake-fee", [
      "课程重修学费标准为：老生 80 元/学分，2026 级新生开始调整为 130 元/学分。",
    ]);
  }
  // 20. 辅修绩点
  if (/辅修专业.*平均绩点|辅修.*绩点/.test(q)) {
    return makeAnswer(q, pageContext, "page-2587d60a0dda8043", "辅修与第二学士学位", "b-minor-gpa", [
      "申请辅修专业或第二学士学位的已修课程平均学分绩点需在 2.0 以上。",
    ]);
  }
  // 21. 辅修学费
  if (/文科和理工科辅修专业.*学费|辅修.*学费/.test(q)) {
    return makeAnswer(q, pageContext, "page-2587d60a0dda8043", "辅修与第二学士学位", "b-minor-fee", [
      "辅修按学年收费，文科类为 3500~3800 元/学年，理工科类为 4000~4200 元/学年。",
    ]);
  }
  // 22. 体测权重
  if (/体测.*50米和耐力跑|耐力跑.*权重/.test(q)) {
    return makeAnswer(q, pageContext, "page-2597d60a0dda8091", "校园跑&体测", "b-fitness-weights", [
      "在国家学生体测中，50 米跑权重占 20%，1000米（男）/ 800米（女）耐力跑占 20%。",
    ]);
  }
  // 23. 毕业体测公式
  if (/毕业时的体测总成绩|哪几年成绩加权/.test(q)) {
    return makeAnswer(q, pageContext, "page-2597d60a0dda8091", "校园跑&体测", "b-fitness-grad", [
      "毕业体测总成绩按大四成绩 50% 加上前三年平均成绩 50% 综合评定计算。",
    ]);
  }
  // 24. 早点到学院
  if (/哪些学院有早点到要求|早点到/.test(q)) {
    return makeAnswer(q, pageContext, "page-2597d60a0dda809b", "早点到&晚自习", "b-morning-roll", [
      "安排早点到的学院包括生科、一临、公卫院、药学院、信工、资环等。",
    ]);
  }
  // 25. 晚自习学院
  if (/哪些学院安排了统一晚自习|晚自习/.test(q)) {
    return makeAnswer(q, pageContext, "page-2597d60a0dda809b", "早点到&晚自习", "b-evening-study", [
      "安排统一晚自习的学院包括软院、一临、公卫院、基础医学院、物理材料学院等。",
    ]);
  }
  // 26. 保卫处电话
  if (/前湖校区保卫处报警电话|门禁电话/.test(q)) {
    return makeAnswer(q, pageContext, "page-22c7d60a0dda80c4", "黄页", "b-security-tel", [
      "前湖校区保卫处报警电话为 83969110（火警 83969119），公寓 24 小时门禁电话为 18070031613。",
    ]);
  }
  // 27. 南大家园功能
  if (/南大家园App.*下载|南大家园.*功能/.test(q)) {
    return makeAnswer(q, pageContext, "page-24a7d60a0dda8094", "南大家园注册流程", "b-incu-features", [
      "南大家园 App 可通过 incu.ncu.edu.cn 下载，支持查课表、电费余额监控与校园地图导航等核心功能。",
    ]);
  }
  // 28. 食堂数量
  if (/前湖校区.*多少个食堂|一共.*多少个食堂|共有多少个食堂|几个食堂/.test(q)) {
    return makeAnswer(q, pageContext, "page-22c7d60a0dda8044", "吃饭", "b-canteens", [
      "前湖校区一共有 10 个食堂，并配有小吃街。",
    ]);
  }

  // 拒答 / 未知 / 对抗 / 敏感风控
  return validateAnswerSession({
    id: `answer-insufficient-${stableId(q)}`,
    question: q,
    pageContext,
    confidence: "insufficient",
    citations: [],
    claims: [],
  });
}

function makeAnswer(
  question: string,
  pageContext: AnswerSession["pageContext"] | undefined,
  pageId: string,
  pageTitle: string,
  anchor: string,
  claims: string[],
): AnswerSession {
  const citationId = `cit-${anchor}`;
  return validateAnswerSession({
    id: `answer-${anchor}`,
    question,
    pageContext,
    confidence: "grounded",
    citations: [
      {
        id: citationId,
        pageId,
        pageTitle,
        anchor,
        contentVersion: FIXTURE_CONTENT_VERSION,
        excerpt: claims.join(" "),
      },
    ],
    claims: claims.map((text, idx) => ({
      id: `claim-${anchor}-${idx}`,
      text,
      citationIds: [citationId],
      status: "grounded",
    })),
  });
}

function stableId(value: string): string {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}
