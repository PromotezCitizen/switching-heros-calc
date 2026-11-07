import { describe, expect, it } from 'vitest';
import { rosterAwakenField, rosterGradeField } from '@/calc/sources/hero/rosterFields';
import { ownedPetField } from '@/calc/sources/heroWeaponCardPet/pet';
import { gradeStarValue, heroByName, rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';
import type { CalcValues } from '@/calc/types';
import type { TableRow } from '@/data/statTables';
import { activeProbability, petLeaderStatusSource, statusProbabilities, statusSourceOf, typicalStatusCount, swapSkillFreezeSources, weaponFreezeSource, weaponStatus, type StatusSource } from '@/dpm/statusEffects';
import { loadTestTables } from '@/test/loadTestTables';

const source = (kind: string, chance: number, durationSeconds: number, intervalSeconds: number): StatusSource => ({ kind, chance, durationSeconds, intervalSeconds });

describe('상태이상이 걸려 있을 확률 (시전 간격 T · 확률 p · 지속시간 D)', () => {
  it('확률 100%: 지속이 간격 이상이면 늘 걸려 있고, 간격이 더 길면 D / T', () => {
    expect(activeProbability(source('stun', 1, 3, 2))).toBeCloseTo(1, 12);
    expect(activeProbability(source('stun', 1, 2, 2))).toBeCloseTo(1, 12);
    expect(activeProbability(source('stun', 1, 2, 4))).toBeCloseTo(0.5, 12);
  });
  it('확률 p 는 직전 D 초 안의 시전 횟수만큼 시도: p 0.5, D 2, T 1 → 1 − 0.25', () => {
    expect(activeProbability(source('stun', 0.5, 2, 1))).toBeCloseTo(0.75, 12);
  });
  it('시전 횟수가 소수면 한 번 더 있을 확률로 섞는다: p 0.1, D 2, T 3 → (2/3) × 0.1', () => {
    expect(activeProbability(source('stun', 0.1, 2, 3))).toBeCloseTo((2 / 3) * 0.1, 12);
  });
  it('확률 0 이면 0', () => {
    expect(activeProbability(source('stun', 0, 2, 1))).toBe(0);
  });
});

describe('종류별 확률과 일반적인 상태이상 수', () => {
  it('같은 종류는 합집합: 둘 다 50% 면 75%', () => {
    expect(statusProbabilities([source('stun', 1, 2, 4), source('stun', 1, 2, 4)]).stun).toBeCloseTo(0.75, 12);
  });
  it('종류별 확률의 합을 반올림: 늘 걸리는 둘 + 확률 낮은 하나 = 2, 낮은 둘만 = 0', () => {
    const always = [source('burn', 1, 3, 2), source('blind', 1, 3, 2)];
    expect(typicalStatusCount([...always, source('stun', 0.1, 2, 3)])).toBe(2);
    expect(typicalStatusCount([source('stun', 0.1, 2, 3), source('shock', 0.1, 2, 3)])).toBe(0);
    expect(typicalStatusCount([])).toBe(0);
  });
});

describe('티르 전용 무기 (1030) 의 출혈 · 빈혈', () => {
  const tables = loadTestTables();
  const tyr = heroByName(tables, '티르')!;
  const eika = heroByName(tables, '에이카')!;
  /** 두 히어로를 보유로 두고 (이름 칸이 유지되게), 무기 장착 · ★ 를 정한다 */
  const base: CalcValues = { [rosterGradeField(tyr.charId)]: 'SSS', [rosterGradeField(eika.charId)]: 'SSS', exclusiveOwnedStar_1030: '7' };

  it('교체가 없으면 1슬롯 티르는 늘 필드: ★1~6 출혈 늘, ★7 은 연장 출혈 16초 늘 + 빈혈 8 / 16 (status-effect-rules-2026-11-05.md 6.6)', () => {
    const values = { ...base, charName: '티르', exclusiveEquipped: 'true' };
    expect(weaponStatus({ ...values, exclusiveOwnedStar_1030: '0' }, tables, null)).toEqual({ sources: [], alwaysKinds: [], fractions: {} });
    expect(weaponStatus({ ...values, exclusiveOwnedStar_1030: '1' }, tables, null).alwaysKinds).toEqual(['bleed']);
    expect(weaponStatus({ ...values, exclusiveOwnedStar_1030: '6' }, tables, null).alwaysKinds).toEqual(['bleed']);
    const seven = weaponStatus(values, tables, null);
    expect(seven.alwaysKinds).toEqual([]);
    expect(seven.fractions.extendedBleed).toBeCloseTo(1, 9);
    expect(seven.fractions.anemia).toBeCloseTo(0.5, 9);
    expect(seven.fractions.scar).toBeUndefined();
  });
  it('전용 무기를 장착하지 않으면 없다', () => {
    expect(weaponStatus({ ...base, charName: '티르', exclusiveEquipped: 'false' }, tables, null)).toEqual({ sources: [], alwaysKinds: [], fractions: {} });
  });
  it('자동 교체 (간격 18): ★7 은 0 · 16초에 걸어 연장 출혈 32 / 36, 빈혈 [10,18) · [26,34) = 16 / 36, ★4 흉터 10 / 36. ★6 이하는 필드에 있는 동안 + 6초', () => {
    const values = { ...base, charName: '에이카', charName2: '티르', exclusiveEquipped2: 'true' };
    const seven = weaponStatus(values, tables, 18);
    expect(seven.fractions.extendedBleed).toBeCloseTo(32 / 36, 9);
    expect(seven.fractions.anemia).toBeCloseTo(16 / 36, 9);
    expect(seven.fractions.scar).toBeCloseTo(10 / 36, 9);
    expect(weaponStatus(values, tables, null)).toEqual({ sources: [], alwaysKinds: [], fractions: {} });
    const six = weaponStatus({ ...values, exclusiveOwnedStar_1030: '6' }, tables, 18);
    expect(six.alwaysKinds).toEqual([]);
    expect(six.sources).toEqual([{ kind: 'bleed', chance: 1, durationSeconds: 24, intervalSeconds: 36 }]);
  });
  it('에이카 교체 스킬 빙결: 각성 Lv10 이상 11217 은 15초 + 6초, Lv5~9 11216 은 10초 + 6초, 그 아래는 화살 18발 × 0.12초 + 3초. 교체를 안 쓰면 없다', () => {
    const values = { ...base, charName: '에이카', charName2: '티르' };
    const awaken = rosterAwakenField(eika.charId);
    expect(swapSkillFreezeSources({ ...values, [awaken]: '10' }, tables, 18)).toEqual([{ kind: 'freeze', chance: 1, durationSeconds: 21, intervalSeconds: 36 }]);
    expect(swapSkillFreezeSources({ ...values, [awaken]: '5' }, tables, 18)[0].durationSeconds).toBe(16);
    expect(swapSkillFreezeSources({ ...values, [awaken]: '0' }, tables, 18)[0].durationSeconds).toBeCloseTo(18 * 0.12 + 3, 12);
    expect(swapSkillFreezeSources({ ...values, [awaken]: '10' }, tables, null)).toEqual([]);
  });
  it('에이카 전용 무기 (1021) ★4 빙결: 1슬롯 에이카가 장착하고 ★4 이상이면 전용 스킬 간격마다 50% 확률로 6초 (표 값), 1.4초 간격이면 약 95% 걸려 있다', () => {
    const values = { ...base, charName: '에이카', exclusiveEquipped: 'true', exclusiveOwnedStar_1021: '4' };
    const freeze = weaponFreezeSource(values, tables, 1.4)!;
    expect(freeze).toMatchObject({ kind: 'freeze', chance: 0.5, durationSeconds: 6, intervalSeconds: 1.4 });
    expect(activeProbability(freeze)).toBeCloseTo(1 - Math.pow(0.5, 6 / 1.4), 1);
    expect(activeProbability(freeze)).toBeGreaterThan(0.9);
    expect(weaponFreezeSource({ ...values, exclusiveOwnedStar_1021: '3' }, tables, 1.4)).toBeNull();
    expect(weaponFreezeSource({ ...values, exclusiveEquipped: 'false' }, tables, 1.4)).toBeNull();
    expect(weaponFreezeSource(values, tables, null)).toBeNull();
  });
  it('늘 걸려 있는 종류는 확률 1 로 더한다', () => {
    expect(typicalStatusCount([], ['bleed', 'anemia'])).toBe(2);
    expect(typicalStatusCount([source('burn', 1, 3, 2)], ['bleed'])).toBe(2);
  });
});

describe('리더 펫의 상태이상 (Pet 표 leaderStatType)', () => {
  const tables = loadTestTables();
  /** 펫 id 의 보유 등급 · 성 칸 값 (표의 그 행 그대로) */
  const owned = (petId: string, grade: string, star: string): CalcValues => {
    const row = rowsOf(tables, 'Pet').find((record) => record.petId === petId && record.grade === grade && record.star === star)!;
    return { [ownedPetField(petId)]: gradeStarValue(row), petSlot1: petId, petLeader: '1' };
  };

  it('누비 (105, SSS) 평타 30회마다 5초 감전: 평타 간격 0.14초면 4.2초마다, 5초 지속이라 늘 걸려 있다', () => {
    const source = petLeaderStatusSource(owned('105', 'SSS', '0'), tables, 0.14, [])!;
    expect(source).toMatchObject({ kind: 'shock', chance: 1, durationSeconds: 5 });
    expect(source.intervalSeconds).toBeCloseTo(4.2, 10);
    expect(activeProbability(source)).toBeCloseTo(1, 12);
  });
  it('자동 교체면 카운터가 등장마다 0: 필드 18초 안에 floor(18 / 4.2) = 4번 → 평균 간격 4.5초 (status-effect-rules 6.5), 간격이 18초보다 길면 null', () => {
    const source = petLeaderStatusSource(owned('105', 'SSS', '0'), tables, 0.14, [], 18)!;
    expect(source.intervalSeconds).toBeCloseTo(4.5, 10);
    expect(petLeaderStatusSource(owned('105', 'SSS', '0'), tables, 0.7, [], 18)).toBeNull();
  });
  it('SS 등급은 35회마다 4초', () => {
    const source = petLeaderStatusSource(owned('105', 'SS', '0'), tables, 0.14, [])!;
    expect(source).toMatchObject({ kind: 'shock', durationSeconds: 4 });
    expect(source.intervalSeconds).toBeCloseTo(4.9, 10);
  });
  it('펭크로우 (106) 스킬 5회 시전마다 5초 감전: 간격 = 5 ÷ 장착 스킬 시전 횟수 합 (초당)', () => {
    const skills = [6.4, 6.4, 6.4, 6.4, 10];
    const source = petLeaderStatusSource(owned('106', 'SSS', '0'), tables, 0.14, skills)!;
    expect(source).toMatchObject({ kind: 'shock', durationSeconds: 5 });
    expect(source.intervalSeconds).toBeCloseTo(5 / (4 / 6.4 + 1 / 10), 10);
    expect(petLeaderStatusSource(owned('106', 'SSS', '0'), tables, 0.14, [])).toBeNull();
  });
  it('리더가 아니거나 슬롯이 비었거나 상태이상 리더가 아니면 null', () => {
    expect(petLeaderStatusSource({ ...owned('105', 'SSS', '0'), petLeader: '2' }, tables, 0.14, [])).toBeNull();
    expect(petLeaderStatusSource({}, tables, 0.14, [])).toBeNull();
  });
});

describe('스킬 옵션 행 → 상태이상 출처 (catalog-skill-option.md 0-4절)', () => {
  /** 룬 값 열은 gradeSS (consts/skill.ts RUNE_VALUE_COLUMN) */
  const option = (type: string, runeValue: string): TableRow => ({ type, rNo: '1', desc: '', gradeSS: runeValue }) as unknown as TableRow;

  it('확률형 (기습 100: 값 = 확률 %): 확률 = 값 / 100 (100 이상이면 1), 지속 2초', () => {
    expect(statusSourceOf(option('100', '75'), 3)).toEqual({ kind: 'stun', chance: 0.75, durationSeconds: 2, intervalSeconds: 3 });
    expect(statusSourceOf(option('100', '150'), 3)?.chance).toBe(1);
  });
  it('지속형 (어퍼컷 1802: 값 = 지속 초) 은 늘 걸리고, 화상 (2401) 은 확률 없이 3초', () => {
    expect(statusSourceOf(option('1802', '1.5'), 3)).toEqual({ kind: 'airborne', chance: 1, durationSeconds: 1.5, intervalSeconds: 3 });
    expect(statusSourceOf(option('2401', '96'), 3)).toEqual({ kind: 'burn', chance: 1, durationSeconds: 3, intervalSeconds: 3 });
  });
  it('상태이상을 안 거는 옵션 · 값이 없는 옵션 · 간격이 없는 스킬은 null', () => {
    expect(statusSourceOf(option('9999', '50'), 2)).toBeNull();
    expect(statusSourceOf(option('100', '0'), 2)).toBeNull();
    expect(statusSourceOf(option('100', '50'), 0)).toBeNull();
  });
});
