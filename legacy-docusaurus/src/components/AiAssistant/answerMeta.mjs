export function getRetrievalMeta(retrievalState, sourceCount = 0) {
  const normalizedState = String(retrievalState || '').toLowerCase();
  const hasSources = Number(sourceCount || 0) > 0;

  if (normalizedState === 'strong') {
    return {
      label: '高可信命中',
      tone: 'strong',
      notice: '已找到较强相关资料，回答仍建议结合来源确认。',
    };
  }

  if (normalizedState === 'partial') {
    return {
      label: '部分命中',
      tone: 'partial',
      notice: '已找到部分资料，请结合来源判断是否够用。',
    };
  }

  if (normalizedState === 'weak') {
    return {
      label: '弱命中',
      tone: 'weak',
      notice: '资料支撑不足，这条信息需要进一步核实。',
    };
  }

  if (normalizedState === 'none' || !hasSources) {
    return {
      label: normalizedState === 'none' ? '未命中' : '等待检索',
      tone: normalizedState === 'none' ? 'none' : 'unknown',
      notice: normalizedState === 'none'
        ? '知识库暂未找到可靠来源，已作为信息缺口处理。'
        : '',
    };
  }

  return {
    label: '等待检索',
    tone: 'unknown',
    notice: '',
  };
}

export function shouldShowTrustNotice(meta) {
  return meta?.tone === 'weak' || meta?.tone === 'none';
}
