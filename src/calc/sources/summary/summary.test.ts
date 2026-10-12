import { beforeAll, describe, expect, it } from 'vitest';
import '../../../i18n';
import type { RawTable, StatTables } from '../../../data/statTables';
import { parseGameNumber } from '../../gameNumber';
import { CALC_TAB_GROUPS, groupTabs } from '../../tabGroups';
import { CALC_TABS } from '../../tabs';
import { expandedTabLines } from '../../tabLines';
import type { CalcValues } from '../../types';
import { selectedAwakenStage } from '../hero/awaken';
import { heroFirstRow, slotHeroName } from '../hero/character';
import { onAttackBuffLines } from '../masteryRuneBuff/buff';
import savedValues from './testValues0213.json';
import savedValues0248 from './testValues0248.json';
import {
  attackIncreaseStats,
  compareWithScreen,
  groupSubtotals,
  increaseLogs,
  linesByGroup,
  screenRoundingLog,
  summaryRows,
  summaryTarget,
  type SummaryRowId,
} from './summary';
import { combineLines } from '../../combine';

/** 표 파일은 필요한 것만 글로 읽는다 (모든 탭이 쓰는 표) */
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

/** 02:13 사망 직후 저장 데이터로 만든 입력값 (claude-docs/react-port/verify-2026-10-07-0206-files/values_0213.json) */
const DEAD_VALUES = savedValues.values as CalcValues;
/** 연성 관통·스킬 콤보 합계 (저장 Alchemy, 화면 칸) */
const ALCHEMY_EXTRA: CalcValues = { artifactTotalSpearAttack: '25.13', artifactTotalSkillCombo: '8.37' };
/**
 * 사망 직후 화면 = 전투 버프 0. 버프 탭은 전투 버프 (광폭화·가속·연타의 분노 등) 를 늘 최대로 넣으므로 이 대조에서는 뺀다
 * (화면의 종합 칸은 버프 탭까지 모두 합친다)
 */
const DEAD_TABS = CALC_TABS.filter((tab) => tab.id !== 'buff');

let tables: StatTables = {};
beforeAll(async () => {
  tables = await loadTables();
});

function rowsOf(values: CalcValues) {
  const lines = expandedTabLines(DEAD_TABS, values, tables);
  return Object.fromEntries(summaryRows(lines, values, tables).map((row) => [row.id, row])) as Record<
    SummaryRowId,
    ReturnType<typeof summaryRows>[number]
  >;
}

function screenLog(text: string): number {
  return parseGameNumber(text)?.log as number;
}

describe('종합: 02:13 사망 직후 프로필 창과 대조', () => {
  /**
   * 공격력 증가 log 265.33 = 화산갑주 거북 SSS 6성 120% × SSS 이상 6장 (게임 코드 m2688 @33ec108, 별 무관): 1 + 1.2 × 6 = 8.2.
   * 이전에는 7성 4장 규칙 (5.8) 이라 265.18 이었다 (log(8.2 / 5.8) = 0.1504).
   * 화면 1.6CK% (265.2041) 와 +0.128 차 = 거북 몫이 늘어난 0.1504 − 이 입력에 빠진 훈련 182단계 소문자 일반 몬스터 행 0.0223
   * (gap-atk-critrate.md 2-1). 이 0.15 는 work_collect/README.md 1-2 의 "02:48 은 계산이 0.15 큼" 과 같음
   */
  it('공격력 증가 배율 = 공격력 % × 직업·속성 공격력 % × 일반 몬스터 대미지 % 와 변형 (log ≈ 265.33)', () => {
    const lines = expandedTabLines(DEAD_TABS, DEAD_VALUES, tables);
    const hero = heroFirstRow(tables, slotHeroName(DEAD_VALUES, tables));
    // 수정 뒤 값: 265.33 에서 전용 무기 장착 효과 ×2 (+0.3010, 유물 45) 와 유물 101 ÷100 (−0.6940) 이 바뀜 (gap-atk-increase-provider.md 4-3, 4-4).
    // 그 뒤 직업 일반 무기 합산 레벨 유물 4개를 모두 공격력 % 에 곱하게 고쳐 다른 3직업 몫 +0.7433 (x10101-1057-gamecode.md 2절 49행, 로그 0.74392) 이 늘어 264.94 → 265.68
    expect(increaseLogs(lines, hero).attack).toBeCloseTo(265.68, 1);
    // 화면과의 차이 = 이전 +0.1283 − 2 (×100 제거, 4-1) − 0.3906 (위 두 항목) + 0.7433 (다른 3직업 유물). 남는 −1.52 = 이 저장 시점의 음식 ×21 (1.3222) + 카드 4번 ×8 (0.9031) + 미확인 0.017 − 0.7433
    expect((rowsOf(DEAD_VALUES).atkIncrease.log as number) - screenLog('1.6CK%')).toBeCloseTo(-1.519, 2);
  });

  it('최종 공격력은 화면 217.28DD 보다 log 1.52 작다 (음식 ×21 + 카드 4번 ×8 + 미확인 0.017 이 이 입력에 없음, 다른 3직업 유물 +0.744 가 들어간 뒤)', () => {
    const rows = rowsOf(DEAD_VALUES);
    // 식을 log(M) − 2 로 고침 (gap-atk-increase-provider.md 4-1, 6절). 이전에는 화면과 0.2 이내였으나 그것은 ×100 오류와 위 누락이 상쇄된 결과
    // (−2.2645 에서 다른 3직업 일반 무기 합산 레벨 유물 +0.7439 가 늘어 −1.5206)
    expect((rows.finalAtk.log as number) - screenLog('217.28DD')).toBeCloseTo(-1.5206, 2);
    expect(rows.atk.log).toBeCloseTo(screenLog('423.76B'), 4);
  });

  it('최종 공격력은 _multiply_AttackDamage 줄 (버프 탭 ×5) 을 공격력 증가와 따로 곱한다 (m13385 @327afdc)', () => {
    const lines = expandedTabLines(DEAD_TABS, DEAD_VALUES, tables);
    const before = summaryRows(lines, DEAD_VALUES, tables);
    const after = summaryRows(
      [...lines, { source: '버프 ×5', stat: '_multiply_AttackDamage', value: 5 }],
      DEAD_VALUES,
      tables,
    );
    const logOf = (rows: typeof before, rowId: SummaryRowId) => rows.find((row) => row.id === rowId)?.log as number;
    expect(logOf(after, 'finalAtk') - logOf(before, 'finalAtk')).toBeCloseTo(Math.log10(5), 12);
    expect(logOf(after, 'atkIncrease')).toBe(logOf(before, 'atkIncrease'));
  });

  it('체력 증가·최종 체력은 화면과 같다', () => {
    const rows = rowsOf(DEAD_VALUES);
    expect(compareWithScreen(rows.hpIncrease.log, '1.38AX%')?.same).toBe(true);
    expect(Math.abs((rows.finalHp.log as number) - screenLog('417.78BS'))).toBeLessThan(0.002);
  });

  it('공격속도·확률 줄', () => {
    const rows = rowsOf({ ...DEAD_VALUES, ...ALCHEMY_EXTRA });
    const percentOf = (rowId: SummaryRowId) => Math.pow(10, rows[rowId].log as number);
    expect(percentOf('attackSpeed')).toBeCloseTo(1736, 6);
    expect(percentOf('doubleAttack')).toBeCloseTo(188, 6);
    expect(percentOf('spearAttack')).toBeCloseTo(75.13, 6);
    expect(percentOf('skillCombo')).toBeCloseTo(38.37, 6);
    expect(percentOf('switchingBoost')).toBeCloseTo(55.15, 6);
    expect(percentOf('smite')).toBeCloseTo(113.65, 6);
    expect(percentOf('barrier')).toBeCloseTo(46.75, 6);
    // 치명타 확률: 줄 합 488.3 + 기본값 1 (게임 코드 상수, T1282 m6859) = 489.3 (02:06·02:48 화면 489.3 과 같음).
    // 슈퍼 치명타 = 18.37 + 40 + 38단계 × 1 (02:06 화면 96.37 과 같음, 489.3 이어도 38단계)
    expect(percentOf('criticalRate')).toBeCloseTo(489.3, 6);
    expect(percentOf('superCritical')).toBeCloseTo(96.37, 6);
  });

  /**
   * 치명타 데미지 = 합 계열 (훈련 879 + 유물 25 + 기본값 120 (게임 코드 상수)) × 곱 계열 (기본·궁수·물·체력 70% 카드) ÷ 100.
   * 치명타 줄은 02:06·02:13·02:48 저장이 같아 (verify-2026-10-07-0248.md 4절) 스테이지 밖 02:48 화면 105.81B% 와 같아야 한다.
   * 02:06 화면 158.68B% 는 전투 중 ×1.4997 (출처 못 찾음) 이 붙은 값이라 대조하지 않는다
   */
  it('치명타 데미지 = 합 계열 × 곱 계열 ÷ 100 (02:48 화면 105.81B% 와 같음)', () => {
    const lines = expandedTabLines(DEAD_TABS, DEAD_VALUES, tables);
    const combined = combineLines(lines);
    expect(combined.criticalDmg.sum).toBeCloseTo(1024, 6);
    const rows = rowsOf(DEAD_VALUES);
    expect(compareWithScreen(rows.criticalDamage.log, '105.81B%')?.same).toBe(true);
  });

  it('보스·히어로 몬스터 대미지는 화면과 같다', () => {
    const rows = rowsOf(DEAD_VALUES);
    expect(compareWithScreen(rows.bossMonster.log, '23.16E%')?.same).toBe(true);
    expect(compareWithScreen(rows.heroMonster.log, '18.72E%')?.same).toBe(true);
  });

  it('하위 탭 소계를 다 곱하면 전체와 같다', () => {
    const hero = heroFirstRow(tables, slotHeroName(DEAD_VALUES, tables));
    const groups = CALC_TAB_GROUPS.map((group) => ({ id: group.id, tabs: groupTabs(group.tabIds) }));
    const subtotals = groupSubtotals(linesByGroup(groups, DEAD_VALUES, tables), hero);
    const total = increaseLogs(expandedTabLines(CALC_TABS, DEAD_VALUES, tables), hero);
    expect(subtotals.reduce((sum, group) => sum + group.attack, 0)).toBeCloseTo(total.attack, 6);
    expect(subtotals.reduce((sum, group) => sum + group.hp, 0)).toBeCloseTo(total.hp, 6);
  });
});

describe('종합: 공격 대상 칸 (일반 / 보스 / 히어로 몬스터)', () => {
  it('대상 칸이 비었거나 모르는 값이면 일반', () => {
    expect(summaryTarget({})).toBe('normal');
    expect(summaryTarget({ summaryTarget: 'boss' })).toBe('boss');
    expect(summaryTarget({ summaryTarget: 'hero' })).toBe('hero');
    expect(summaryTarget({ summaryTarget: 'abc' })).toBe('normal');
  });

  it('대상마다 공격력 증가가 대상 몬스터 대미지 % 와 그 직업·속성 변형만큼 달라진다 (02:13)', () => {
    const lines = expandedTabLines(DEAD_TABS, DEAD_VALUES, tables);
    const hero = heroFirstRow(tables, slotHeroName(DEAD_VALUES, tables));
    const combined = combineLines(lines);
    const logOf = (stat: string) =>
      Object.entries(combined).find(([name]) => name.toLowerCase() === stat.toLowerCase())?.[1].log ?? 0;
    /** 대상 몬스터 대미지 % × 궁수 변형 × 물 변형 (1슬롯 히어로 = 궁수·물) */
    const targetLog = (kind: string) =>
      logOf(`_per_${kind}MonsterDamage`) + logOf(`_per_${hero?.job}_${kind}MonsterDamage`) + logOf(`_per_${hero?.attribute}Hero_${kind}MonsterDamage`);
    const normal = increaseLogs(lines, hero, 'normal').attack;
    const boss = increaseLogs(lines, hero, 'boss').attack;
    const heroTarget = increaseLogs(lines, hero, 'hero').attack;
    expect(normal).toBeCloseTo(increaseLogs(lines, hero).attack, 12);
    expect(normal).toBeCloseTo(265.68, 1);
    expect(boss - normal).toBeCloseTo(targetLog('Boss') - targetLog('Normal'), 9);
    expect(heroTarget - normal).toBeCloseTo(targetLog('Hero') - targetLog('Normal'), 9);
    expect(Math.abs(boss - normal)).toBeGreaterThan(0.1);
    expect(Math.abs(heroTarget - normal)).toBeGreaterThan(0.1);
  });

  it('종합 줄: 대상 칸 값으로 공격력 증가·최종 공격력이 바뀌고 몬스터 피해 세 줄은 그대로', () => {
    const normalRows = rowsOf(DEAD_VALUES);
    const bossRows = rowsOf({ ...DEAD_VALUES, summaryTarget: 'boss' });
    const lines = expandedTabLines(DEAD_TABS, DEAD_VALUES, tables);
    const hero = heroFirstRow(tables, slotHeroName(DEAD_VALUES, tables));
    const shift = increaseLogs(lines, hero, 'boss').attack - increaseLogs(lines, hero, 'normal').attack;
    expect((bossRows.finalAtk.log as number) - (normalRows.finalAtk.log as number)).toBeCloseTo(shift, 9);
    expect(bossRows.atkIncrease.log).not.toBeCloseTo(normalRows.atkIncrease.log as number, 3);
    for (const rowId of ['normalMonster', 'bossMonster', 'heroMonster', 'hpIncrease'] as const) {
      expect(bossRows[rowId].log).toBe(normalRows[rowId].log);
    }
  });

  it('"몬스터 공격시 5초간" 줄은 전투 밖 종합 줄에 직접 안 들어가고, 버프 탭 줄이 고른 대상일 때만 일반 스탯으로 넣는다 (m2708 · m2042)', () => {
    const onAttackLines = [
      { source: '스티커', stat: '_per_attackDamage_BossAtk', value: 100 },
      { source: '스티커', stat: '_per_attackDamage_NormalAtk', value: 300 },
      { source: '카드', stat: 'criticalRate_BossAtk', value: 7 },
      { source: '카드', stat: 'criticalRate_normalMonsterAtk', value: 3 },
      { source: '카드', stat: 'attackSpeed_BossAtk', value: 20 },
      { source: '카드', stat: '_per_criticalDmg_BossAtk', value: 100 },
      // 치명타 데미지 합 계열 (곱 계열만 있으면 화면 값이 0)
      { source: '훈련', stat: 'criticalDmg', value: 100 },
    ];
    // 원래 이름 줄만으로는 어느 대상이어도 전투 밖 계산에 안 들어간다
    for (const target of ['boss', 'normal', 'hero'] as const) {
      expect(increaseLogs(onAttackLines, undefined, target).attack).toBe(0);
    }
    const rawRows = Object.fromEntries(
      summaryRows(onAttackLines, { summaryTarget: 'boss' }, tables).map((row) => [row.id, row.log]),
    );
    expect(rawRows.criticalRate).toBe(-Infinity);
    expect(rawRows.attackSpeed).toBe(-Infinity);
    expect(Math.pow(10, rawRows.criticalDamage as number)).toBeCloseTo(1, 9);
    // 버프 탭 줄: 고른 대상의 줄만 일반 스탯 이름으로 바꾸고 값은 그대로
    const buffLinesFor = (target: 'normal' | 'boss' | 'hero') => onAttackBuffLines(onAttackLines, target, (key) => key);
    expect(buffLinesFor('hero')).toEqual([]);
    expect(buffLinesFor('boss').map((line) => [line.stat, line.value])).toEqual([
      ['_per_attackDamage', 100],
      ['_per_criticalDmg', 100],
      ['criticalRate', 7],
      ['attackSpeed', 20],
    ]);
    expect(buffLinesFor('normal').map((line) => [line.stat, line.value])).toEqual([
      ['_per_attackDamage', 300],
      ['criticalRate', 3],
    ]);
    const withBuffLines = (target: 'normal' | 'boss' | 'hero') => [...onAttackLines, ...buffLinesFor(target)];
    expect(increaseLogs(withBuffLines('boss'), undefined, 'boss').attack).toBeCloseTo(Math.log10(2), 12);
    expect(increaseLogs(withBuffLines('normal'), undefined, 'normal').attack).toBeCloseTo(Math.log10(4), 12);
    expect(increaseLogs(withBuffLines('hero'), undefined, 'hero').attack).toBe(0);
    const rowsFor = (target: 'normal' | 'boss' | 'hero') =>
      Object.fromEntries(
        summaryRows(withBuffLines(target), { summaryTarget: target }, tables).map((row) => [row.id, row.log]),
      );
    const boss = rowsFor('boss');
    const normal = rowsFor('normal');
    const heroTarget = rowsFor('hero');
    expect(Math.pow(10, boss.criticalRate as number)).toBeCloseTo(7, 9);
    expect(Math.pow(10, normal.criticalRate as number)).toBeCloseTo(3, 9);
    expect(heroTarget.criticalRate).toBe(-Infinity);
    expect(Math.pow(10, boss.attackSpeed as number)).toBeCloseTo(20, 9);
    expect(normal.attackSpeed).toBe(-Infinity);
    // 합 100 × 곱 (보스 공격시 ×2) ÷ 100 = 2, 일반은 곱 ×1 → 1
    expect(Math.pow(10, boss.criticalDamage as number)).toBeCloseTo(2, 9);
    expect(Math.pow(10, normal.criticalDamage as number)).toBeCloseTo(1, 9);
  });
});

describe('종합: 공격력 증가 표시 · 최종 공격력 식 (gap-atk-increase-provider.md 4-1)', () => {
  const lines = [
    { source: '가', stat: '_per_attackDamage', value: 900 },
    { source: '나', stat: '_per_hp', value: 900 },
  ];
  it('공격력 증가 표시는 곱 누적값 그대로 (×100 을 더 붙이지 않음), 체력 증가는 이전 식 그대로 (+2)', () => {
    const rows = Object.fromEntries(summaryRows(lines, {}, tables).map((row) => [row.id, row.log]));
    expect(rows.atkIncrease).toBeCloseTo(1, 12);
    expect(rows.hpIncrease).toBeCloseTo(Math.log10((10 - 1) * 100), 12);
  });
  it('최종 공격력에는 log(곱) − 2 가 들어간다', () => {
    const rows = Object.fromEntries(summaryRows(lines, DEAD_VALUES, tables).map((row) => [row.id, row.log as number]));
    const awakenFinalAtk = selectedAwakenStage(DEAD_VALUES, tables)!.finalAtk;
    // 공격력 증가 표시 (log M = 1) 와 달리 최종 공격력에는 log M − 2 = −1
    expect(rows.finalAtk - rows.atk - awakenFinalAtk).toBeCloseTo(1 - 2, 12);
  });
});

describe('종합: 적 수 5 이상 칸 (카드 4번 _MonsterCntLong)', () => {
  it('칸이 비었거나 꺼짐이면 같은 결과 (처음 값 = 꺼짐)', () => {
    const off = rowsOf(DEAD_VALUES).atkIncrease.log as number;
    expect(rowsOf({ ...DEAD_VALUES, summaryEnemyCountReached: 'false' }).atkIncrease.log).toBe(off);
  });
  it('켜면 02:48 입력의 공격력 증가가 카드 4번 값만큼 늘고 (끄면 그대로), 다른 대상 줄은 안 바뀐다', () => {
    const cardLine = expandedTabLines(DEAD_TABS, PROFILE_0248_VALUES, tables).find((line) =>
      line.stat.endsWith('_MonsterCntLong'),
    );
    expect(cardLine?.stat).toBe('_per_attackDamage_MonsterCntLong');
    const off = rows0248Values(PROFILE_0248_VALUES);
    const on = rows0248Values({ ...PROFILE_0248_VALUES, summaryEnemyCountReached: 'true' });
    expect(on.atkIncrease.log! - off.atkIncrease.log!).toBeCloseTo(Math.log10(1 + Number(cardLine?.value) / 100), 9);
    expect(on.hpIncrease.log).toBe(off.hpIncrease.log);
  });
});

/** 02:48 입력 → 종합 줄 (대상 일반, 버프 탭 뺌) */
function rows0248Values(values: CalcValues) {
  const lines = expandedTabLines(DEAD_TABS, values, tables);
  return Object.fromEntries(summaryRows(lines, values, tables).map((row) => [row.id, row])) as Record<
    SummaryRowId,
    ReturnType<typeof summaryRows>[number]
  >;
}

describe('종합: 성별 공격력 % (묶음 A 의 0x1c2 남 · 0x1c3 여)', () => {
  const female = { job: 'Archer', attribute: 'Water', gender: '2' };
  const male = { job: 'Archer', attribute: 'Water', gender: '1' };
  const lines = [
    { source: '영혼 단조', stat: '_per_Female_AttackDamage', value: 100 },
    { source: '영혼 단조', stat: '_per_Male_AttackDamage', value: 300 },
  ];
  it('히어로 성별에 맞는 성별 공격력 이름만 공격력 증가 이름에 든다', () => {
    expect(attackIncreaseStats(female)).toContain('_per_Female_AttackDamage');
    expect(attackIncreaseStats(female)).not.toContain('_per_Male_AttackDamage');
    expect(attackIncreaseStats(male)).toContain('_per_Male_AttackDamage');
    expect(attackIncreaseStats(male)).not.toContain('_per_Female_AttackDamage');
    expect(attackIncreaseStats(undefined)).not.toContain('_per_Female_AttackDamage');
  });
  it('여자 히어로는 여자 몫 x2, 남자 히어로는 남자 몫 x4 만 곱한다', () => {
    expect(increaseLogs(lines, female).attack).toBeCloseTo(Math.log10(2), 12);
    expect(increaseLogs(lines, male).attack).toBeCloseTo(Math.log10(4), 12);
    expect(increaseLogs(lines, undefined).attack).toBe(0);
  });
});

describe('종합: 치명타 데미지 식', () => {
  it('합 계열 C × 곱 계열 D ÷ 100, 체력 70% 이상 카드 줄은 곱 계열. 합 계열이 없으면 0', () => {
    const lines = [
      { source: '훈련', stat: 'criticalDmg', value: 904 },
      { source: '기본', stat: 'criticalDmg', value: 120 },
      { source: '연성', stat: '_per_criticalDmg', value: 900 },
      { source: '카드', stat: '_per_criticalDmg_MyHp70Long', value: 560 },
    ];
    const row = summaryRows(lines, {}, tables).find((item) => item.id === 'criticalDamage')!;
    expect(row.log).toBeCloseTo(Math.log10((1024 * 10 * 6.6) / 100), 12);
    const onlyMultiplier = summaryRows(lines.slice(2), {}, tables).find((item) => item.id === 'criticalDamage')!;
    expect(onlyMultiplier.log).toBe(-Infinity);
  });
});

/** 02:48 저장 (프로필 화면 219, 스테이지 밖) 입력값. 훈련 넷째 칸은 저장 레벨 946 으로 고친 값 (gap-atk-critrate.md 2-1) */
const PROFILE_0248_VALUES = savedValues0248.values as CalcValues;

describe('종합: 02:48 프로필 화면 (219) 과 대조', () => {
  function rows0248(values: CalcValues, tabs = DEAD_TABS) {
    const lines = expandedTabLines(tabs, values, tables);
    return Object.fromEntries(summaryRows(lines, values, tables).map((row) => [row.id, row])) as Record<
      SummaryRowId,
      ReturnType<typeof summaryRows>[number]
    >;
  }

  it('치명타 확률 489.3% · 치명타 데미지 105.81B% 는 화면과 같다', () => {
    const rows = rows0248(PROFILE_0248_VALUES);
    expect(Math.pow(10, rows.criticalRate.log as number)).toBeCloseTo(489.3, 6);
    expect(compareWithScreen(rows.criticalRate.log, '489.3%')?.same).toBe(true);
    const criticalDamage = compareWithScreen(rows.criticalDamage.log, '105.81B%');
    expect(criticalDamage?.same).toBe(true);
    expect(Math.abs(criticalDamage?.differenceLog as number)).toBeLessThan(0.0001);
  });

  it('공격력 증가 (대상 일반, 버프 탭 뺌) 는 화면 3.35CK% 보다 log 1.4989 작음 = 음식 ×21 (1.3222) + 카드 4번 ×8 (0.9031) + 미확인 0.0170 − 다른 3직업 유물 0.7439', () => {
    const rows = rows0248(PROFILE_0248_VALUES);
    const attackIncrease = compareWithScreen(rows.atkIncrease.log, '3.35CK%');
    // 이전 +0.1502 (거북 6장 규칙) − 2 (×100 제거) − 0.3930 (전용 무기 ×2 +0.3010, 유물 101 ÷100 −0.6940) + 0.7439 (일반 무기 합산 레벨 유물 4직업 모두 곱함). gap-atk-increase-provider.md 4절·5절, x10101-1057-gamecode.md 2절
    expect(attackIncrease?.differenceLog).toBeCloseTo(-1.4989, 3);
  });

  it('02:48 공격력 증가: 공격력 이벤트 버프를 켜면 ×3, 적 수 5 이상을 켜면 카드 4번 ×8 만큼 화면과의 차이가 줄어든다 (이벤트 버프는 음식과 별도)', () => {
    const attackOnly = { ...PROFILE_0248_VALUES, attackEventBuff: 'true' };
    const base = compareWithScreen(rows0248(PROFILE_0248_VALUES, CALC_TABS).atkIncrease.log, '3.35CK%')?.differenceLog as number;
    const withBuff = compareWithScreen(rows0248(attackOnly, CALC_TABS).atkIncrease.log, '3.35CK%')?.differenceLog as number;
    expect(withBuff - base).toBeCloseTo(Math.log10(3), 3);
    const withEnemies = compareWithScreen(
      rows0248({ ...attackOnly, summaryEnemyCountReached: 'true' }, CALC_TABS).atkIncrease.log,
      '3.35CK%',
    )?.differenceLog as number;
    expect(withEnemies - withBuff).toBeCloseTo(Math.log10(8), 3);
  });

  it('일반 몬스터 줄: 음식 없으면 화면이 ×7 큼, 딸기 타르트 600% 를 고르면 화면과 같다 (음식이 원인인지는 추정)', () => {
    const withoutFood = compareWithScreen(rows0248(PROFILE_0248_VALUES).normalMonster.log, '2.27F%');
    expect(withoutFood?.differenceLog).toBeCloseTo(-Math.log10(7), 2);
    const foodValues = { ...PROFILE_0248_VALUES, normalMonsterFood: 'strawberryTart' };
    const withFood = compareWithScreen(rows0248(foodValues, CALC_TABS).normalMonster.log, '2.27F%');
    expect(withFood?.same).toBe(true);
  });
});

describe('화면 값 비교', () => {
  it('반올림 범위', () => {
    expect(screenRoundingLog('1.6CK%')).toBeCloseTo(Math.log10(1.65 / 1.6), 10);
    expect(screenRoundingLog('1,736%')).toBeCloseTo(Math.log10(1736.5 / 1736), 10);
  });
  it('범위 안이면 같음, 밖이면 다름과 차이', () => {
    expect(compareWithScreen(Math.log10(1736.2), '1,736%')?.same).toBe(true);
    const different = compareWithScreen(Math.log10(1800), '1,736%');
    expect(different?.same).toBe(false);
    expect(different?.differenceLog).toBeCloseTo(Math.log10(1800 / 1736), 10);
  });
  it('빈칸·읽을 수 없는 값이면 비교 없음', () => {
    expect(compareWithScreen(1, '')).toBeNull();
    expect(compareWithScreen(1, 'abc')).toBeNull();
    expect(compareWithScreen(null, '1.5A')).toBeNull();
  });
});
