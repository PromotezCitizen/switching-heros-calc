import { beforeAll, describe, expect, it } from 'vitest';
import '@/i18n';
import type { RawTable, StatTables } from '@/data/statTables';
import { parseGameNumber } from '@/calc/gameNumber';
import { CALC_TABS } from '@/calc/tabs';
import { expandedTabLines } from '@/calc/tabLines';
import type { CalcValues } from '@/calc/types';
import { compareWithScreen, summaryRows, type SummaryRowId } from '@/calc/sources/summary/summary';
import savedValues from '@/calc/sources/summary/testValues0154.json';

/**
 * 2026-10-12 01:54 계정 (전투 중 최대 상태 캡처) 의 저장 JSON 으로 만든 입력 (testValues0154.json, scratchpad 변환 스크립트 build_values_0154.py) 을
 * 계산기에 넣었을 때 결과를 그때 프로필 화면 값과 대조한다. 화면 값: claude-docs/device_data/2026-10-12_0154_now/screen_values.md.
 * 게임 식 쪽 값 (공격력 증가 로그 293.08149, 최종 공격력 로그 356.25334) 은 scratchpad verify0113 의 combat0113.py 결과와도 같다.
 * 입력은 전투 중 최대 상태 켜짐 칸 (적 수 5 이상 · 광폭화 5중첩 · 학살자 · 공격력 이벤트 버프) 까지 저장 데이터에서 읽은 값이다.
 */
const TABLE_FILES = import.meta.glob<string>('../../../../public/data/tables/*.json', { query: '?raw', import: 'default' });

async function loadTables(): Promise<StatTables> {
  const names = [...new Set(CALC_TABS.flatMap((tab) => [...tab.tableNames]))];
  const tables: StatTables = {};
  for (const name of names) {
    const load = TABLE_FILES[`../../../../public/data/tables/${name}.json`];
    if (load) tables[name] = JSON.parse(await load()) as RawTable;
  }
  return tables;
}

/**
 * Python 변환 값에는 스킬 옵션 칸이 없다 (그때는 다발 화살 옵션을 늘 넣었다). 같은 저장 데이터 (saveSubset0154.json) 의
 * 다발 화살 252 세트 1 옵션 rNo 320 (공격력 25% × 5중첩) · 319 (쿨타임 1.5초 감소) 를 더한다
 */
const VALUES = { ...savedValues.values, skillOption_252_1: '320', skillOption_252_2: '319' } as CalcValues;
let tables: StatTables = {};
beforeAll(async () => {
  tables = await loadTables();
});

function rows(values: CalcValues = VALUES) {
  const lines = expandedTabLines(CALC_TABS, values, tables);
  return Object.fromEntries(summaryRows(lines, values, tables).map((row) => [row.id, row])) as Record<
    SummaryRowId,
    ReturnType<typeof summaryRows>[number]
  >;
}

/** 01:54~01:55 프로필 화면 값 (screen_values.md) */
const SCREEN: Record<string, string> = {
  finalAtk: '179.2DN',
  finalHp: '637.66BY',
  atkIncrease: '120.64CS%',
  hpIncrease: '3.97BB%',
  attackSpeed: '2,193%',
  criticalRate: '611.1895%',
  criticalDamage: '2.19C%',
  normalMonster: '2.11F%',
  bossMonster: '150.3E%',
  heroMonster: '137.01E%',
  doubleAttack: '251.69%',
  superCritical: '118.68%',
  spearAttack: '103.01%',
  switchingBoost: '30%',
  skillCombo: '47.6%',
  smite: '102.9%',
  barrier: '67.73%',
};

describe('01:54 계정 (전투 중 최대 상태) 프로필 화면 대조', () => {
  it.each(Object.entries(SCREEN))('%s 줄이 화면 %s 의 반올림 범위 안', (rowId, text) => {
    const comparison = compareWithScreen(rows()[rowId as SummaryRowId].log, text);
    expect(comparison?.same).toBe(true);
  });

  it('공격력 증가 로그 293.08149, 최종 공격력 로그 356.25334 (게임 식 스크립트 값과 같음)', () => {
    const result = rows();
    expect(result.atkIncrease.log as number).toBeCloseTo(293.08149, 4);
    expect(result.finalAtk.log as number).toBeCloseTo(356.25334, 4);
    expect(result.atkIncrease.log as number).toBeCloseTo(parseGameNumber('120.64CS')?.log as number, 4);
  });

  it('치명타 데미지 2.19C% = 로그 9.34087 (연쇄 작렬 109 복리 덧셈이 들어간 값)', () => {
    expect(rows().criticalDamage.log as number).toBeCloseTo(parseGameNumber('2.19C')?.log as number, 3);
  });

  it('공격속도 2,193.37 = 정적 1,904 + 관통의 맹공 204 복리 159.37 + 추진력 +50 + 야성 강화 30 + 우격다짐 50', () => {
    expect(Math.pow(10, rows().attackSpeed.log as number)).toBeCloseTo(2193.3742, 3);
  });

  it('치명타 확률 611.1895 = 정적 548.3 + 약점 사냥 309 복리 62.8895', () => {
    expect(Math.pow(10, rows().criticalRate.log as number)).toBeCloseTo(611.1895, 3);
  });
});
