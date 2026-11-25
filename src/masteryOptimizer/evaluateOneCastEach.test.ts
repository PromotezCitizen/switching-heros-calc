import { describe, expect, it } from 'vitest';
import '@/i18n';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { masteryTraits } from '@/calc/sources/masteryRuneBuff/mastery';
import type { DamageInputs } from '@/dpm/targetDamage';
import { CONSTS } from '@/CONSTS';
import {
  allocationFromValues,
  evaluateOneCastEach,
  makeChanceGuard,
  makeJumpLevels,
  unreachableChanceTraits,
} from '@/masteryOptimizer/evaluate';
import { loadTestTables } from '@/test/loadTestTables';
import { importSave, pickDefault, type SaveFiles } from '@/usb/saveImport/importSave';
import saveSubset1018 from '@/usb/saveImport/saveSubset1018.json';

const tables = loadTestTables();
const traits = masteryTraits(tables.Mastery);
const raw = saveSubset1018 as unknown as Omit<SaveFiles, 'Default'> & { Default: Parameters<typeof pickDefault>[0] };
const imported = importSave({ ...raw, Default: pickDefault(raw.Default) }, tables);
const VALUES = { ...imported.values, [ACCOUNT_KEYS.vipLevel]: imported.accountValues[ACCOUNT_KEYS.vipLevel] };
const INPUTS: DamageInputs = {
  targetsPerSkill: 3,
  orbShardHits: { stage: 2, stageBoss: 5, awaken: 5, attributeHero: 5 },
  targetStatusCount: {},
};

describe('특성 추천 비교 값 (공격마다 한 번씩 대미지 합)', () => {
  const current = allocationFromValues(VALUES, traits);

  it('지금 배분이 빈 배분보다 크고, 계산이 된다', () => {
    for (const target of ['stage', 'awaken'] as const) {
      const now = evaluateOneCastEach(VALUES, traits, tables, current, target, INPUTS);
      expect(Number.isFinite(now), target).toBe(true);
      expect(evaluateOneCastEach(VALUES, traits, tables, {}, target, INPUTS), target).toBeLessThan(now);
    }
  });
});

describe('확률 바닥 검사 (makeChanceGuard)', () => {
  const current = allocationFromValues(VALUES, traits);
  const guard = makeChanceGuard(VALUES, traits, tables, 'stageBoss', INPUTS);

  it('확률 특성을 줄이지 않는 이동은 그대로 받는다', () => {
    expect(guard(current, current)).toBe(true);
  });

  it('확률 특성을 모두 0 으로 내려 100% 이상이던 확률이 떨어지면 받지 않는다', () => {
    const dropped = { ...current };
    for (const rNo of CONSTS.dpm.OPTIMIZER_RULES.CHANCE_FIRST) delete dropped[rNo];
    expect(guard(current, dropped)).toBe(false);
  });
});

describe('확률 계단까지 올리는 레벨 수 (makeJumpLevels)', () => {
  const jump = makeJumpLevels(VALUES, traits, tables, 'stageBoss', INPUTS);
  it('확률 특성이 아니면 null', () => {
    const attack = traits.find((trait) => trait.rNo === '1')!;
    expect(jump({}, attack)).toBeNull();
  });
});

describe('100% 에 닿지 않는 확률 특성 (unreachableChanceTraits)', () => {
  it('매직 가드 쪽 (60 61 311) 은 최대로 찍어도 100% 에 못 닿아 빠지고, 연타 쪽은 남는다', () => {
    const candidates = new Set(CONSTS.dpm.OPTIMIZER_RULES.CHANCE_FIRST);
    const unreachable = unreachableChanceTraits(
      VALUES,
      traits,
      tables,
      'stageBoss',
      INPUTS,
      candidates,
      allocationFromValues(VALUES, traits),
    );
    for (const rNo of ['60', '61', '311']) expect(unreachable.has(rNo), rNo).toBe(true);
    for (const rNo of ['11', '12', '101']) expect(unreachable.has(rNo), rNo).toBe(false);
  });
});
