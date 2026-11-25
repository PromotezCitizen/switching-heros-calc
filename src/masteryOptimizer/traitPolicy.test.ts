import { describe, expect, it } from 'vitest';
import { traitPolicyFor } from '@/masteryOptimizer/traitPolicy';

describe('특성 추천 고정 · 무시 규칙', () => {
  it('광폭화 7 · 이성 유지 8 · 마나 체인 23 은 고정, 무시 목록은 찍지 않음', () => {
    const policy = traitPolicyFor('stage');
    expect([...policy.fixed]).toEqual(['7', '8', '23']);
    for (const rNo of ['2', '4', '24', '37', '40', '41', '42', '46', '62', '64', '214']) expect(policy.ignored.has(rNo)).toBe(true);
  });

  it('방어 특성은 대상 종류에 맞는 것만 남긴다 (일반 곡예, 보스 방탄, 히어로 위기회피, 2 포함)', () => {
    const allowed = (target: Parameters<typeof traitPolicyFor>[0]) =>
      ['48', '302', '49', '303', '50', '304'].filter((rNo) => !traitPolicyFor(target).ignored.has(rNo));
    expect(allowed('stage')).toEqual(['48', '302']);
    expect(allowed('awaken')).toEqual(['49', '303']);
    expect(allowed('pvp')).toEqual(['50', '304']);
  });
});
