import { describe, expect, it } from 'vitest';
import coolOptionTable from '../../public/data/tables/SkillCoolOption.json';
import { buffSkillCooldownGameSeconds, coolOptionSeconds } from '@/dpm/buffSkillCycle';

describe('버프 스킬 쿨타임 = (표 coolTime − 옵션 초 감소 SS) × (1 − skillCoolReduction / 100)', () => {
  it('멀티샷 201: 쿨타임 옵션 SS = 2초', () => {
    expect(coolOptionSeconds(coolOptionTable, '201')).toBe(2);
  });
  it('10-18 계정: (10 − 2) × (1 − 0.2) = 6.4게임초 → 게임 속도 1.3 으로 실제 4.92초 (실측 4.94)', () => {
    const gameSeconds = buffSkillCooldownGameSeconds({ coolTime: 10, optionSeconds: 2, coolReductionPercent: 20 });
    expect(gameSeconds).toBeCloseTo(6.4, 10);
    expect(gameSeconds / 1.3).toBeCloseTo(4.94, 1);
  });
  it('옵션 없는 스킬 → 0초 감소', () => {
    expect(coolOptionSeconds(coolOptionTable, '999999')).toBe(0);
  });
});
