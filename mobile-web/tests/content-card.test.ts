import { describe, expect, it } from "vitest";
import {
  filterPublishedCards,
  mapLarkRecordToCard,
} from "@/lib/content/lark-mapper";

const publishedRecord = {
  record_id: "rec_card",
  fields: {
    标题: "校园卡丢了怎么办",
    分类: "新生",
    场景标签: ["校园卡", "补办"],
    适用对象: "在校生",
    核心结论: "先挂失，再按服务点要求补办。",
    办理步骤: "1. 打开校园卡服务入口\n2. 提交挂失\n3. 到服务点补办",
    注意事项: "补卡费用和服务时间以现场为准。",
    来源类型: "官方来源",
    来源链接: "https://net.ncu.edu.cn/info/1025/4779.htm",
    更新时间: "2026-04-26",
    可信状态: "官方来源",
    审核状态: "published",
    风险等级: "medium",
    关联卡片: ["校园卡充值"],
  },
};

describe("Lark content card mapping", () => {
  it("maps a published Feishu Base record into a normalized information card", () => {
    const card = mapLarkRecordToCard(publishedRecord);

    expect(card.slug).toBe("rec_card");
    expect(card.title).toBe("校园卡丢了怎么办");
    expect(card.tags).toEqual(["校园卡", "补办"]);
    expect(card.steps).toEqual([
      "打开校园卡服务入口",
      "提交挂失",
      "到服务点补办",
    ]);
    expect(card.trustStatus).toBe("官方来源");
    expect(card.reviewStatus).toBe("published");
  });

  it("only exposes published cards to the public site and AI search", () => {
    const draft = {
      ...publishedRecord,
      record_id: "rec_draft",
      fields: {
        ...publishedRecord.fields,
        标题: "暂存的食堂经验",
        审核状态: "draft",
      },
    };

    const cards = filterPublishedCards([
      mapLarkRecordToCard(publishedRecord),
      mapLarkRecordToCard(draft),
    ]);

    expect(cards.map((card) => card.title)).toEqual(["校园卡丢了怎么办"]);
  });

  it("survives missing optional fields without breaking the card detail page", () => {
    const card = mapLarkRecordToCard({
      record_id: "rec_minimal",
      fields: {
        标题: "常用电话在哪里看",
        分类: "生活",
        核心结论: "先查看常用电话入口。",
        审核状态: "published",
      },
    });

    expect(card.tags).toEqual([]);
    expect(card.steps).toEqual([]);
    expect(card.sourceUrl).toBe("");
    expect(card.trustStatus).toBe("待核实");
  });
});
