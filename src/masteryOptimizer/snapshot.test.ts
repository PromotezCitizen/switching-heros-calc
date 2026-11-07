import { describe, expect, it } from 'vitest';
import '@/i18n';
import monsterHp from '../../public/data/monsterHp.json';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import type { MonsterHpData } from '@/dpm/hpCondition';
import { DAMAGE_TARGETS, type DamageInputs } from '@/dpm/targetDamage';
import { OPTIMIZER_TABLES } from '@/masteryOptimizer/optimizerTables';
import { optimizerSnapshot, type OptimizerInputs } from '@/masteryOptimizer/snapshot';
import { loadTestTables } from '@/test/loadTestTables';
import { importSave, pickDefault, type SaveFiles } from '@/usb/saveImport/importSave';
import saveSubset1018 from '@/usb/saveImport/saveSubset1018.json';

const tables = loadTestTables();
const raw = saveSubset1018 as unknown as Omit<SaveFiles, 'Default'> & { Default: Parameters<typeof pickDefault>[0] };
const imported = importSave({ ...raw, Default: pickDefault(raw.Default) }, tables);
const VALUES = { ...imported.values, [ACCOUNT_KEYS.vipLevel]: imported.accountValues[ACCOUNT_KEYS.vipLevel] };
/** 10-18 저장 데이터 Default.userLv */
const USER_LEVEL_1018 = 81798;
const DAMAGE: DamageInputs = {
  targetsPerSkill: 3,
  orbShardHits: {},
  targetStatusCount: {},
  stageFloor: 9827,
  attributeDungeonFloor: null,
  monsterHp: monsterHp as MonsterHpData,
};
const INPUTS: OptimizerInputs = { userLevel: USER_LEVEL_1018, vipLevel: Number(VALUES[ACCOUNT_KEYS.vipLevel]), target: 'stage', damage: DAMAGE };

describe('최적 특성 페이지가 불러오는 표만으로 계산해도 결과가 같다 (브라우저에서는 이 표만 받는다)', () => {
  const pageTables = Object.fromEntries(Object.entries(tables).filter(([name]) => OPTIMIZER_TABLES.includes(name)));

  it('페이지 표는 시험용 묶음의 일부이고, 빠진 표가 있어도 대상 넷의 효율이 같다', () => {
    expect(Object.keys(pageTables).length).toBe(OPTIMIZER_TABLES.length);
    for (const target of DAMAGE_TARGETS) {
      const full = optimizerSnapshot(VALUES, tables, { ...INPUTS, target });
      const page = optimizerSnapshot(VALUES, pageTables, { ...INPUTS, target });
      expect(page.efficiency, target).toBe(full.efficiency);
      expect(page.result.missing, target).toEqual(full.result.missing);
    }
  });
});

describe('지금 상태 (10-18 계정)', () => {
  const snapshot = optimizerSnapshot(VALUES, tables, INPUTS);

  it('총 포인트 = 유저 레벨 − 1 + VIP 몫, 남은 포인트 = 총 − 사용', () => {
    expect(snapshot.totalPoints).toBe(USER_LEVEL_1018 - 1 + snapshot.vipPoints);
    expect(snapshot.remainingPoints).toBe(snapshot.totalPoints - snapshot.usedPoints);
    expect(snapshot.usedPoints).toBeGreaterThan(0);
  });

  it('지금 찍은 배분은 규칙을 지킨다 (저장된 실제 배분)', () => {
    expect(snapshot.violations).toEqual([]);
    expect(snapshot.remainingPoints).toBeGreaterThanOrEqual(0);
  });

  it('효율이 유한한 값, 평가 시간이 잰다', () => {
    expect(isFinite(snapshot.efficiency)).toBe(true);
    expect(snapshot.evaluateMs).toBeGreaterThan(0);
  });

  it('유저 레벨을 낮추면 해금이 모자란 특성이 위반으로 나온다', () => {
    const lowLevel = optimizerSnapshot(VALUES, tables, { ...INPUTS, userLevel: 1000 });
    expect(lowLevel.violations.some((violation) => violation.kind === 'userLevel')).toBe(true);
  });

  it('대상을 바꾸면 그 대상의 효율을 낸다', () => {
    const boss = optimizerSnapshot(VALUES, tables, { ...INPUTS, target: 'stageBoss' });
    expect(boss.result.target).toBe('stageBoss');
    expect(boss.efficiency).toBe(boss.result.windowTotalLog);
  });
});
