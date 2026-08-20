// 核心工具：章节二级分类（Group）映射表、分组排序器与 Admin 配置管理
import type { PageTreeNode } from "@/lib/content/server";

// 默认标准二级分组映射（用于在未自定义配置时开箱即用）
export const DEFAULT_SECTION_GROUP_ORDER: Record<string, string[]> = {
  学习: ["入学必看", "考试", "基本认识", "评优评先"],
  生活: ["常识", "重要信息", "休闲"],
  课程: ["培养方案", "选课攻略"],
  黄页: ["紧急电话", "账号指南"],
};

export const DEFAULT_ARTICLE_TO_GROUP: Record<string, Record<string, string>> = {
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
};

export type GroupedSectionBucket = {
  groupName: string | null;
  nodes: PageTreeNode[];
};

/**
 * 将某一板块下的篇目按分类桶（Bucket）进行有序归类与聚类排序，
 * 保证同一分组下的所有文章严格聚集在一起，杜绝分散与重复标题。
 */
export function groupAndSortSectionNodes(
  sectionTitle: string,
  nodes: PageTreeNode[],
  customConfig?: Record<string, Record<string, string>>
): GroupedSectionBucket[] {
  if (!nodes || nodes.length === 0) return [];

  const cleanSec = sectionTitle.replace(/[\s·]/g, "");
  const mappingConfig = customConfig || DEFAULT_ARTICLE_TO_GROUP;

  // 匹配当前板块的规则映射
  let targetGroupMap: Record<string, string> | null = null;
  for (const [secKey, gMap] of Object.entries(mappingConfig)) {
    if (cleanSec.includes(secKey) || secKey.includes(cleanSec)) {
      targetGroupMap = gMap;
      break;
    }
  }

  // 若无分组映射规则（如 写在前面、经验包、单篇），则直接作为单个无标题桶返回
  if (!targetGroupMap || Object.keys(targetGroupMap).length === 0) {
    return [{ groupName: null, nodes }];
  }

  // 依据规则将节点放入对应分组桶
  const buckets: Record<string, PageTreeNode[]> = {};
  const unmappedNodes: PageTreeNode[] = [];

  for (const node of nodes) {
    const cleanTitle = node.title.replace(/[\s·]/g, "");
    let matchedGroup: string | null = null;

    for (const [titleKey, groupName] of Object.entries(targetGroupMap)) {
      if (cleanTitle.includes(titleKey.replace(/[\s·]/g, ""))) {
        matchedGroup = groupName;
        break;
      }
    }

    if (matchedGroup) {
      const bucket = buckets[matchedGroup] ?? [];
      bucket.push(node);
      buckets[matchedGroup] = bucket;
    } else {
      unmappedNodes.push(node);
    }
  }

  const result: GroupedSectionBucket[] = [];
  const groupOrder = DEFAULT_SECTION_GROUP_ORDER[cleanSec] ?? Object.keys(buckets);

  // 按预设顺序放入结果
  for (const gName of groupOrder) {
    const bucketNodes = buckets[gName];
    if (bucketNodes && bucketNodes.length > 0) {
      result.push({ groupName: gName, nodes: bucketNodes });
      delete buckets[gName];
    }
  }

  // 放入其他动态定义的分组
  for (const [gName, gNodes] of Object.entries(buckets)) {
    if (gNodes && gNodes.length > 0) {
      result.push({ groupName: gName, nodes: gNodes });
    }
  }

  // 放入未匹配分组的文章（平铺在底部，不加蓝色前缀）
  if (unmappedNodes.length > 0) {
    result.push({ groupName: null, nodes: unmappedNodes });
  }

  return result;
}
