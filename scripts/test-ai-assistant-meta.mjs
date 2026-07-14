import assert from 'node:assert/strict';
import {
  getRetrievalMeta,
  shouldShowTrustNotice,
} from '../src/components/AiAssistant/answerMeta.mjs';

const strong = getRetrievalMeta('strong', 5);
assert.equal(strong.label, '高可信命中');
assert.equal(strong.tone, 'strong');
assert.equal(shouldShowTrustNotice(strong), false);

const partial = getRetrievalMeta('partial', 2);
assert.equal(partial.label, '部分命中');
assert.equal(partial.tone, 'partial');
assert.equal(partial.notice, '已找到部分资料，请结合来源判断是否够用。');
assert.equal(shouldShowTrustNotice(partial), false);

const weak = getRetrievalMeta('weak', 1);
assert.equal(weak.label, '弱命中');
assert.equal(weak.tone, 'weak');
assert.equal(weak.notice, '资料支撑不足，这条信息需要进一步核实。');
assert.equal(shouldShowTrustNotice(weak), true);

const none = getRetrievalMeta('none', 0);
assert.equal(none.label, '未命中');
assert.equal(none.tone, 'none');
assert.equal(none.notice, '知识库暂未找到可靠来源，已作为信息缺口处理。');
assert.equal(shouldShowTrustNotice(none), true);

const missing = getRetrievalMeta('', 0);
assert.equal(missing.label, '等待检索');
assert.equal(missing.tone, 'unknown');
assert.equal(shouldShowTrustNotice(missing), false);

console.log('ai assistant metadata tests passed');
