// 核心业务领域：Mock Fixtures 节点集合与静态 Fixture 假数据仓储策略实现 (M-3)
import type { Asset, Block, Page, PublishedFixture, RichText, SearchIndexEntry } from "@/lib/content/schema";
import type { ContentRepository, DocumentView, PageTreeNode, SectionView } from "@/lib/content/server";
import { freshmanNotionBlocks } from "@/lib/content/notion-preview";

export const fixtureContentVersion = "content-2026-07";
const publishedAt = "2026-07-13T10:00:00.000Z";

function text(plainText: string): RichText {
  return [{ plainText, annotations: {} }];
}

function rich(...parts: Array<string | { text: string; bold?: boolean; href?: string; pageId?: string }>): RichText {
  return parts.map((part) =>
    typeof part === "string"
      ? { plainText: part, annotations: {} }
      : {
          plainText: part.text,
          href: part.href,
          pageId: part.pageId,
          annotations: { bold: part.bold },
        },
  );
}

function page(input: Pick<Page, "id" | "parentId" | "title" | "slug"> & { topics: string[] }): Page {
  return {
    id: input.id,
    schemaVersion: 1,
    contentVersion: fixtureContentVersion,
    parentId: input.parentId,
    title: input.title,
    slug: input.slug,
    status: "published",
    lastEditedTime: publishedAt,
    lastPublishedAt: publishedAt,
    metadata: {
      school: "ncu",
      audiences: ["students"],
      topics: input.topics,
      sourceUrls: [],
      riskLevel: "normal",
    },
  };
}

export const pagesFixture: Page[] = [
  page({ id: "section-intro", parentId: null, title: "写在前面", slug: "intro", topics: ["介绍"] }),
  page({ id: "page-why", parentId: "section-intro", title: "为什么会去做这个手册", slug: "why", topics: ["介绍"] }),

  page({ id: "section-yellow", parentId: null, title: "黄页", slug: "yellow", topics: ["服务"] }),
  page({ id: "page-phones", parentId: "section-yellow", title: "安全保卫类咨询、反馈及投诉电话", slug: "phones", topics: ["安全", "电话"] }),
  page({ id: "page-jiayuan", parentId: "section-yellow", title: "南大家园注册流程", slug: "jiayuan", topics: ["家园"] }),

  page({ id: "section-course", parentId: null, title: "课程", slug: "course", topics: ["课程"] }),
  page({ id: "page-major", parentId: "section-course", title: "专业课", slug: "major", topics: ["课程"] }),
  page({ id: "page-general", parentId: "section-course", title: "通识课", slug: "general", topics: ["课程"] }),

  page({ id: "section-study", parentId: null, title: "学习", slug: "study", topics: ["学习"] }),
  page({ id: "page-xinsheng", parentId: "section-study", title: "新生必看", slug: "xinsheng", topics: ["学习", "新生"] }),
  page({ id: "page-zhuanye", parentId: "section-study", title: "不喜欢本专业 / 想学其他专业", slug: "zhuanye", topics: ["学习"] }),
  page({ id: "page-english", parentId: "section-study", title: "英语", slug: "english", topics: ["学习", "考试"] }),
  page({ id: "page-jidian", parentId: "section-study", title: "学分、绩点、二课分、综测", slug: "jidian", topics: ["学习"] }),
  page({ id: "page-fuxiu", parentId: "section-study", title: "辅修 & 第二学士学位", slug: "fuxiu", topics: ["学习"] }),
  page({ id: "page-ticao", parentId: "section-study", title: "校园跑 & 体测", slug: "ticao", topics: ["学习", "体育"] }),
  page({ id: "page-zaowan", parentId: "section-study", title: "早点到 & 晚自习", slug: "zaowan", topics: ["学习"] }),
  page({ id: "page-baoyan", parentId: "section-study", title: "保研", slug: "baoyan", topics: ["学习"] }),
  page({ id: "page-bangan", parentId: "section-study", title: "班干部", slug: "bangan", topics: ["学习"] }),
  page({ id: "page-pingjiang", parentId: "section-study", title: "评奖评优", slug: "pingjiang", topics: ["学习"] }),
  page({ id: "page-dachuang", parentId: "section-study", title: "大创项目 & 科研训练项目", slug: "dachuang", topics: ["学习", "科研"] }),

  page({ id: "section-life", parentId: null, title: "生活", slug: "life", topics: ["生活"] }),
  page({ id: "page-bibei", parentId: "section-life", title: "必备物品", slug: "bibei", topics: ["生活"] }),
  page({ id: "page-wangluo", parentId: "section-life", title: "网络与流量卡（“校园卡”）", slug: "wangluo", topics: ["生活", "网络"] }),
  page({ id: "page-ncucard", parentId: "section-life", title: "NCU 校园卡简介", slug: "ncucard", topics: ["生活"] }),
  page({ id: "page-shiwu", parentId: "section-life", title: "失物招领 & 寻物启事", slug: "shiwu", topics: ["生活"] }),
  page({ id: "page-xiaoyi", parentId: "section-life", title: "校医院就医", slug: "xiaoyi", topics: ["生活", "医疗"] }),
  page({ id: "page-xuezheng", parentId: "section-life", title: "学生证", slug: "xuezheng", topics: ["生活"] }),
  page({ id: "page-baoxiu", parentId: "section-life", title: "报修指南", slug: "baoxiu", topics: ["生活"] }),
  page({ id: "page-qinshi", parentId: "section-life", title: "寝室生活", slug: "qinshi", topics: ["生活", "宿舍"] }),
  page({ id: "page-chuxing", parentId: "section-life", title: "校内出行", slug: "chuxing", topics: ["生活", "交通"] }),
  page({ id: "page-xiaowai", parentId: "section-life", title: "校外交通", slug: "xiaowai", topics: ["生活", "交通"] }),
  page({ id: "page-shetuan", parentId: "section-life", title: "社团介绍", slug: "shetuan", topics: ["生活", "社团"] }),
  page({ id: "page-yundong", parentId: "section-life", title: "运动", slug: "yundong", topics: ["生活", "体育"] }),
  page({ id: "page-chifan", parentId: "section-life", title: "吃饭", slug: "chifan", topics: ["生活"] }),
  page({ id: "page-youwan", parentId: "section-life", title: "校外游玩", slug: "youwan", topics: ["生活"] }),

  page({ id: "section-exp", parentId: null, title: "经验包", slug: "exp", topics: ["经验"] }),
  page({ id: "page-exp0", parentId: "section-exp", title: "经验包（整理中）", slug: "exp0", topics: ["经验"] }),

  // 旧示例页面仅为测试与接口兼容保留，不进入用户目录。
  page({ id: "section-onboarding", parentId: null, title: "入学报到（未改编兼容）", slug: "onboarding", topics: ["新生"] }),
  page({ id: "section-campus-life", parentId: null, title: "校园生活（未改编兼容）", slug: "campus-life", topics: ["生活"] }),
  page({ id: "section-academics", parentId: null, title: "学习考试（未改编兼容）", slug: "academics", topics: ["学习"] }),
  page({ id: "section-services", parentId: null, title: "办事服务（未改编兼容）", slug: "services", topics: ["服务"] }),
  page({ id: "page-campus-transport", parentId: "section-campus-life", title: "校园交通", slug: "campus-transport", topics: ["生活", "交通"] }),
  page({ id: "page-campus-shuttle", parentId: "page-campus-transport", title: "校园环游车乘坐指南", slug: "campus-shuttle", topics: ["生活", "交通"] }),
  page({ id: "page-rich-content", parentId: "section-campus-life", title: "富内容展示", slug: "rich-content-guide", topics: ["生活", "示例"] }),
];

const genericPrototypeBlocks: Block[] = [
  {
    id: "prototype-placeholder",
    anchor: "b-prototype-placeholder",
    type: "callout",
    tone: "info",
    richText: text("这一篇的正文尚未迁入原型，结构与排版同「校内出行」示例。内容以线上版为准。"),
    children: [],
  },
];

const whyBlocks: Block[] = [
  { id: "why-quote", anchor: "b-why-quote", type: "quote", richText: text("是什么曾经拯救过你，你最好就用它来更好地拯救这个世界。"), children: [] },
  { id: "why-p1", anchor: "b-why-p1", type: "paragraph", richText: text("在高考完毕业的那个暑假，一直被一股未知的焦虑捆绑，也在互联网上刷了太多关于大学的帖子。说大学是小社会，又说大学是象牙塔。很多完全没有接触的概念扑面而来：学分、绩点、选修课……对这种未知的恐惧让我迫切想找到一份能解读大学的「教材」。") },
  { id: "why-p2", anchor: "b-why-p2", type: "paragraph", richText: rich("于是《金榜题名之后：大学生出路分化之谜》出现在我的视野，后面又发现了", { text: "上海交通大学生存手册", href: "https://survivesjtu.gitbook.io/survivesjtumanual" }, "。非常感谢所有撰写学生手册的前辈们，正是他们探索付出所带领的潮头，才有了后续这些如雨后春笋冒出的生存手册。") },
  {
    id: "why-files",
    anchor: "b-why-files",
    type: "callout",
    tone: "info",
    richText: text("电子书推荐导入微信读书阅读："),
    children: [
      { id: "why-file-jinbang", anchor: "b-why-file-jinbang", type: "file", assetId: "why-file-jinbang", name: "金榜题名之后.pdf" },
      { id: "why-file-sjtu", anchor: "b-why-file-sjtu", type: "file", assetId: "why-file-sjtu", name: "上海交通大学学生生存手册.pdf" },
    ],
  },
  { id: "why-p3", anchor: "b-why-p3", type: "paragraph", richText: text("每次和学长学姐闲聊、机缘巧合获取一些信息时，总忍不住感叹大学那坚厚的信息壁垒。看到那么多前辈为了降低信息差甘愿奉献，我就想：为什么南昌大学不可以有一个呢？于是有了这个手册。") },
  { id: "why-other", anchor: "b-why-other", type: "heading", level: 2, richText: text("其他大学的优秀手册") },
  { id: "why-links", anchor: "b-why-links", type: "bulleted-list", items: [
    { id: "why-link-1", richText: rich({ text: "sustech.online", href: "https://sustech.online" }), children: [] },
    { id: "why-link-2", richText: rich({ text: "重庆大学资源共享计划", href: "#b-why-other" }), children: [] },
    { id: "why-link-3", richText: rich({ text: "复旦生存手册 | Fudan Manual", href: "#b-why-other" }), children: [] },
  ] },
];

const phonesBlocks: Block[] = [
  { id: "phones-h1", anchor: "b-phones-h1", type: "heading", level: 2, richText: text("报警电话") },
  { id: "phones-list-1", anchor: "b-phones-list-1", type: "bulleted-list", items: [
    "83969110（前湖校区）", "83969119（前湖校区火警）", "88304110（青山湖北校区）", "88305110（青山湖南校区）", "86360110（东湖校区）",
  ].map((value, index) => ({ id: `phones-a-${index}`, richText: text(value), children: [] })) },
  { id: "phones-h2", anchor: "b-phones-h2", type: "heading", level: 2, richText: text("身份证、户籍服务") },
  { id: "phones-list-2", anchor: "b-phones-list-2", type: "bulleted-list", items: [
    "83969172、83969160（前湖校区）", "86363816（东湖校区）", "88304854（青山湖校区）",
  ].map((value, index) => ({ id: `phones-b-${index}`, richText: text(value), children: [] })) },
  { id: "phones-h3", anchor: "b-phones-h3", type: "heading", level: 2, richText: text("公寓门禁") },
  { id: "phones-door", anchor: "b-phones-door", type: "paragraph", richText: rich({ text: "18070031613（24 小时）", bold: true }) },
];

const travelBlocks: Block[] = [
  { id: "travel-h1", anchor: "b-travel-h1", type: "heading", level: 2, richText: text("校园环游车") },
  { id: "travel-photo", anchor: "b-travel-photo", type: "image", assetId: "asset-travel-photo" },
  { id: "travel-p1", anchor: "b-travel-p1", type: "paragraph", richText: rich("环游车分两类：一类像巴士，内部和公交车差不多；另一类小巧，被同学们称为「宝宝巴士」。", { text: "在路上碰到可以「招手即停」，下车也可以「随叫随停」。", bold: true }) },
  { id: "travel-notice", anchor: "b-travel-notice", type: "callout", tone: "info", richText: rich("运行时间约 07:00–21:30，高峰 6 分钟/班，平峰 12 分钟/班。\n收费 ", { text: "0.9 元", bold: true }, "：支付宝「出行」开通洪城一卡通，或扫车上二维码付款。"), children: [] },
  { id: "travel-p2", anchor: "b-travel-p2", type: "paragraph", richText: rich("环游车分两条路线（车辆轨迹可在 ", { text: "school-map.ncuos.com", href: "https://school-map.ncuos.com" }, " 查看）：") },
  { id: "travel-routes", anchor: "b-travel-routes", type: "bulleted-list", items: [
    { id: "travel-route-1", richText: rich({ text: "蓝色牌「天健→医学院（往返）」", bold: true }, "：长途车，白帆运动场 → 五四大道 → 天健园 → 北院 5 号门 → 前湖南院 → 南院商业街，原路返回。"), children: [] },
    { id: "travel-route-2", richText: rich({ text: "红色牌「天健→白帆（往返）」", bold: true }, "：短途车，不前往医学院。"), children: [] },
    { id: "travel-route-3", richText: text("「宝宝巴士」只在北院行驶：校医院 — 天健园。"), children: [] },
  ] },
  { id: "travel-bike-h", anchor: "b-travel-bike-h", type: "heading", level: 2, richText: text("青桔单车") },
  { id: "travel-bike-p", anchor: "b-travel-bike-p", type: "paragraph", richText: rich("滴滴出行 App、青桔小程序、微信或支付宝扫码使用。单次 1.4 元 / 30 分钟，月卡 6.9 元/月不限次。", { text: "须在规定停放点停车", bold: true }, "，校园专享车骑出校外会收调度费。") },
  { id: "travel-campus-h", anchor: "b-travel-campus-h", type: "heading", level: 2, richText: text("跨校区") },
  { id: "travel-campus-p", anchor: "b-travel-campus-p", type: "paragraph", richText: text("主要通过校园公交车往返各校区。") },
  { id: "travel-timetable", anchor: "b-travel-timetable", type: "image", assetId: "asset-travel-timetable" },
];

const networkBlocks: Block[] = [
  { id: "network-about", anchor: "b-network-about", type: "heading", level: 1, richText: text("关于网络") },
  { id: "network-public", anchor: "b-network-public", type: "heading", level: 2, richText: text("教学办公区网络服务") },
  { id: "network-public-p1", anchor: "b-network-public-p1", type: "paragraph", richText: rich("学校在教学办公区提供", { text: "免费网络服务", bold: true }, "。首次使用前需访问", { text: "“数畅南大”门户系统", href: "http://my.ncu.edu.cn" }, "激活账号并设置密码。") },
  { id: "network-public-p2", anchor: "b-network-public-p2", type: "paragraph", richText: rich("在教学办公区连接开放无线网 ", { text: "NCUWLAN", bold: true }, "，或使用教室、实验室、图书馆自习室等区域的有线网络端口。用户名为学号，密码与综合服务门户密码一致。") },
  { id: "network-login", anchor: "b-network-login", type: "callout", tone: "info", icon: "↗", richText: rich("若浏览器没有自动弹出登录页，请手动访问 ", { text: "aaa.ncu.edu.cn", href: "http://aaa.ncu.edu.cn" }, " 完成验证。"), children: [] },
  { id: "network-dorm", anchor: "b-network-dorm", type: "heading", level: 2, richText: text("宿舍区网络服务") },
  { id: "network-dorm-p", anchor: "b-network-dorm-p", type: "paragraph", richText: text("宿舍楼内没有免费的 NCUWLAN。需要联网时可使用运营商提供的 NCU-5G、NCU-2.4G，或由寝室共同办理路由器 WiFi；办理校园电话卡时也可请工作人员铺设网线。") },
  { id: "network-privacy", anchor: "b-network-privacy", type: "callout", tone: "warning", icon: "!", richText: text("校园网络采用实名账号，请勿利用 NCUWLAN 或校园网从事违法违规活动。"), children: [] },

  { id: "network-phone-card", anchor: "b-network-phone-card", type: "heading", level: 1, richText: text("校园电话卡") },
  { id: "network-phone-card-p1", anchor: "b-network-phone-card-p1", type: "paragraph", richText: text("前湖校区可在商业街的移动、电信、联通营业厅办理；青山湖校区可在 9 栋宿舍楼下线下办理，也可以拨打运营商电话预约工作人员上门。") },
  { id: "network-cross-campus", anchor: "b-network-cross-campus", type: "callout", tone: "info", richText: rich({ text: "不建议跨校区办理。", bold: true }, "不同校区的营业点可能不便处理后续售后。"), children: [] },

  { id: "network-difference", anchor: "b-network-difference", type: "heading", level: 1, richText: text("校园卡 ≠ 校园电话卡") },
  { id: "network-difference-risk", anchor: "b-network-difference-risk", type: "callout", tone: "risk", icon: "!", richText: rich({ text: "校园卡和校园电话卡完全是两个东西。", bold: true }, "推销人员有时会把“校园电话卡”简称为“校园卡”，容易让新生误以为必须办理。"), children: [] },
  { id: "network-difference-table", anchor: "b-network-difference-table", type: "table", hasHeaderRow: true, rows: [
    { id: "network-difference-head", cells: [text("名称"), text("是什么"), text("是否必须")] },
    { id: "network-difference-campus", cells: [rich({ text: "校园卡", bold: true }), text("南昌大学学生的电子身份 ID，开学后统一发放"), text("是") ] },
    { id: "network-difference-phone", cells: [rich({ text: "校园电话卡", bold: true }), text("运营商手机套餐，并附带宿舍区网络账号"), text("否，按需办理") ] },
  ] },
  { id: "network-account", anchor: "b-network-account", type: "paragraph", richText: text("校园电话卡适合手机流量不足、需要在宿舍使用运营商校园网的同学。购买后会获赠网络账号，可登录 NCU-5G、NCU-2.4G；一个账号通常只能同时登录有限数量的设备。") },
  { id: "network-apply", anchor: "b-network-apply", type: "heading", level: 2, richText: text("怎么办理") },
  { id: "network-apply-steps", anchor: "b-network-apply-steps", type: "numbered-list", items: [
    { id: "network-apply-1", richText: text("单独办理一个新手机号码，并使用学号完成学生身份绑定。"), children: [] },
    { id: "network-apply-2", richText: text("确认套餐价格、流量、可登录设备数和合约期。"), children: [] },
    { id: "network-apply-3", richText: text("由运营商用新号码开通宿舍无线或有线网络账号。"), children: [] },
  ] },
  { id: "network-package", anchor: "b-network-package", type: "heading", level: 2, richText: text("套餐与合约期") },
  { id: "network-package-p", anchor: "b-network-package-p", type: "paragraph", richText: text("三家运营商的校园套餐内容和价格接近，常见月租约 39 元，每年可能调整。校园电话卡通常有一至两年的合约期，到期后可能恢复较高资费；办理前应问清到期价格、注销条件和违约规则。") },
  { id: "network-keep-number", anchor: "b-network-keep-number", type: "callout", tone: "info", icon: "💡", richText: text("建议保留原来的手机号码。江西本省用户可向运营商咨询 8 元保号套餐：电信 10000、移动 10086、联通 10010；外省用户可根据原套餐流量决定。"), children: [] },
  { id: "network-roommate", anchor: "b-network-roommate", type: "callout", tone: "info", icon: "💡", richText: rich({ text: "寝室组网建议", bold: true }, "\n可以和室友商量办理同一运营商的电话卡，共同购买一台路由器（约 100–200 元），再请营业厅安装寝室 WiFi。路由器更推荐自行购买，网线可自备或在营业厅购买。"), children: [] },
  { id: "network-decision", anchor: "b-network-decision", type: "heading", level: 2, richText: text("我到底要不要办") },
  { id: "network-decision-table", anchor: "b-network-decision-table", type: "table", hasHeaderRow: true, rows: [
    { id: "network-decision-head", cells: [text("使用情况"), text("建议")] },
    { id: "network-decision-heavy", cells: [text("流量需求大，经常待在寝室"), rich({ text: "值得办理", bold: true })] },
    { id: "network-decision-game", cells: [text("玩在线多人游戏，需要稳定有线网络"), rich({ text: "值得办理", bold: true })] },
    { id: "network-decision-light", cells: [text("原手机卡流量够用，尤其是外省同学"), rich({ text: "不必办理", bold: true })] },
    { id: "network-decision-study", cells: [text("长期在教学楼、图书馆，主要使用公共 WiFi"), rich({ text: "不必办理", bold: true })] },
  ] },
];

const dormBlocks: Block[] = [
  { id: "dorm-condition", anchor: "b-dorm-condition", type: "heading", level: 1, richText: text("宿舍状况") },
  { id: "dorm-bathroom", anchor: "b-dorm-bathroom", type: "heading", level: 2, richText: text("独立卫浴") },
  { id: "dorm-bathroom-p", anchor: "b-dorm-bathroom-p", type: "paragraph", richText: text("医学院宿舍有独立卫浴；前湖校区其余宿舍楼通常为每层 2–4 个公共卫生间。其他楼栋宿舍内一般有洗手池。") },
  { id: "dorm-bathroom-risk", anchor: "b-dorm-bathroom-risk", type: "callout", tone: "warning", icon: "!", richText: text("前湖校区修贤 1–4 栋宿舍内没有洗手池，洗漱、清洗水果和衣物都需要前往公共卫生间。"), children: [] },
  { id: "dorm-bed", anchor: "b-dorm-bed", type: "heading", level: 2, richText: text("上床下桌") },
  { id: "dorm-bed-list", anchor: "b-dorm-bed-list", type: "bulleted-list", items: [
    { id: "dorm-bed-qianhu", richText: text("前湖校区：四人寝，上床下桌。修贤 1–4 栋为爬梯式上铺，其他楼栋多为楼梯式上铺。"), children: [] },
    { id: "dorm-bed-qingshanhu", richText: text("青山湖校区：五人寝，上床下桌。"), children: [] },
  ] },
  { id: "dorm-ladder", anchor: "b-dorm-ladder", type: "callout", tone: "warning", richText: text("爬梯式上铺较陡，上下床时请扶稳梯子，避免手滑跌落。"), children: [] },
  { id: "dorm-size", anchor: "b-dorm-size", type: "heading", level: 2, richText: text("床铺数据") },
  { id: "dorm-size-table", anchor: "b-dorm-size-table", type: "table", hasHeaderRow: true, rows: [
    { id: "dorm-size-head", cells: [text("项目"), text("参考尺寸")] },
    { id: "dorm-size-bed", cells: [text("床铺"), text("2 m × 0.9 m（内长约 1.95 m × 0.85 m）")] },
    { id: "dorm-size-mat", cells: [text("凉席建议"), text("1.9 m × 0.9 m")] },
    { id: "dorm-size-height", cells: [text("床到天花板"), text("约 1.1–1.3 m")] },
    { id: "dorm-size-curtain", cells: [text("床帘建议"), text("1.9 m × 0.9 m × 1.1 m")] },
  ] },

  { id: "dorm-life", anchor: "b-dorm-life", type: "heading", level: 1, richText: text("宿舍生活") },
  { id: "dorm-laundry", anchor: "b-dorm-laundry", type: "heading", level: 2, richText: text("智慧洗衣房") },
  { id: "dorm-laundry-p", anchor: "b-dorm-laundry-p", type: "paragraph", richText: text("每栋宿舍楼都配有洗衣房，或在楼层设置洗衣区。") },
  { id: "dorm-laundry-steps", anchor: "b-dorm-laundry-steps", type: "numbered-list", items: [
    { id: "dorm-laundry-1", richText: text("下载 U 净 App。"), children: [] },
    { id: "dorm-laundry-2", richText: text("扫描洗衣机机身二维码。"), children: [] },
    { id: "dorm-laundry-3", richText: text("选择洗衣模式并用手机支付。"), children: [] },
    { id: "dorm-laundry-4", richText: text("在手机上查看进度并接收完成提醒。"), children: [] },
  ] },
  { id: "dorm-laundry-price", anchor: "b-dorm-laundry-price", type: "heading", level: 3, richText: text("价格") },
  { id: "dorm-laundry-table", anchor: "b-dorm-laundry-table", type: "table", hasHeaderRow: true, rows: [
    { id: "dorm-laundry-head", cells: [text("设备"), text("程序"), text("价格"), text("建议容量")] },
    { id: "dorm-laundry-spin", cells: [text("滚筒洗衣机"), text("单脱水"), text("0.1 元/桶"), text("至多 1/3 桶")] },
    { id: "dorm-laundry-quick", cells: [text("滚筒洗衣机"), text("快洗"), text("2.3 元/桶"), text("约 1/2 桶")] },
    { id: "dorm-laundry-standard", cells: [text("滚筒洗衣机"), text("标准洗"), text("2.8 元/桶"), text("约 2/3 桶")] },
    { id: "dorm-laundry-large", cells: [text("滚筒洗衣机"), text("大物洗"), text("3.5 元/桶"), text("约 3/4 桶")] },
    { id: "dorm-dryer-low", cells: [text("烘干机"), text("低温烘"), text("0.5 元/10 分钟"), text("时间可选")] },
    { id: "dorm-dryer-medium", cells: [text("烘干机"), text("中温烘"), text("0.8 元/10 分钟"), text("时间可选")] },
    { id: "dorm-dryer-high", cells: [text("烘干机"), text("高温烘"), text("0.9 元/10 分钟"), text("时间可选")] },
    { id: "dorm-dryer-down", cells: [text("烘干机"), text("羽绒服烘"), text("1 元/10 分钟"), text("时间可选")] },
    { id: "dorm-shoes", cells: [text("洗鞋机"), text("标准洗"), text("2.5 元/次"), text("2–3 双鞋")] },
  ] },
  { id: "dorm-laundry-risk", anchor: "b-dorm-laundry-risk", type: "callout", tone: "warning", icon: "!", richText: text("不要把私人贴身衣物放入公共洗衣机。"), children: [] },

  { id: "dorm-rules", anchor: "b-dorm-rules", type: "heading", level: 1, richText: text("宿舍规章制度") },
  { id: "dorm-power", anchor: "b-dorm-power", type: "heading", level: 2, richText: text("宿舍断电") },
  { id: "dorm-power-time", anchor: "b-dorm-power-time", type: "callout", tone: "info", richText: rich({ text: "断电时间", bold: true }, "\n周日至周四：23:00–次日 6:00\n周五至周六：0:00–次日 6:00"), children: [] },
  { id: "dorm-power-list", anchor: "b-dorm-power-list", type: "bulleted-list", items: [
    { id: "dorm-power-1", richText: text("熄灯和普通插座断开，WLAN 是否断开因楼栋而异。"), children: [] },
    { id: "dorm-power-2", richText: text("空调、电风扇、饮水机通常不受影响。"), children: [] },
    { id: "dorm-power-3", richText: text("本部走廊、卫生间以及医学部卫生间不断电。"), children: [] },
  ] },
  { id: "dorm-power-limit", anchor: "b-dorm-power-limit", type: "callout", tone: "warning", icon: "!", richText: rich("单个用电设备功率不可以超过 ", { text: "800 W", bold: true }, "。"), children: [] },
  { id: "dorm-hot-water", anchor: "b-dorm-hot-water", type: "heading", level: 2, richText: text("热水服务") },
  { id: "dorm-hot-water-p", anchor: "b-dorm-hot-water-p", type: "paragraph", richText: text("学校的热水服务包含公共浴室开水器、宿舍直饮水和淋浴间花洒。") },
  { id: "dorm-hot-water-table", anchor: "b-dorm-hot-water-table", type: "table", hasHeaderRow: true, rows: [
    { id: "dorm-hot-water-head", cells: [text("服务"), text("供应时间"), text("收费")] },
    { id: "dorm-hot-water-boil", cells: [text("开水器"), text("06:00–00:00"), text("0.1 元/升")] },
    { id: "dorm-hot-water-drink", cells: [text("宿舍直饮水"), text("全天"), text("0.32 元/升")] },
    { id: "dorm-hot-water-shower", cells: [text("淋浴热水"), text("06:30–08:00、12:00–14:00、17:00–00:00"), text("0.047 元/升")] },
  ] },
  { id: "dorm-hot-water-use", anchor: "b-dorm-hot-water-use", type: "bulleted-list", items: [
    { id: "dorm-hot-water-mini", richText: rich({ text: "微信小程序“一合物联”", bold: true }, "：扫描宿舍饮水机二维码，获取直饮水。"), children: [] },
    { id: "dorm-hot-water-cloud", richText: rich({ text: "云闪付小程序“一合智慧校园”", bold: true }, "：通过手机蓝牙连接淋浴设备并扫码支付，也可办理水卡。"), children: [] },
  ] },

  { id: "dorm-repair", anchor: "b-dorm-repair", type: "heading", level: 1, richText: text("宿舍报修") },
  { id: "dorm-repair-list", anchor: "b-dorm-repair-list", type: "bulleted-list", items: [
    { id: "dorm-repair-logistics", richText: rich({ text: "故障报修", bold: true }, "：在“南昌大学后勤”公众号进入“智能报修”。"), children: [] },
    { id: "dorm-repair-rights", richText: rich({ text: "权益反馈", bold: true }, "：在“南昌大学学生会”公众号进入“香樟权益”。"), children: [] },
  ] },

  { id: "dorm-electricity", anchor: "b-dorm-electricity", type: "heading", level: 1, richText: text("电费") },
  { id: "dorm-electricity-check", anchor: "b-dorm-electricity-check", type: "heading", level: 2, richText: text("查看与充值") },
  { id: "dorm-electricity-steps", anchor: "b-dorm-electricity-steps", type: "numbered-list", items: [
    { id: "dorm-electricity-1", richText: text("查看电量：打开南大家园，进入“生活 → 电量查询”。"), children: [] },
    { id: "dorm-electricity-2", richText: text("线上充值（推荐）：打开企业微信，选择“一码通 → 宿舍缴电费”。"), children: [] },
    { id: "dorm-electricity-3", richText: text("线下充值：在建行 App 进入“悦享生活 → 校园卡充值”，然后到食堂或宿舍楼下领款机领款。"), children: [] },
    { id: "dorm-electricity-4", richText: text("到宿舍楼下智能充电机操作；校园卡初始密码为身份证后六位，末位 X 时以数字 0 代替。"), children: [] },
  ] },
  { id: "dorm-electricity-note", anchor: "b-dorm-electricity-note", type: "callout", tone: "info", richText: text("校园卡第一次使用需要激活，连续半年未使用也需要重新补激活。"), children: [] },
];

const prototypeBlocksByPageId: Record<string, Block[]> = {
  "page-why": whyBlocks,
  "page-phones": phonesBlocks,
  "page-jiayuan": genericPrototypeBlocks,
  "page-major": genericPrototypeBlocks,
  "page-general": genericPrototypeBlocks,
  "page-xinsheng": freshmanNotionBlocks,
  "page-zhuanye": genericPrototypeBlocks,
  "page-english": genericPrototypeBlocks,
  "page-jidian": genericPrototypeBlocks,
  "page-fuxiu": genericPrototypeBlocks,
  "page-ticao": genericPrototypeBlocks,
  "page-zaowan": genericPrototypeBlocks,
  "page-baoyan": genericPrototypeBlocks,
  "page-bangan": genericPrototypeBlocks,
  "page-pingjiang": genericPrototypeBlocks,
  "page-dachuang": genericPrototypeBlocks,
  "page-bibei": genericPrototypeBlocks,
  "page-wangluo": networkBlocks,
  "page-ncucard": genericPrototypeBlocks,
  "page-shiwu": genericPrototypeBlocks,
  "page-xiaoyi": genericPrototypeBlocks,
  "page-xuezheng": genericPrototypeBlocks,
  "page-baoxiu": genericPrototypeBlocks,
  "page-qinshi": dormBlocks,
  "page-chuxing": travelBlocks,
  "page-xiaowai": genericPrototypeBlocks,
  "page-shetuan": genericPrototypeBlocks,
  "page-yundong": genericPrototypeBlocks,
  "page-chifan": genericPrototypeBlocks,
  "page-youwan": genericPrototypeBlocks,
  "page-exp0": genericPrototypeBlocks,
};

const sectionBlocks: Block[] = [
  { id: "section-intro", anchor: "b-section-intro", type: "paragraph", richText: text("从住宿、交通到日常服务，整理在南大生活时最常遇到的信息。") },
];

const onboardingBlocks: Block[] = [
  { id: "onboarding-intro", anchor: "b-onboarding-intro", type: "paragraph", richText: text("从报到材料、到校路线到入住宿舍，集中整理新生最先需要的信息。") },
];

const academicBlocks: Block[] = [
  { id: "academic-intro", anchor: "b-academic-intro", type: "paragraph", richText: text("课程、考试、成绩与培养环节相关信息。") },
];

const serviceBlocks: Block[] = [
  { id: "service-intro", anchor: "b-service-intro", type: "paragraph", richText: text("校园卡、网络、报修与常用办事入口。") },
];

const transportBlocks: Block[] = [
  { id: "transport-intro", anchor: "b-transport-intro", type: "paragraph", richText: text("校内交通包含环游车、单车与校区间接驳信息。") },
];

const shuttleBlocks: Block[] = [
  { id: "shuttle-intro", anchor: "b-shuttle-intro", type: "paragraph", richText: text("校园环游车连接前湖北院、南院与主要教学区域，适合校内较长距离通行。") },
  { id: "fare-heading", anchor: "b-fare-heading", type: "heading", level: 2, richText: text("路线与收费") },
  { id: "fare", anchor: "b-fare", type: "paragraph", richText: text("单次收费 0.9 元，可使用支付宝洪城一卡通或扫描车载二维码付款。") },
];

const richBlocks: Block[] = [
  { id: "rich-paragraph", anchor: "b-rich-paragraph", type: "paragraph", richText: text("这是一段保留原始结构的正文。") },
  { id: "rich-quote", anchor: "b-rich-quote", type: "quote", richText: text("内容结构不应在迁移时被压平。"), children: [] },
  { id: "rich-heading", anchor: "b-rich-heading", type: "heading", level: 2, richText: text("富内容示例") },
  {
    id: "rich-bullets",
    anchor: "b-rich-bullets",
    type: "bulleted-list",
    items: [{ id: "bullet-one", richText: text("保留无序列表"), children: [] }],
  },
  {
    id: "rich-numbers",
    anchor: "b-rich-numbers",
    type: "numbered-list",
    items: [{ id: "number-one", richText: text("保留有序步骤"), children: [] }],
  },
  { id: "rich-divider", anchor: "b-rich-divider", type: "divider" },
  {
    id: "rich-callout",
    anchor: "b-rich-callout",
    type: "callout",
    tone: "info",
    icon: "info",
    richText: text("这是一条低干扰提示。"),
    children: [{
      id: "rich-callout-list",
      anchor: "b-rich-callout-list",
      type: "bulleted-list",
      items: [{ id: "rich-callout-item", richText: text("提示块内的原始子内容会被保留。"), children: [] }],
    }],
  },
  {
    id: "rich-table",
    anchor: "b-rich-table",
    type: "table",
    hasHeaderRow: true,
    rows: [
      { id: "table-row-header", cells: [text("项目"), text("说明")] },
      { id: "table-row-fare", cells: [text("费用"), text("0.9 元")] },
    ],
  },
  { id: "rich-image", anchor: "b-rich-image", type: "image", assetId: "asset-campus-map", caption: text("校园交通路线示意") },
  { id: "rich-file", anchor: "b-rich-file", type: "file", assetId: "asset-guide-pdf", name: "校园生活指南.pdf", caption: text("附件示例") },
  {
    id: "rich-columns",
    anchor: "b-rich-columns",
    type: "columns",
    columns: [
      { id: "column-one", blocks: [{ id: "column-one-text", anchor: "b-column-one-text", type: "paragraph", richText: text("左列内容") }] },
      { id: "column-two", blocks: [{ id: "column-two-text", anchor: "b-column-two-text", type: "paragraph", richText: text("右列内容") }] },
    ],
  },
  { id: "rich-embed", anchor: "b-rich-embed", type: "embed", provider: "school-map", canonicalUrl: "https://school-map.ncuos.com/", title: "校园地图" },
  { id: "rich-page-link", anchor: "b-rich-page-link", type: "page-link", pageId: "page-campus-shuttle", richText: text("查看校园环游车乘坐指南") },
];

export const searchIndexFixture: SearchIndexEntry[] = [
  {
    id: `${fixtureContentVersion}-shuttle-intro`, schemaVersion: 1, contentVersion: fixtureContentVersion, pageId: "page-campus-shuttle", pageTitle: "校园环游车乘坐指南",
    sectionPath: ["校园生活", "校园交通"], anchor: "b-shuttle-intro", plainText: "校园环游车连接前湖北院、南院与主要教学区域，适合校内较长距离通行。",
    blockType: "paragraph", updatedAt: publishedAt,
  },
  {
    id: `${fixtureContentVersion}-fare`, schemaVersion: 1, contentVersion: fixtureContentVersion, pageId: "page-campus-shuttle", pageTitle: "校园环游车乘坐指南",
    sectionPath: ["校园生活", "校园交通", "路线与收费"], anchor: "b-fare", plainText: "单次收费 0.9 元，可使用支付宝洪城一卡通或扫描车载二维码付款。",
    blockType: "paragraph", updatedAt: publishedAt,
  },
];

export const publishedFixture: PublishedFixture = {
  pages: pagesFixture,
  blocksByPageId: {
    ...prototypeBlocksByPageId,
    "section-onboarding": onboardingBlocks,
    "section-campus-life": sectionBlocks,
    "section-academics": academicBlocks,
    "section-services": serviceBlocks,
    "page-campus-transport": transportBlocks,
    "page-campus-shuttle": shuttleBlocks,
    "page-rich-content": richBlocks,
  },
  assets: [
    { id: "asset-travel-photo", sourceBlockId: "travel-photo", contentVersion: fixtureContentVersion, kind: "image", publicUrl: "/images/prototype-travel-photo.svg", checksum: "prototype-travel-photo", alt: "环游车照片 × 2" },
    { id: "asset-travel-timetable", sourceBlockId: "travel-timetable", contentVersion: fixtureContentVersion, kind: "image", publicUrl: "/images/prototype-timetable.svg", checksum: "prototype-timetable", alt: "校车时刻表" },
    { id: "asset-campus-map", sourceBlockId: "rich-image", contentVersion: fixtureContentVersion, kind: "image", publicUrl: "/images/campus-map.svg", checksum: "fixture-map", alt: "校园交通路线示意图" },
    { id: "asset-guide-pdf", sourceBlockId: "rich-file", contentVersion: fixtureContentVersion, kind: "file", publicUrl: "/files/campus-life-guide.pdf", checksum: "fixture-guide" },
  ],
  searchIndex: searchIndexFixture,
};

export class FixtureContentRepository implements ContentRepository {
  private fixture: PublishedFixture;

  constructor(fixture: PublishedFixture = publishedFixture) {
    this.fixture = fixture;
  }

  getContentVersion = (): string => {
    return fixtureContentVersion;
  };

  resolvePageRoute = (pageId: string): string => {
    const page = this.fixture.pages.find((candidate) => candidate.id === pageId);
    if (!page) throw new Error(`Unknown published page: ${pageId}`);
    return page.parentId === null ? `/sections/${page.slug}` : `/docs/${page.slug}`;
  };

  private childrenOf = (parentId: string): PageTreeNode[] =>
    this.fixture.pages
      .filter((page) => page.parentId === parentId && page.status === "published")
      .map((page) => ({
        id: page.id,
        title: page.title,
        href: this.resolvePageRoute(page.id),
        children: this.childrenOf(page.id),
      }));

  getDocument = async (slug: string): Promise<DocumentView | null> => {
    const page = this.fixture.pages.find((candidate) => candidate.slug === slug && candidate.status === "published");
    if (!page) return null;
    const blocks = this.fixture.blocksByPageId[page.id] ?? [];
    return { page, blocks, description: firstPlainText(blocks), assets: this.fixture.assets };
  };

  getDocumentView = async (slug: string): Promise<DocumentView | null> => {
    return this.getDocument(slug);
  };

  getSection = async (slug: string): Promise<SectionView | null> => {
    const view = await this.getDocument(slug);
    return view?.page.parentId === null ? view : null;
  };

  getSectionView = async (slug: string): Promise<SectionView | null> => {
    return this.getSection(slug);
  };

  getPublishedSections = async (): Promise<Page[]> => {
    return this.fixture.pages.filter((page) => page.parentId === null && page.status === "published");
  };

  getSectionTree = async (sectionSlug: string): Promise<PageTreeNode[]> => {
    const section = this.fixture.pages.find((page) => page.slug === sectionSlug && page.parentId === null);
    return section ? this.childrenOf(section.id) : [];
  };

  getSectionChildren = async (sectionSlug: string): Promise<Page[]> => {
    const section = this.fixture.pages.find((page) => page.slug === sectionSlug && page.parentId === null);
    return section ? this.fixture.pages.filter((page) => page.parentId === section.id && page.status === "published") : [];
  };

  getSectionForPage = async (pageId: string): Promise<Page | null> => {
    let page = this.fixture.pages.find((candidate) => candidate.id === pageId) ?? null;
    while (page?.parentId) page = this.fixture.pages.find((candidate) => candidate.id === page?.parentId) ?? null;
    return page?.parentId === null ? page : null;
  };

  getAsset = async (assetId: string): Promise<Asset | null> => {
    return this.fixture.assets.find((asset) => asset.id === assetId) ?? null;
  };

  getSearchIndex = async (): Promise<SearchIndexEntry[]> => {
    return [...this.fixture.searchIndex];
  };

  getPageRoutes = async (): Promise<Record<string, string>> => {
    return Object.fromEntries(this.fixture.pages.map((page) => [page.id, this.resolvePageRoute(page.id)]));
  };
}

function firstPlainText(blocks: Block[]): string {
  for (const block of blocks) {
    if ("richText" in block) return block.richText.map((item) => item.plainText).join("");
  }
  return "";
}

export function createFixtureRepository(fixture?: PublishedFixture): ContentRepository {
  return new FixtureContentRepository(fixture);
}

const defaultFixtureRepo = new FixtureContentRepository();
export const getAsset = (assetId: string): Asset | null =>
  publishedFixture.assets.find((asset) => asset.id === assetId) ?? null;
export const getDocumentView = defaultFixtureRepo.getDocumentView;
export const getSectionChildren = defaultFixtureRepo.getSectionChildren;
export const getSectionForPage = defaultFixtureRepo.getSectionForPage;
export const getSectionTree = defaultFixtureRepo.getSectionTree;
export const getSectionView = defaultFixtureRepo.getSectionView;
export const getPublishedSections = defaultFixtureRepo.getPublishedSections;
export const resolvePageRoute = defaultFixtureRepo.resolvePageRoute;
