import { describe, expect, it } from 'vitest';
import '@/i18n';
import monsterHp from '../../public/data/monsterHp.json';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { ultimateLines } from '@/calc/sources/masteryRuneBuff/ultimate';
import { equippedWeaponStarSum } from '@/calc/sources/masteryRuneBuff/weaponStarSum';
import type { CalcValues } from '@/calc/types';
import type { MonsterHpData } from '@/dpm/hpCondition';
import { swapCycle } from '@/dpm/swapCycle';
import { swapEffectUptimes, targetDamageWithSwap } from '@/dpm/swapDamage';
import type { DamageInputs } from '@/dpm/targetDamage';
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
  swap: true,
};
const ON = '1';
const label = (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`;

function lines(values: CalcValues, context = {}) {
  return ultimateLines(values, tables.Mastery, tables.Pet, [], label, [], [], context).lines;
}

describe('초월의 기운 (3002 · 3008): 두 히어로가 장착한 전용 무기 초월 합', () => {
  const heroes = { charName: '린', charName2: '에이카', exclusiveEquipped: 'true', exclusiveEquipped2: 'true' };

  it('합 = 장착한 전용 무기의 ★ (린 1001 ★5 + 에이카 1021 ★15 = 20)', () => {
    expect(equippedWeaponStarSum({ ...heroes, exclusiveOwnedStar_1001: '5', exclusiveOwnedStar_1021: '15' }, tables)).toBe(20);
  });

  it('장착하지 않은 히어로의 무기는 합에 넣지 않는다', () => {
    expect(equippedWeaponStarSum({ ...heroes, exclusiveEquipped2: 'false', exclusiveOwnedStar_1001: '5', exclusiveOwnedStar_1021: '15' }, tables)).toBe(5);
  });

  it('합이 20 이상이면 3002 가 공격력 줄을 만들고, 20 미만이면 만들지 않는다', () => {
    const values = { mastery_3002: ON };
    expect(lines(values, { weaponStarSum: 20 }).map((line) => line.stat)).toEqual(['_per_attackDamage']);
    expect(lines(values, { weaponStarSum: 19 })).toEqual([]);
  });

  it('3008 은 합이 30 이상일 때만', () => {
    const values = { mastery_3008: ON };
    expect(lines(values, { weaponStarSum: 29 })).toEqual([]);
    expect(lines(values, { weaponStarSum: 30 }).map((line) => line.stat)).toEqual(['_per_attackDamage']);
  });
});

describe('균형의 완성 (3000) · 완전한 세트 (3006): 같은 등급 연성장비 개수', () => {
  it('3000 은 5개 이상, 3006 은 8개 이상일 때만 공격력 줄', () => {
    expect(lines({ mastery_3000: ON }, { alchemySameGradeCount: 4 })).toEqual([]);
    expect(lines({ mastery_3000: ON }, { alchemySameGradeCount: 5 }).map((line) => line.stat)).toEqual(['_per_attackDamage']);
    expect(lines({ mastery_3006: ON }, { alchemySameGradeCount: 7 })).toEqual([]);
    expect(lines({ mastery_3006: ON }, { alchemySameGradeCount: 8 }).map((line) => line.stat)).toEqual(['_per_attackDamage']);
  });
});

describe('극한의 단련 (1020) · 신위의 표식 (3019): 개수 × 값 %', () => {
  it('개수 칸이 0 이면 줄이 없고, N 이면 값 × N', () => {
    expect(lines({ mastery_1020: ON, weaponSssOptionCount: '0' })).toEqual([]);
    const one = lines({ mastery_1020: ON, weaponSssOptionCount: '1' })[0];
    const eight = lines({ mastery_1020: ON, weaponSssOptionCount: '8' })[0];
    expect(eight.stat).toBe('_per_attackDamage');
    expect(eight.value).toBeCloseTo(one.value! * 8, 9);
    expect(lines({ mastery_3020: ON, sssStickerCount: '3' }).map((line) => line.stat)).toEqual(['_per_hp']);
  });
});

describe('돌격 개시 (3009): 교체 등장 후 20초간 일반 몬스터 피해', () => {
  const values = { mastery_3009: ON };

  it('켜진 시간 비율만큼 줄 값이 정해진다 (100% 면 값 그대로, 50% 면 절반, 비율이 없으면 줄 없음)', () => {
    const full = lines(values, { swapUptimePercent: 100 });
    const half = lines(values, { swapUptimePercent: 50 });
    expect(full.map((line) => line.stat)).toEqual(['_per_NormalMonsterDamage']);
    expect(half[0].value).toBeCloseTo(full[0].value! / 2, 10);
    expect(lines(values, {})).toEqual([]);
  });
});

describe('교체 이후 조건: 켜진 시간 비율', () => {
  const first = swapCycle(tables)!.firstSeconds;

  it('스테이지 (긴 시간 평균) 는 두 히어로 모두 100%', () => {
    expect(swapEffectUptimes(BASE, tables, 'stage')).toEqual({ first: 100, second: 100 });
  });

  it('시간이 정해진 대상: 교체해 나오는 히어로는 100%, 먼저 서 있는 히어로는 첫 교체 전 구간만큼 뺀다', () => {
    const boss = swapEffectUptimes(BASE, tables, 'stageBoss');
    expect(boss.second).toBe(100);
    expect(boss.first).toBeLessThan(100);
    expect(boss.first).toBeGreaterThan(0);
    // 보스 제한 시간 W: 1슬롯 히어로가 서는 시간 W / 2 중 첫 교체 시각만큼이 빠진다
    const windowSeconds = targetDamageWithSwap(BASE, tables, 'stageBoss', INPUTS).windowSeconds!;
    expect(boss.first).toBeCloseTo(100 * (1 - first / (windowSeconds / 2)), 8);
  });
});

describe('교체 효과가 대미지에 들어간다', () => {
  it('3009 를 켜면 교체 계산 (스테이지 · 일반 몬스터) 의 효율이 오르고, 교체를 끄면 오르지 않는다', () => {
    const off = targetDamageWithSwap(BASE, tables, 'stage', INPUTS).perMinuteLog;
    const on = targetDamageWithSwap({ ...BASE, mastery_3009: ON }, tables, 'stage', INPUTS).perMinuteLog;
    expect(on).toBeGreaterThan(off);
    const noSwapOff = targetDamageWithSwap(BASE, tables, 'stage', { ...INPUTS, swap: false }).perMinuteLog;
    const noSwapOn = targetDamageWithSwap({ ...BASE, mastery_3009: ON }, tables, 'stage', { ...INPUTS, swap: false }).perMinuteLog;
    expect(noSwapOn).toBe(noSwapOff);
  });

  it('보스 대상에서는 일반 몬스터 피해 (3009) 는 효과가 없고 보스 피해 (3010) 가 오른다', () => {
    const base = targetDamageWithSwap(BASE, tables, 'stageBoss', INPUTS).windowTotalLog!;
    expect(targetDamageWithSwap({ ...BASE, mastery_3009: ON }, tables, 'stageBoss', INPUTS).windowTotalLog).toBeCloseTo(base, 10);
    expect(targetDamageWithSwap({ ...BASE, mastery_3010: ON }, tables, 'stageBoss', INPUTS).windowTotalLog!).toBeGreaterThan(base);
  });
});
