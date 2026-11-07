import { describe, expect, it } from 'vitest';
import { aeikaCurrentHpBonus, swapInTimes } from '@/dpm/currentHpDamage';
import { swappedHeroValues } from '@/dpm/swapDamage';
import type { DamageInputs } from '@/dpm/targetDamage';
import { rosterAwakenField, rosterGradeField } from '@/calc/sources/hero/rosterFields';
import { heroByName } from '@/calc/sources/heroWeaponCardPet/shared';
import { loadTestTables } from '@/test/loadTestTables';

describe('교체해 들어오는 시각', () => {
  const cycle = { firstSeconds: 4.5, fullSeconds: 18 };
  it('2슬롯은 첫 교체 (4.5) 부터 두 번마다, 1슬롯은 두 번째 교체 (22.5) 부터', () => {
    expect(swapInTimes(cycle, 45, 1)).toEqual([4.5, 40.5]);
    expect(swapInTimes(cycle, 45, 0)).toEqual([22.5]);
  });
});

describe('에이카 전용 무기 ★1: 보스 현재 체력 15 % 추가 피해', () => {
  const tables = loadTestTables();
  const tyr = heroByName(tables, '티르')!;
  const eika = heroByName(tables, '에이카')!;
  const values = {
    [rosterGradeField(tyr.charId)]: 'SSS',
    [rosterGradeField(eika.charId)]: 'SSS',
    [rosterAwakenField(eika.charId)]: '10',
    charName: '티르',
    charName2: '에이카',
    exclusiveEquipped2: 'true',
    exclusiveOwnedStar_1021: '1',
  };
  const swapped = swappedHeroValues(values)!;
  const hp = { stage: { count: 1, monHp: [100], bossHp: [0] }, attributeDungeon: { count: 0, stage: [], hpMultiplier: [], kind: [] } };
  const inputs = { stageFloor: 1, attributeDungeonFloor: null, monsterHp: hp } as unknown as DamageInputs;
  // 보스 체력 10^100, 분당 대미지는 아주 작게 (거의 안 깎임), 누적도 아주 작게
  const tiny = 50;

  it('스테이지 보스: 에이카가 4.5 초에 들어와 1 초 뒤 한 번 → 누적 ≈ 체력의 15 % (40.5 초는 45 초 창 안이라 한 번 더: 0.15 + 0.85 × 0.15)', () => {
    const bonus = aeikaCurrentHpBonus(values, swapped, tables, 'stageBoss', inputs, tiny, tiny)!;
    expect(bonus.hits).toBeGreaterThanOrEqual(1);
    const expected = bonus.hits === 2 ? 0.15 + 0.85 * 0.15 : 0.15;
    expect(Math.pow(10, bonus.windowTotalLog! - 100)).toBeCloseTo(expected, 6);
  });

  it('각성 던전 · 길드 레이드는 게임이 빼므로 없음, ★0 이면 없음, 층을 모르면 계산 못 함 표시', () => {
    expect(aeikaCurrentHpBonus(values, swapped, tables, 'awaken', inputs, tiny, tiny)).toBeNull();
    expect(aeikaCurrentHpBonus(values, swapped, tables, 'guildRaid', inputs, tiny, tiny)).toBeNull();
    const noStar = { ...values, exclusiveOwnedStar_1021: '0' };
    expect(aeikaCurrentHpBonus(noStar, swappedHeroValues(noStar)!, tables, 'stageBoss', inputs, tiny, tiny)).toBeNull();
    expect(aeikaCurrentHpBonus(values, swapped, tables, 'stageBoss', { ...inputs, stageFloor: null }, tiny, tiny)).toEqual({ windowTotalLog: null, hits: 0 });
  });

  it('보스가 이미 거의 죽었으면 (남은 체력 0) 더하지 않고, 누적은 체력을 넘지 않는다', () => {
    const bonus = aeikaCurrentHpBonus(values, swapped, tables, 'stageBoss', inputs, 110, 100)!;
    expect(bonus.hits).toBe(0);
    expect(bonus.windowTotalLog).toBeCloseTo(100, 9);
  });
});
