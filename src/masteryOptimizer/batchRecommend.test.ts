import { describe, expect, it } from 'vitest';
import { BATCH_CARD_TARGETS, BATCH_MASTERY_TARGETS } from '@/masteryOptimizer/batchRecommend';

describe('일괄 계산 대상 (특성 5개 · 카드 7개, PvP 는 따로)', () => {
  it('특성 추천 묶음 앞 대상 5개', () => {
    expect(BATCH_MASTERY_TARGETS).toHaveLength(5);
    expect(new Set(BATCH_MASTERY_TARGETS)).toEqual(
      new Set(['stage', 'globalRaidNormal', 'stageBoss', 'attributeHero', 'pvp']),
    );
  });
  it('카드 추천 묶음 앞 대상 7개', () => {
    expect(BATCH_CARD_TARGETS).toHaveLength(7);
    expect(new Set(BATCH_CARD_TARGETS)).toEqual(
      new Set(['stage', 'globalRaidNormal', 'stageBoss', 'awaken', 'attributeHero', 'nightmare', 'pvp']),
    );
  });
});
