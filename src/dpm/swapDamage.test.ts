import { describe, expect, it } from 'vitest';
import '@/i18n';
import monsterHp from '../../public/data/monsterHp.json';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import type { CalcValues } from '@/calc/types';
import type { MonsterHpData } from '@/dpm/hpCondition';
import { CONSTS } from '@/CONSTS';
import { swapEffectUptimes, swappedHeroValues, targetDamageWithSwap } from '@/dpm/swapDamage';
import { targetDamage, type DamageInputs } from '@/dpm/targetDamage';
import { loadTestTables } from '@/test/loadTestTables';
import { importSave, pickDefault, type SaveFiles } from '@/usb/saveImport/importSave';
import saveSubset1018 from '@/usb/saveImport/saveSubset1018.json';
import { readDictionary } from '@/usb/saveImport/saveDictionary';
import type { SkillSave } from '@/usb/saveImport/skillRuneValues';

const tables = loadTestTables();
const raw = saveSubset1018 as unknown as Omit<SaveFiles, 'Default'> & { Default: Parameters<typeof pickDefault>[0] };
const imported = importSave({ ...raw, Default: pickDefault(raw.Default) }, tables);
const VALUES: CalcValues = { ...imported.values, [ACCOUNT_KEYS.vipLevel]: imported.accountValues[ACCOUNT_KEYS.vipLevel] };
const INPUTS: DamageInputs = {
  targetsPerSkill: 3,
  orbShardHits: {},
  targetStatusCount: {},
  stageFloor: 9827,
  attributeDungeonFloor: null,
  monsterHp: monsterHp as MonsterHpData,
  swap: true,
};

describe('저장 가져오기: 2슬롯 히어로', () => {
  it('2슬롯 히어로의 장착 스킬을 skillEquip2_<칸> 으로 채운다', () => {
    const presetKey = pickDefault(raw.Default).presetKey ?? -1;
    const slot2 = readDictionary(raw.Char._presetDic).get(presetKey)?.slot2 ?? -1;
    const presetSkills = readDictionary((raw.Skill as unknown as SkillSave).eqPresetSkillDic).get(presetKey);
    const expected = presetSkills ? readDictionary(presetSkills).get(slot2)?.skillIds ?? [] : [];
    expect(imported.values.charName2).toBeTruthy();
    expected.forEach((skillId, index) => {
      expect(imported.values[`skillEquip2_${index + 1}`]).toBe(skillId ? String(skillId) : undefined);
    });
  });

  it('2슬롯 히어로의 전용 무기 장착 칸이 생긴다', () => {
    expect(['true', 'false']).toContain(imported.values.exclusiveEquipped2);
  });
});

describe('두 히어로 바꾸기', () => {
  it('2슬롯 히어로가 없으면 null', () => {
    expect(swappedHeroValues({ charName: '린' })).toBeNull();
  });

  it('이름 · 장착 스킬 · 전용 무기 장착을 서로 바꾼다 (다른 칸은 그대로)', () => {
    const swapped = swappedHeroValues({
      charName: '린',
      charName2: '에이카',
      skillEquip_1: '1',
      skillEquip2_1: '201',
      exclusiveEquipped: 'true',
      exclusiveEquipped2: 'false',
      skillLevel_1: '50',
    });
    expect(swapped).toMatchObject({
      charName: '에이카',
      charName2: '린',
      skillEquip_1: '201',
      skillEquip2_1: '1',
      exclusiveEquipped: 'false',
      exclusiveEquipped2: 'true',
      skillLevel_1: '50',
    });
  });

  it('전용 무기 옵션 칸도 서로 바꾼다', () => {
    const swapped = swappedHeroValues({
      charName: '린',
      charName2: '에이카',
      weaponOptionStat1: '_per_attackDamage',
      weaponOptionValue1: '100%',
      weaponOption2Stat3: '_per_hp',
      weaponOption2Value3: '50%',
    });
    expect(swapped).toMatchObject({
      weaponOption2Stat1: '_per_attackDamage',
      weaponOption2Value1: '100%',
      weaponOptionStat3: '_per_hp',
      weaponOptionValue3: '50%',
      weaponOptionStat1: '',
      weaponOption2Stat3: '',
    });
  });
});

describe('교체 계산 = 두 히어로 대미지의 평균 (필드에 서는 시간이 같다고 봄)', () => {
  const swapped = swappedHeroValues(VALUES)!;
  /** 교체 등장 후 지속 효과 (얼티밋 · 일반 특성의 _HeroSwap) 는 히어로마다 켜진 시간 비율을 넣어 계산한다 (targetDamageWithSwap 과 같은 방식) */
  const withUptime = (values: CalcValues, percent: number): CalcValues => ({ ...values, [CONSTS.masteryRuneBuff.SWAP_UPTIME_FIELD]: String(percent) });

  it('스테이지: 분당 대미지 = log10 ((10^1슬롯 + 10^2슬롯) / 2), 내역에 두 히어로가 모두 나온다', () => {
    const uptimes = swapEffectUptimes(VALUES, tables, 'stage');
    const first = targetDamage(withUptime(VALUES, uptimes.first), tables, 'stage', INPUTS);
    const second = targetDamage(withUptime(swapped, uptimes.second), tables, 'stage', INPUTS);
    const result = targetDamageWithSwap(VALUES, tables, 'stage', INPUTS);
    expect(result.perMinuteLog).toBeCloseTo(Math.log10((Math.pow(10, first.perMinuteLog - second.perMinuteLog) + 1) / 2) + second.perMinuteLog, 8);
    expect(new Set(result.parts.map((part) => part.hero))).toEqual(new Set([VALUES.charName, VALUES.charName2]));
    // 교체 스킬은 이제 계산한다 (ChangeSkill 표 · changeSkillHits.ts): 두 히어로 몫에 교체 스킬이 들어 있다
    expect(result.missing).not.toContain('swapSkillNotCounted');
    expect(result.parts.filter((part) => part.kind === 'swap').length).toBe(2);
  });

  it('스테이지 보스 (누적): 두 히어로 누적 대미지의 평균 (에이카 무기 ★1 현재 체력 피해는 빼고 본다: currentHpDamage.test.ts)', () => {
    const noStar = { ...VALUES, exclusiveOwnedStar_1021: '0' };
    const noStarSwapped = swappedHeroValues(noStar)!;
    const uptimes = swapEffectUptimes(noStar, tables, 'stageBoss');
    const first = targetDamage(withUptime(noStar, uptimes.first), tables, 'stageBoss', INPUTS);
    const second = targetDamage(withUptime(noStarSwapped, uptimes.second), tables, 'stageBoss', INPUTS);
    const result = targetDamageWithSwap(noStar, tables, 'stageBoss', INPUTS);
    const expected = Math.log10((Math.pow(10, first.windowTotalLog! - second.windowTotalLog!) + 1) / 2) + second.windowTotalLog!;
    expect(result.windowTotalLog).toBeCloseTo(expected, 8);
  });

  it('자동 교체를 끄면 1슬롯 결과 그대로', () => {
    const plain = targetDamage(VALUES, tables, 'stage', INPUTS);
    const off = targetDamageWithSwap(VALUES, tables, 'stage', { ...INPUTS, swap: false });
    expect(off.perMinuteLog).toBe(plain.perMinuteLog);
    expect(off.parts.every((part) => part.hero === undefined)).toBe(true);
  });

  it('2슬롯 히어로가 없으면 1슬롯 결과 그대로', () => {
    const solo = { ...VALUES, charName2: '' };
    expect(targetDamageWithSwap(solo, tables, 'stage', INPUTS).perMinuteLog).toBe(targetDamage(solo, tables, 'stage', INPUTS).perMinuteLog);
  });
});
