import { describe, expect, it } from 'vitest';
import '@/i18n';
import monsterHp from '@public/data/monsterHp.json';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { CONSTS } from '@/CONSTS';
import type { CalcValues } from '@/calc/types';
import type { MonsterHpData } from '@/dpm/hpCondition';
import { DAMAGE_TARGETS, logSum, targetDamage, type DamageInputs, type DamageTarget } from '@/dpm/targetDamage';
import { loadTestTables } from '@/test/loadTestTables';
import { importSave, pickDefault, type SaveFiles } from '@/usb/saveImport/importSave';
import saveSubset1018 from '@/usb/saveImport/saveSubset1018.json';

const tables = loadTestTables();
const raw = saveSubset1018 as unknown as Omit<SaveFiles, 'Default'> & { Default: Parameters<typeof pickDefault>[0] };
const imported = importSave({ ...raw, Default: pickDefault(raw.Default) }, tables);
const VALUES = { ...imported.values, [ACCOUNT_KEYS.vipLevel]: imported.accountValues[ACCOUNT_KEYS.vipLevel] };
const INPUTS: DamageInputs = {
  targetsPerSkill: 3,
  orbShardHits: { stage: 2, stageBoss: 5, awaken: 5, attributeHero: 5 },
  targetStatusCount: {},
  stageFloor: 9827,
  attributeDungeonFloor: null,
  monsterHp: monsterHp as MonsterHpData,
};
const damageOf = (values: CalcValues, target: DamageTarget, inputs: DamageInputs = INPUTS) => targetDamage(values, tables, target, inputs);

describe('10-18 계정 공격 한 번씩 대미지', () => {
  it('대상마다 값이 나온다 (평타 · 버프 4 · 액티브 화살 폭격 255 · 전용 12217)', () => {
    for (const target of ['stage', 'stageBoss', 'awaken', 'attributeHero'] as const) {
      const result = damageOf(VALUES, target);
      expect(isFinite(result.totalLog), target).toBe(true);
      const kinds = result.parts.map((part) => `${part.kind}:${part.skillId ?? ''}`).sort();
      expect(kinds, target).toEqual(['active:255', 'buff:201', 'buff:202', 'buff:203', 'buff:204', 'char:12217', 'normal:'].sort());
      expect(result.missing, target).not.toContain('unsupportedSkill:255');
    }
  });

  it('합 = 부분 대미지의 합', () => {
    const stage = damageOf(VALUES, 'stage');
    expect(stage.totalLog).toBeCloseTo(logSum(stage.parts.map((part) => part.damagePerCastLog)), 12);
  });

  it('공격력 이벤트 버프를 켜면 줄지 않는다', () => {
    for (const target of ['stage', 'stageBoss', 'awaken', 'attributeHero'] as const) {
      const boosted = damageOf({ ...VALUES, attackEventBuff: 'true' }, target).totalLog;
      const base = damageOf({ ...VALUES, attackEventBuff: '' }, target).totalLog;
      expect(boosted, target).toBeGreaterThanOrEqual(base - 1e-9);
    }
  });

  it('카드 전투 조건 (용암거미 R_15 의 주위 적 5마리 이하 줄) 은 대상별: 각성 (적 1마리) 에서 더 오른다', () => {
    const gain = (target: DamageTarget) =>
      damageOf({ ...VALUES, cardSlot1: '27', cardSlotGrade1: 'R_15' }, target).totalLog - damageOf({ ...VALUES, cardSlot1: '', cardSlotGrade1: '' }, target).totalLog;
    expect(gain('awaken')).toBeGreaterThan(gain('stage') + 0.5);
    const withCard = damageOf({ ...VALUES, cardSlot1: '27', cardSlotGrade1: 'R_15' }, 'stage');
    expect(withCard.missing.some((code) => code.startsWith('conditionStatsNotCounted:'))).toBe(false);
  }, 30000);

  it('상태이상 수: 입력이 없으면 OPTIMIZER_RULES (4, PvP 0), 입력을 주면 그 값', () => {
    const { STATUS_COUNT } = CONSTS.dpm.OPTIMIZER_RULES;
    const ruled = damageOf(VALUES, 'stage').totalLog;
    expect(damageOf(VALUES, 'stage', { ...INPUTS, targetStatusCount: { stage: STATUS_COUNT } }).totalLog).toBeCloseTo(ruled, 12);
    expect(damageOf(VALUES, 'stage', { ...INPUTS, targetStatusCount: { stage: 0 } }).totalLog).toBeLessThanOrEqual(ruled + 1e-12);
    expect(damageOf(VALUES, 'pvp').totalLog).toBeCloseTo(damageOf(VALUES, 'pvp', { ...INPUTS, targetStatusCount: { pvp: 0 } }).totalLog, 12);
  });

  it('체력이 늘 100% 인 대상 (체력 무한 · PvP) 만 체력 70% 이상 줄이 붙는다', () => {
    const hp70 = { ...VALUES, cardSlot1: '2', cardSlotGrade1: 'B_10' };
    const noCard = { ...VALUES, cardSlot1: '', cardSlotGrade1: '' };
    const gain = (target: DamageTarget) => damageOf(hp70, target).totalLog - damageOf(noCard, target).totalLog;
    expect(gain('awaken')).toBeGreaterThan(gain('stageBoss') + 1e-6);
    expect(gain('pvp')).toBeGreaterThan(gain('attributeHero') + 1e-6);
  });

  it('대상 12개 모두 계산된다', () => {
    for (const target of DAMAGE_TARGETS) expect(isFinite(damageOf(VALUES, target).totalLog), target).toBe(true);
  });

  it('히어로 없으면 값 없음', () => {
    expect(damageOf({}, 'stage').missing).toEqual(['noHero']);
  });
});
