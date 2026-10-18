import { describe, expect, it } from 'vitest';
import { attackAnimationSeconds, normalAttackGameSeconds } from '@/dpm/attackCycle';

describe('일반 공격 1번 평균 게임 시간 (0.02초 틱 올림, attack-cycle.md 6절)', () => {
  it('10-18 계정: 공격속도 2615% (상한 350), 연타 276% (늘 연타) → 7틱 = 0.14초', () => {
    expect(normalAttackGameSeconds({ attackSpeedPercent: 2615, doubleAttackPercent: 276, animationSeconds: 0.866667 })).toBeCloseTo(0.14, 10);
  });
  it('연타 0% → 일반 동작만: 배속 3.5 → ceil(0.866667 / 0.07) = 13틱 = 0.26초', () => {
    expect(normalAttackGameSeconds({ attackSpeedPercent: 400, doubleAttackPercent: 0, animationSeconds: 0.866667 })).toBeCloseTo(0.26, 10);
  });
  it('연타 50%, 공격속도 150% → 0.5 × ceil(0.866667/0.06)×0.02 + 0.5 × ceil(0.866667/0.03)×0.02 = 0.5×0.3 + 0.5×0.58', () => {
    expect(normalAttackGameSeconds({ attackSpeedPercent: 150, doubleAttackPercent: 50, animationSeconds: 0.866667 })).toBeCloseTo(0.44, 10);
  });
  it('히어로별 애니메이션 길이: 파이크 (100) 0.833333, 표에 없으면 기본 0.866667', () => {
    expect(attackAnimationSeconds('100')).toBe(0.833333);
    expect(attackAnimationSeconds('205')).toBe(0.866667);
  });
});
