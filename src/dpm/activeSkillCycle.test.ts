import { describe, expect, it } from 'vitest';
import { combineLines } from '@/calc/combine';
import { activeCooldownGameSeconds, activeSkillGameSeconds, weaponCoolSpeedPercent } from '@/dpm/activeSkillCycle';
import { statReader } from '@/dpm/attackStats';
import { loadTestTables } from '@/test/loadTestTables';

const NONE = { coolTime: 9, optionSeconds: 1.5, coolReductionPercent: 20, constantSpeedPercent: 0, burstSpeedPercent: 0, burstSeconds: 3 };

describe('액티브 스킬 주기', () => {
  it('다발 화살: 쿨타임 9, 옵션 1.5초, 쿨타임 감소 20% → 6.0게임초', () => {
    expect(activeCooldownGameSeconds(NONE)).toBeCloseTo(6, 12);
  });
  it('창공 3% (시전 뒤 3초) → 6 − 3 × 0.03 = 5.91', () => {
    expect(activeCooldownGameSeconds({ ...NONE, burstSpeedPercent: 3 })).toBeCloseTo(5.91, 12);
  });
  it('상시 가속 25% → 6 / 1.25 = 4.8. 창공과 같이 25% + 3% → 3 + (6 − 3 × 1.28) / 1.25', () => {
    expect(activeCooldownGameSeconds({ ...NONE, constantSpeedPercent: 25 })).toBeCloseTo(4.8, 12);
    expect(activeCooldownGameSeconds({ ...NONE, constantSpeedPercent: 25, burstSpeedPercent: 3 })).toBeCloseTo(3 + (6 - 3 * 1.28) / 1.25, 12);
  });
  it('작업량이 짧아 창공 3초 안에 다 차면 W / (1 + b)', () => {
    expect(activeCooldownGameSeconds({ ...NONE, coolTime: 2, optionSeconds: 0, coolReductionPercent: 0, burstSpeedPercent: 100 })).toBeCloseTo(1, 12);
  });
  it('옵션 · 감소가 쿨타임보다 크면 0', () => {
    expect(activeCooldownGameSeconds({ ...NONE, optionSeconds: 20 })).toBe(0);
  });
});

describe('입력값으로', () => {
  const tables = loadTestTables();
  it('다발 화살 Lv37 + 쿨타임 옵션 rNo 319 (1.5초), 쿨타임 감소 20% 줄 → 6.0게임초', () => {
    const read = statReader(combineLines([{ source: 't', stat: 'skillCoolReduction', value: 20 }]));
    expect(activeSkillGameSeconds({ skillLevel_252: '37', skillOption_252_1: '319' }, tables, read, '252', 'normal')).toBeCloseTo(6, 12);
  });
  it('전용 무기 초월 가속은 1슬롯 히어로가 그 무기를 장착했을 때만: 입력이 비면 0', () => {
    expect(weaponCoolSpeedPercent({}, tables, 'boss')).toBe(0);
  });
  it('셰나 (charId 303) 전용 무기 1019 ★1 장착: 보스에서만 1% × 최대 25 = 25, 별 0 이거나 장착 안 하면 0', () => {
    const shena = { charName: '셰나', exclusiveEquipped: 'true', exclusiveOwnedStar_1019: '1' };
    expect(weaponCoolSpeedPercent(shena, tables, 'boss')).toBe(25);
    expect(weaponCoolSpeedPercent(shena, tables, 'normal')).toBe(0);
    expect(weaponCoolSpeedPercent({ ...shena, exclusiveOwnedStar_1019: '' }, tables, 'boss')).toBe(0);
    expect(weaponCoolSpeedPercent({ ...shena, exclusiveOwnedStar_1019: '0' }, tables, 'boss')).toBe(0);
  });
});
