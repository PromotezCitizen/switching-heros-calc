import { describe, expect, it } from 'vitest';
import { BATCH_CARD_TARGETS, BATCH_MASTERY_TARGETS } from '@/masteryOptimizer/batchRecommend';

describe('일괄 계산 대상 (사용자 지시 2026-11-06: 특성 4개 · 카드 6개)', () => {
  it('특성 추천 묶음 앞 대상 4개', () => {
    expect(BATCH_MASTERY_TARGETS).toHaveLength(4);
    expect(new Set(BATCH_MASTERY_TARGETS)).toEqual(new Set(['stage', 'globalRaidNormal', 'stageBoss', 'attributeHero']));
  });
  it('카드 추천 묶음 앞 대상 6개', () => {
    expect(BATCH_CARD_TARGETS).toHaveLength(6);
    expect(new Set(BATCH_CARD_TARGETS)).toEqual(new Set(['stage', 'globalRaidNormal', 'stageBoss', 'awaken', 'attributeHero', 'nightmare']));
  });
});
