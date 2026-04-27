#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  categoryFromSlug,
  extractDocMeta,
  markdownToNotionBlocks,
  mdxToEditableMarkdown,
  notionBlocksToMarkdown,
  slugFromDocPath,
  titleFromMarkdown,
} from "./notion-content-sync.mjs";

const sample = `---
title: Test
---
import QuoteCard from '@site/src/hight_light/QuoteCard';

# 校园网与校园电话卡

<p className="doc-meta">页面更新：2026-04-26 · 来源：<a href="https://xxwl.ncu.edu.cn/info/1010/6179.htm">校园网报修服务</a> · 待核实：运营商套餐</p>

::::warning
电话卡套餐变化频繁。
::::

## 立即办理

- 校园网认证地址
- 报修入口

1. 先确认账号
2. 再联系网信中心
`;

assert.equal(slugFromDocPath("docs/onboarding/network.md"), "onboarding/network");
assert.equal(slugFromDocPath("docs/README.mdx"), "index");
assert.equal(slugFromDocPath("docs/campus-life/software/iNCU/README.md"), "campus-life/software/iNCU");

assert.equal(categoryFromSlug("onboarding/network"), "新生");
assert.equal(categoryFromSlug("academics/exams"), "学业");
assert.equal(categoryFromSlug("campus-life/repair"), "生活");
assert.equal(categoryFromSlug("career/awards"), "发展");

assert.equal(titleFromMarkdown(sample, "fallback"), "校园网与校园电话卡");

const meta = extractDocMeta(sample);
assert.equal(meta.pageUpdated, "2026-04-26");
assert.equal(meta.verifyStatus, "待核实");
assert.match(meta.officialSources, /校园网报修服务/);
assert.match(meta.pendingVerification, /运营商套餐/);

const editable = mdxToEditableMarkdown(sample);
assert.doesNotMatch(editable, /import QuoteCard/);
assert.doesNotMatch(editable, /className/);
assert.match(editable, /> \*\*注意\*\*/);
assert.match(editable, /\[校园网报修服务\]\(https:\/\/xxwl\.ncu\.edu\.cn\/info\/1010\/6179\.htm\)/);

const blocks = markdownToNotionBlocks(editable);
assert.ok(blocks.some((block) => block.type === "heading_1"));
assert.ok(blocks.some((block) => block.type === "heading_2"));
assert.ok(blocks.some((block) => block.type === "quote"));
assert.ok(blocks.some((block) => block.type === "bulleted_list_item"));
assert.ok(blocks.some((block) => block.type === "numbered_list_item"));

const exported = notionBlocksToMarkdown(blocks);
assert.match(exported, /# 校园网与校园电话卡/);
assert.match(exported, /## 立即办理/);
assert.match(exported, /- 校园网认证地址/);

console.log("notion-content-sync conversion tests passed");
