import { describe, expect, it } from 'vitest';
import '@/i18n';
import savedValues from '@/calc/sources/summary/testValues0154.json';
import type { CalcValues } from '@/calc/types';
import { attackStats, lineValueSum } from '@/dpm/attackStats';
import { LEGACY_TABLES } from '@/test/legacyTables';
import { loadTestTables } from '@/test/loadTestTables';

/** 01:54 계정 입력 (gameFormula0154.test.ts 와 같은 값: Python 변환 값 + 같은 저장 데이터의 다발 화살 옵션) */
const VALUES = { ...savedValues.values, skillOption_252_1: '320', skillOption_252_2: '319' } as CalcValues;

describe('대상별 최종 공격력 (log10)', () => {
  const tables = { ...loadTestTables(), ...LEGACY_TABLES };

  it('일반 몬스터: 종합 탭 최종 공격력 356.25334 (게임 식 스크립트 값) 와 같다', () => {
    expect(attackStats(VALUES, tables, 'normal').targetFinalAttackLog).toBeCloseTo(356.25334, 4);
  });

  it('보스 · 히어로 몬스터도 값이 나오고 일반과 다르다 (대상 몬스터 % 가 다름)', () => {
    const normal = attackStats(VALUES, tables, 'normal').targetFinalAttackLog!;
    for (const target of ['boss', 'hero'] as const) {
      const log = attackStats(VALUES, tables, target).targetFinalAttackLog;
      expect(log, target).not.toBeNull();
      expect(isFinite(log!), target).toBe(true);
      expect(log, target).not.toBeCloseTo(normal, 3);
    }
  });

  it('입력이 비면 (히어로 없음) null', () => {
    expect(attackStats({}, tables, 'normal').targetFinalAttackLog).toBeNull();
  });
});

describe('줄 값의 합', () => {
  it('_per_ 스탯도 줄에 적힌 값을 그대로 더한다 (대소문자 구분 없음, 다른 스탯 · 값 없는 줄은 제외)', () => {
    const lines = [
      { source: 'a', stat: '_per_superCriticalAddDmg', value: 30 },
      { source: 'b', stat: '_per_supercriticaladddmg', value: 10 },
      { source: 'c', stat: '_per_attackDamage', value: 99 },
      { source: 'd', stat: '_per_superCriticalAddDmg' },
    ];
    expect(lineValueSum(lines, '_per_superCriticalAddDmg')).toBe(40);
    expect(lineValueSum(lines, '_per_supremeCriticalDmgUp')).toBe(0);
  });
});
