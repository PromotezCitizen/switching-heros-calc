import { describe, expect, it } from 'vitest';
import { buffActiveShare, buffProcChance, buffProcGameSeconds, buffSkillCooldownGameSeconds } from '@/dpm/buffSkillCycle';

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

describe('버프 스킬 발동 (켜진 동안 평타마다 천분율 확률, m5433)', () => {
  it('확률: c = 130 이면 0~130 의 131가지 → 13.1%, 999 이상은 100%', () => {
    expect(buffProcChance(130)).toBeCloseTo(0.131, 12);
    expect(buffProcChance(1500)).toBe(1);
    expect(buffProcChance(-5)).toBe(0);
  });
  it('켜진 비율: 쿨타임 ≤ 지속이면 1, 아니면 지속 / 쿨타임', () => {
    expect(buffActiveShare(6.4, 6)).toBeCloseTo(6 / 6.4, 12);
    expect(buffActiveShare(4.94, 6)).toBe(1);
    expect(buffActiveShare(8, 0)).toBe(0);
  });
  it('멀티샷 예: 늘 켜짐 · 평타 0.14게임초 · 13.1% → 평균 0.14 / 0.131 게임초마다 1번 (분당 약 429 × 0.131 = 56번)', () => {
    const seconds = buffProcGameSeconds({ cooldownGameSeconds: 4.94, durationGameSeconds: 6, chancePermille: 130, normalAttackGameSeconds: 0.14 });
    expect(seconds).toBeCloseTo(0.14 / 0.131, 10);
    expect(60 / seconds!).toBeCloseTo(56.1, 1);
  });
  it('평타 간격을 모르거나 확률 · 지속이 0 이면 발동 없음 (null)', () => {
    expect(buffProcGameSeconds({ cooldownGameSeconds: 5, durationGameSeconds: 0, chancePermille: 130, normalAttackGameSeconds: 0.14 })).toBeNull();
    expect(buffProcGameSeconds({ cooldownGameSeconds: 5, durationGameSeconds: 6, chancePermille: 130, normalAttackGameSeconds: 0 })).toBeNull();
  });
});
