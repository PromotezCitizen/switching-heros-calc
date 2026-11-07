import { describe, expect, it } from 'vitest';
import '@/i18n';
import monsterHp from '../../public/data/monsterHp.json';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { masteryLevelKey, masteryTraits } from '@/calc/sources/masteryRuneBuff/mastery';
import { DAMAGE_TARGETS, targetDamage, type DamageInputs } from '@/dpm/targetDamage';
import type { MonsterHpData } from '@/dpm/hpCondition';
import { allocationFromValues, efficiencyLog, evaluateAllocation, valuesWithAllocation } from '@/masteryOptimizer/evaluate';
import { loadTestTables } from '@/test/loadTestTables';
import { importSave, pickDefault, type SaveFiles } from '@/usb/saveImport/importSave';
import saveSubset1018 from '@/usb/saveImport/saveSubset1018.json';

const tables = loadTestTables();
const traits = masteryTraits(tables.Mastery);
const raw = saveSubset1018 as unknown as Omit<SaveFiles, 'Default'> & { Default: Parameters<typeof pickDefault>[0] };
const imported = importSave({ ...raw, Default: pickDefault(raw.Default) }, tables);
const VALUES = { ...imported.values, [ACCOUNT_KEYS.vipLevel]: imported.accountValues[ACCOUNT_KEYS.vipLevel] };
const HERO_FLOOR = (monsterHp as MonsterHpData).attributeDungeon.kind.findIndex((kind) => kind === 3) + 1;
const INPUTS: DamageInputs = {
  targetsPerSkill: 3,
  orbShardHits: { stage: 2, stageBoss: 5, awaken: 5, attributeHero: 5 },
  targetStatusCount: {},
  stageFloor: 9827,
  attributeDungeonFloor: HERO_FLOOR,
  monsterHp: monsterHp as MonsterHpData,
};
/** 최대 레벨 5000 인 공격력 % 특성 (`_per_attackDamage`, `_per_Archer_AttackDamage`) */
const ATTACK_PERCENT_TRAITS = ['21', '118'];

describe('배분 ↔ 입력값', () => {
  const current = allocationFromValues(VALUES, traits);

  it('10-18 계정 프리셋의 배분을 읽는다 (레벨 0 은 뺌)', () => {
    expect(Object.keys(current).length).toBeGreaterThan(50);
    expect(Object.values(current).every((level) => level > 0)).toBe(true);
  });

  it('배분 → 입력값 → 배분이 그대로 돌아온다', () => {
    expect(allocationFromValues(valuesWithAllocation(VALUES, traits, current), traits)).toEqual(current);
  });

  it('배분에 없는 특성 칸은 비우고, 특성이 아닌 칸은 건드리지 않는다', () => {
    const next = valuesWithAllocation(VALUES, traits, { [traits[0].rNo]: 1 });
    expect(Object.keys(next).filter((key) => key.startsWith('mastery_'))).toEqual([masteryLevelKey(traits[0].rNo)]);
    expect(next[ACCOUNT_KEYS.vipLevel]).toBe(VALUES[ACCOUNT_KEYS.vipLevel]);
  });
});

describe('효율 (10-18 계정, 대상 넷)', () => {
  const current = allocationFromValues(VALUES, traits);

  it('지금 배분의 효율 = 대상 대미지 결과 그대로 (스테이지 DPM · 나머지 누적)', () => {
    for (const target of DAMAGE_TARGETS) {
      const direct = efficiencyLog(targetDamage(VALUES, tables, target, INPUTS));
      expect(evaluateAllocation(VALUES, traits, tables, current, target, INPUTS), target).toBeCloseTo(direct, 10);
      expect(isFinite(direct), target).toBe(true);
    }
  });

  it('공격력 % 특성을 빼면 대상 넷 모두 효율이 내려간다', () => {
    for (const rNo of ATTACK_PERCENT_TRAITS) expect(current[rNo], `특성 ${rNo}`).toBeGreaterThan(0);
    const reduced = { ...current };
    for (const rNo of ATTACK_PERCENT_TRAITS) delete reduced[rNo];
    for (const target of DAMAGE_TARGETS) {
      expect(evaluateAllocation(VALUES, traits, tables, reduced, target, INPUTS), target).toBeLessThan(
        evaluateAllocation(VALUES, traits, tables, current, target, INPUTS),
      );
    }
  });

  it('특성을 하나도 안 찍어도 값이 나오고 (탐색 시작점) 지금 배분보다 낮다', () => {
    for (const target of DAMAGE_TARGETS) {
      const empty = evaluateAllocation(VALUES, traits, tables, {}, target, INPUTS);
      expect(isFinite(empty), target).toBe(true);
      expect(empty, target).toBeLessThan(evaluateAllocation(VALUES, traits, tables, current, target, INPUTS));
    }
  });
});
