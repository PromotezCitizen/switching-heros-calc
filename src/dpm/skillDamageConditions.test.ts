import { describe, expect, it } from 'vitest';
import '@/i18n';
import monsterHp from '../../public/data/monsterHp.json';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import type { CalcValues } from '@/calc/types';
import type { MonsterHpData } from '@/dpm/hpCondition';
import { targetDamage, type DamageInputs, type DamagePart } from '@/dpm/targetDamage';
import { loadTestTables } from '@/test/loadTestTables';
import { importSave, pickDefault, type SaveFiles } from '@/usb/saveImport/importSave';
import saveSubset1018 from '@/usb/saveImport/saveSubset1018.json';

const tables = loadTestTables();
const raw = saveSubset1018 as unknown as Omit<SaveFiles, 'Default'> & { Default: Parameters<typeof pickDefault>[0] };
const imported = importSave({ ...raw, Default: pickDefault(raw.Default) }, tables);
const BASE: CalcValues = { ...imported.values, [ACCOUNT_KEYS.vipLevel]: imported.accountValues[ACCOUNT_KEYS.vipLevel] };
const INPUTS: DamageInputs = {
  targetsPerSkill: 3,
  orbShardHits: {},
  targetStatusCount: {},
  stageFloor: null,
  attributeDungeonFloor: null,
  monsterHp: monsterHp as MonsterHpData,
};
/** 얼티밋 켬/끔 값 (1 = 사용) */
const ON = '1';

function parts(values: CalcValues): DamagePart[] {
  return targetDamage(values, tables, 'stage', INPUTS).parts;
}

describe('조건부 스킬 데미지 얼티밋이 스킬 대미지에 들어간다 (묶음 A 0x8 = 스킬 공격 전체)', () => {
  const baseParts = parts({ ...BASE, mastery_2004: '', mastery_2006: '', mastery_2008: '' });

  it('물속성 히어로 편성 수 거듭제곱 (심연의 집중 2004): 편성에 물속성 히어로가 있으면 스킬 대미지만 오르고 평타는 그대로', () => {
    const withTrait = parts({ ...BASE, mastery_2004: ON });
    for (const part of withTrait) {
      const before = baseParts.find((candidate) => candidate.kind === part.kind && candidate.skillId === part.skillId)!;
      if (part.kind === 'normal') expect(part.perMinuteLog).toBeCloseTo(before.perMinuteLog, 10);
      else expect(part.perMinuteLog, `${part.kind} ${part.skillId}`).toBeGreaterThan(before.perMinuteLog);
    }
  });

  it('스킬 하나마다 오르는 폭이 같다 (같은 곱이 모든 스킬 공격에 걸림)', () => {
    const withTrait = parts({ ...BASE, mastery_2004: ON });
    const gains = withTrait
      .filter((part) => part.kind !== 'normal')
      .map((part) => part.perMinuteLog - baseParts.find((candidate) => candidate.kind === part.kind && candidate.skillId === part.skillId)!.perMinuteLog);
    expect(gains.length).toBeGreaterThan(0);
    for (const gain of gains) expect(gain).toBeCloseTo(gains[0], 8);
  });

  it('같은 속성 · 같은 성별 히어로 장착 시 스킬 데미지 (2006 · 2008) 도 두 히어로가 같을 때 스킬 대미지에 들어간다', () => {
    const attributes = new Set(['에이카', '린']);
    const bothWater = attributes.has(BASE.charName) && attributes.has(BASE.charName2);
    const withSameAttribute = parts({ ...BASE, mastery_2006: ON });
    const gained = withSameAttribute.some(
      (part) => part.kind !== 'normal' && part.perMinuteLog > baseParts.find((candidate) => candidate.kind === part.kind && candidate.skillId === part.skillId)!.perMinuteLog,
    );
    // 에이카 · 린은 둘 다 물속성이므로 켜면 올라간다. 편성이 다르면 (조건 불만족) 오르지 않는다
    expect(gained).toBe(bothWater);
  });
});
