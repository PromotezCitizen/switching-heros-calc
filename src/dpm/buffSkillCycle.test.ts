import { describe, expect, it } from 'vitest';
import { buffSkillCooldownGameSeconds } from '@/dpm/buffSkillCycle';

describe('버프 스킬 쿨타임 = (표 coolTime − 고른 옵션 초 감소 SS) × (1 − skillCoolReduction / 100)', () => {
  it('10-18 계정: (10 − 2) × (1 − 0.2) = 6.4게임초 → 게임 속도 1.3 으로 실제 4.92초 (실측 4.94)', () => {
    const gameSeconds = buffSkillCooldownGameSeconds({ coolTime: 10, optionSeconds: 2, coolReductionPercent: 20 });
    expect(gameSeconds).toBeCloseTo(6.4, 10);
    expect(gameSeconds / 1.3).toBeCloseTo(4.94, 1);
  });
  it('쿨타임 옵션을 안 골랐으면 표 쿨타임 그대로: 10 × (1 − 0.2) = 8게임초', () => {
    expect(buffSkillCooldownGameSeconds({ coolTime: 10, optionSeconds: 0, coolReductionPercent: 20 })).toBeCloseTo(8, 10);
  });
});
