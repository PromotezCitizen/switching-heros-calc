import { describe, expect, it } from 'vitest';
import { bundleTarget, masteryBundleTarget } from '@/masteryOptimizer/targetBundles';

describe('추천을 같이 계산하는 대상 (TARGET_BUNDLES, 프리셋은 보지 않음)', () => {
  it('같은 묶음이면 묶음 앞 대상으로 계산한다', () => {
    expect(bundleTarget('attributeNormal')).toBe('stage');
    expect(bundleTarget('attributeBoss')).toBe('stageBoss');
    expect(bundleTarget('guildRaid')).toBe('awaken');
    expect(bundleTarget('globalRaidBoss')).toBe('awaken');
    // 히어로: 처치 목표 (속성 던전 · PvP) / 체력 무한 (악몽 · 글로벌)
    expect(bundleTarget('pvp')).toBe('attributeHero');
    expect(bundleTarget('globalRaidHero')).toBe('nightmare');
  });

  it('묶음 앞 대상과 묶음에 없는 대상 (글로벌 일반) 은 자기 자신', () => {
    expect(bundleTarget('stage')).toBe('stage');
    expect(bundleTarget('globalRaidNormal')).toBe('globalRaidNormal');
  });
});

describe('특성 추천 묶음 (MASTERY_BUNDLES): 보스끼리 · 히어로끼리 하나', () => {
  it('보스 5개 → 스테이지 보스, 히어로 4개 → 속성 히어로, 일반은 카드 묶음과 같음', () => {
    for (const target of ['attributeBoss', 'awaken', 'guildRaid', 'globalRaidBoss'] as const) expect(masteryBundleTarget(target)).toBe('stageBoss');
    for (const target of ['pvp', 'nightmare', 'globalRaidHero'] as const) expect(masteryBundleTarget(target)).toBe('attributeHero');
    expect(masteryBundleTarget('attributeNormal')).toBe('stage');
    expect(masteryBundleTarget('globalRaidNormal')).toBe('globalRaidNormal');
  });
  it('카드 묶음은 그대로 (각성은 각성, 악몽은 악몽)', () => {
    expect(bundleTarget('awaken')).toBe('awaken');
    expect(bundleTarget('nightmare')).toBe('nightmare');
  });
});
