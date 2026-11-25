import { describe, expect, it } from 'vitest';
import '@/i18n';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import type { CalcValues } from '@/calc/types';
import { CONSTS } from '@/CONSTS';
import { swappedHeroValues, targetDamageWithSwap } from '@/dpm/swapDamage';
import { logSum, targetDamage, type DamageInputs } from '@/dpm/targetDamage';
import { loadTestTables } from '@/test/loadTestTables';
import { importSave, pickDefault, type SaveFiles } from '@/usb/saveImport/importSave';
import saveSubset1018 from '@/usb/saveImport/saveSubset1018.json';
import { readDictionary } from '@/usb/saveImport/saveDictionary';
import type { SkillSave } from '@/usb/saveImport/skillRuneValues';

const tables = loadTestTables();
const raw = saveSubset1018 as unknown as Omit<SaveFiles, 'Default'> & { Default: Parameters<typeof pickDefault>[0] };
const imported = importSave({ ...raw, Default: pickDefault(raw.Default) }, tables);
const VALUES: CalcValues = {
  ...imported.values,
  [ACCOUNT_KEYS.vipLevel]: imported.accountValues[ACCOUNT_KEYS.vipLevel],
};
const INPUTS: DamageInputs = {
  targetsPerSkill: 3,
  orbShardHits: {},
  targetStatusCount: {},
  swap: true,
};

describe('저장 가져오기: 2슬롯 히어로', () => {
  it('2슬롯 히어로의 장착 스킬을 skillEquip2_<칸> 으로 채운다', () => {
    const presetKey = pickDefault(raw.Default).presetKey ?? -1;
    const slot2 = readDictionary(raw.Char._presetDic).get(presetKey)?.slot2 ?? -1;
    const presetSkills = readDictionary((raw.Skill as unknown as SkillSave).eqPresetSkillDic).get(presetKey);
    const expected = presetSkills ? (readDictionary(presetSkills).get(slot2)?.skillIds ?? []) : [];
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

describe('교체 계산 = 두 히어로 공격 한 번씩 대미지를 모두 더함', () => {
  const swapped = swappedHeroValues(VALUES)!;
  /** 교체 등장 후 지속 효과는 최대 상태라 두 히어로 모두 늘 켜짐 (targetDamageWithSwap 과 같은 방식) */
  const withUptime = (values: CalcValues): CalcValues => ({
    ...values,
    [CONSTS.masteryRuneBuff.SWAP_UPTIME_FIELD]: String(CONSTS.dpm.SWAP.HERO_SWAP_EFFECT_UPTIME_PERCENT),
  });

  it('합 = log10 (10^1슬롯 + 10^2슬롯), 내역에 두 히어로가 모두 나온다', () => {
    const first = targetDamage(withUptime(VALUES), tables, 'stage', INPUTS);
    const second = targetDamage(withUptime(swapped), tables, 'stage', INPUTS);
    const result = targetDamageWithSwap(VALUES, tables, 'stage', INPUTS);
    expect(result.totalLog).toBeCloseTo(logSum([first.totalLog, second.totalLog]), 8);
    expect(new Set(result.parts.map((part) => part.hero))).toEqual(new Set([VALUES.charName, VALUES.charName2]));
    // 두 히어로 몫에 교체 스킬이 들어 있다
    expect(result.parts.filter((part) => part.kind === 'swap').length).toBe(2);
  });

  it('자동 교체를 끄면 1슬롯 결과 그대로', () => {
    const plain = targetDamage(VALUES, tables, 'stage', { ...INPUTS, swap: false });
    const off = targetDamageWithSwap(VALUES, tables, 'stage', { ...INPUTS, swap: false });
    expect(off.totalLog).toBe(plain.totalLog);
    expect(off.parts.every((part) => part.hero === undefined)).toBe(true);
  });

  it('2슬롯 히어로가 없으면 1슬롯 결과 그대로', () => {
    const solo = { ...VALUES, charName2: '' };
    expect(targetDamageWithSwap(solo, tables, 'stage', INPUTS).totalLog).toBe(
      targetDamage(solo, tables, 'stage', INPUTS).totalLog,
    );
  });
});
