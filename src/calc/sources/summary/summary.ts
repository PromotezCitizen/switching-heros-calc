/**
 * 종합 탭 계산: 모든 탭의 줄을 합쳐 프로필 창 줄마다 계산 값을 만들고, 화면 값과 비교한다.
 * 근거 문서: claude-docs/react-port/verify-2026-10-07-0206.md (확률 규칙·최종 체력·최종 공격력),
 * barrier-and-atk-gap.md 3절 (공격력 증가 = 공격력 % × 직업·속성 공격력 % × 대상 몬스터 대미지 % 와 그 직업·속성 변형).
 * 대상 (일반 / 보스 / 히어로 몬스터) 은 종합 탭 대상 칸으로 고르고, 처음 값은 일반 (프로필 창이 일반 기준으로 맞음).
 * 화면·React 와 무관한 순수 함수
 */
import { CONSTS } from '../../../CONSTS';
import type { StatTables, TableRow } from '../../../data/statTables';
import { combineLines, type CombinedStat, type Line } from '../../combine';
import { parseGameNumber } from '../../gameNumber';
import { expandedTabLines } from '../../tabLines';
import type { CalcTab, CalcValues } from '../../types';
import { selectedAwakenStage } from '../hero/awaken';
import { classHpStats, heroBase, heroFirstRow, slotHeroName } from '../hero/character';
import { attackSpeedPercent, doubleAttackPercent, multiplierPercentLog } from '../masteryRuneBuff/buff';
import { hasEquippedActiveSkill } from '../skill/skill';

const {
  STATS,
  VARIANT_SUFFIXES,
  ATTRIBUTE_HERO_SUFFIX,
  PER_PREFIX,
  SUPER_CRITICAL_RATE_THRESHOLD,
  SUPER_CRITICAL_RATE_STEP,
  CRITICAL_DAMAGE_DIVISOR_LOG,
  ROUNDING_HALF,
  SCREEN_FIELD_PREFIX,
  TARGET_FIELD,
  TARGET_KINDS,
  DEFAULT_TARGET,
  TARGET_STATS,
  GENDER_ATTACK_STATS,
  ATTACK_INCREASE_FINAL_OFFSET_LOG,
} = CONSTS.summary;

/** 공격 대상 종류 (일반 / 보스 / 히어로 몬스터) */
export type SummaryTarget = (typeof TARGET_KINDS)[number];

/** 대상 칸 값 → 대상. 비었거나 모르는 값이면 처음 값 (일반) */
export function summaryTarget(values: CalcValues): SummaryTarget {
  const chosen = values[TARGET_FIELD];
  return TARGET_KINDS.find((kind) => kind === chosen) ?? DEFAULT_TARGET;
}

/** 프로필 창 줄 (화면 순서) */
export const SUMMARY_ROW_IDS = [
  'finalAtk',
  'finalHp',
  'atk',
  'atkIncrease',
  'hp',
  'hpIncrease',
  'attackSpeed',
  'criticalRate',
  'criticalDamage',
  'normalMonster',
  'bossMonster',
  'heroMonster',
  'doubleAttack',
  'superCritical',
  'spearAttack',
  'switchingBoost',
  'skillCombo',
  'smite',
  'barrier',
] as const;

export type SummaryRowId = (typeof SUMMARY_ROW_IDS)[number];

/**
 * 계산 식을 화면 값으로 맞춰 보지 못한 줄. 지금은 없다: 2026-10-12 01:54 전투 중 최대 상태 프로필 17줄 전부가
 * 저장 JSON 입력으로 화면 반올림 범위 안에서 맞았다 (gameFormula0154.test.ts, 이전에 추정으로 표시하던
 * 최종 공격력·공격력 증가·치명타 확률·치명타 데미지·일반 몬스터 포함). 맞춰 보지 못한 줄이 생기면 여기에 넣는다
 */
const ESTIMATED_ROWS: ReadonlySet<SummaryRowId> = new Set<SummaryRowId>([]);

/** % 로 보이는 줄 (나머지는 그냥 수) */
const PERCENT_ROWS: ReadonlySet<SummaryRowId> = new Set<SummaryRowId>(
  SUMMARY_ROW_IDS.filter((rowId) => !['finalAtk', 'finalHp', 'atk', 'hp'].includes(rowId)),
);

export interface SummaryRow {
  id: SummaryRowId;
  /** 화면에 보이는 수의 log10 (% 줄은 % 값). 0 이면 -Infinity, 계산할 수 없으면 null */
  log: number | null;
  percent: boolean;
  estimated: boolean;
}

/** 묶음 하나의 줄 (하위 탭 소계용) */
export interface GroupLines {
  id: string;
  lines: Line[];
}

/** 공격력 증가·체력 증가 배율 (log10) */
export interface IncreaseLogs {
  attack: number;
  hp: number;
}

/** 합친 스탯을 대소문자 구분 없이 읽는다 */
function statReader(combined: Record<string, CombinedStat>) {
  const byLowerCase = new Map(Object.entries(combined).map(([stat, entry]) => [stat.toLowerCase(), entry]));
  return {
    log: (stat: string) => byLowerCase.get(stat.toLowerCase())?.log ?? 0,
    sum: (stat: string) => byLowerCase.get(stat.toLowerCase())?.sum ?? 0,
  };
}

/** 1슬롯 히어로의 직업·속성 변형 이름 (prefix + 직업 + _ + 꼬리, prefix + 속성Hero + _ + 꼬리). 히어로가 없으면 없음 */
function variantStats(hero: TableRow | undefined, suffix: string, prefix: string): string[] {
  if (!hero) return [];
  return [`${prefix}${hero.job}_${suffix}`, `${prefix}${hero.attribute}${ATTRIBUTE_HERO_SUFFIX}_${suffix}`];
}

/**
 * 프로필 "공격력 증가" 에 곱해지는 스탯: 공격력 % · 대상 몬스터 대미지 % 와 각각의 직업·속성 변형
 * (대상 몬스터 공격시 공격력 % 는 게임이 전투 버프로만 넣어서 여기 없다. 버프 탭 줄이 일반 공격력 % 로 바꿔 넣는다).
 * 대상을 안 넘기면 처음 값 (일반)
 */
export function attackIncreaseStats(hero: TableRow | undefined, target: SummaryTarget = DEFAULT_TARGET): string[] {
  const targetStats = TARGET_STATS[target];
  const genderStat = hero ? GENDER_ATTACK_STATS[hero.gender] : undefined;
  return [
    STATS.ATTACK_PERCENT,
    ...variantStats(hero, VARIANT_SUFFIXES.ATTACK, PER_PREFIX),
    ...(genderStat ? [genderStat] : []),
    targetStats.MONSTER_DAMAGE,
    ...variantStats(hero, targetStats.MONSTER_DAMAGE_VARIANT_SUFFIX, PER_PREFIX),
  ];
}

/** 줄 → 공격력 증가·체력 증가 배율 (log10). 대상을 안 넘기면 처음 값 (일반) */
export function increaseLogs(lines: Line[], hero: TableRow | undefined, target: SummaryTarget = DEFAULT_TARGET): IncreaseLogs {
  const read = statReader(combineLines(lines));
  return {
    attack: attackIncreaseStats(hero, target).reduce((sum, stat) => sum + read.log(stat), 0),
    hp: read.log(STATS.HP_PERCENT),
  };
}

/** 묶음마다 공격력 증가·체력 증가에 보태는 배율 (log10). 줄이 없는 묶음은 뺀다 */
export function groupSubtotals(
  groups: GroupLines[],
  hero: TableRow | undefined,
  target: SummaryTarget = DEFAULT_TARGET,
): (IncreaseLogs & { id: string })[] {
  return groups.filter((group) => group.lines.length > 0).map((group) => ({ id: group.id, ...increaseLogs(group.lines, hero, target) }));
}

/** 묶음별 탭 → 묶음별 줄 (합산 직전 모양) */
export function linesByGroup(
  groups: readonly { id: string; tabs: readonly CalcTab[] }[],
  values: CalcValues,
  tables: StatTables,
): GroupLines[] {
  return groups.map((group) => ({ id: group.id, lines: expandedTabLines(group.tabs, values, tables) }));
}

function sumLog(value: number): number {
  return value === 0 ? -Infinity : Math.log10(value);
}

/**
 * 모든 탭 줄 → 프로필 창 줄마다 계산 값. 대상 칸 (summaryTarget) 이 공격력 증가·최종 공격력을 가른다.
 * 최종 공격력은 공격력 증가와 따로 곱하는 _multiply_AttackDamage 줄 (버프 탭 ×5, 게임 코드 m13385 @327afdc) 도 곱한다
 */
export function summaryRows(lines: Line[], values: CalcValues, tables: StatTables): SummaryRow[] {
  const combined = combineLines(lines);
  const read = statReader(combined);
  const hero = heroFirstRow(tables, slotHeroName(values, tables));
  const target = summaryTarget(values);
  const increase = increaseLogs(lines, hero, target);
  const base = heroBase(values, tables);
  const awaken = selectedAwakenStage(values, tables);
  const classHp = hero ? classHpStats(hero).reduce((sum, stat) => sum + read.log(stat), 0) : null;

  // 대상 몬스터 공격시 줄 (공격속도·치명타 확률·치명타 데미지) 은 전투 밖 프로필에 안 들어간다 (버프 탭 줄이 일반 스탯으로 넣음)
  const attackSpeed = attackSpeedPercent(combined, hero, !hasEquippedActiveSkill(values, tables));
  const criticalRate = [STATS.CRITICAL_RATE, ...variantStats(hero, VARIANT_SUFFIXES.CRITICAL_RATE, '')].reduce(
    (sum, stat) => sum + read.sum(stat),
    0,
  );
  // 치명타 데미지 (앱 프로필 표시 식, gap-critdmg-normal.md 1-1): 합 계열 criticalDmg 합 × 곱 계열 배율 ÷ 100.
  // 곱 계열 = _per_criticalDmg · 직업·속성 치명타 데미지 % · 체력 70% 이상 카드
  const criticalDamageMultiplierLog = [
    STATS.CRITICAL_DAMAGE,
    STATS.CRITICAL_DAMAGE_MY_HP_70,
    ...variantStats(hero, VARIANT_SUFFIXES.CRITICAL_DAMAGE, PER_PREFIX),
  ].reduce((sum, stat) => sum + read.log(stat), 0);
  const criticalDamageLog =
    sumLog(read.sum(STATS.CRITICAL_DAMAGE_SUM)) + criticalDamageMultiplierLog - CRITICAL_DAMAGE_DIVISOR_LOG;
  const superCriticalSteps = Math.max(
    Math.floor((criticalRate - SUPER_CRITICAL_RATE_THRESHOLD) / SUPER_CRITICAL_RATE_STEP),
    0,
  );
  const pairSum = (stat: string, addStat: string) => read.sum(stat) + read.sum(addStat);
  // 줄 값은 배수 그대로 (5 = ×5). 줄이 없으면 곱하지 않음 (log 0)
  const finalAttackMultiply = read.sum(STATS.FINAL_ATTACK_MULTIPLY);
  const finalAttackMultiplyLog = finalAttackMultiply > 0 ? Math.log10(finalAttackMultiply) : 0;

  const logs: Record<SummaryRowId, number | null> = {
    finalAtk:
      base && awaken
        ? base.atk + increase.attack - ATTACK_INCREASE_FINAL_OFFSET_LOG + awaken.finalAtk + finalAttackMultiplyLog
        : null,
    finalHp: base && awaken && classHp !== null ? base.hp + increase.hp + classHp + awaken.finalHp : null,
    atk: base ? base.atk : null,
    // 공격력 증가 화면 값은 곱 누적값 그대로 (x100 을 더 붙이지 않음, gap-atk-increase-provider.md 4-1). 체력 증가는 아래 그대로
    atkIncrease: increase.attack,
    hp: base ? base.hp : null,
    hpIncrease: multiplierPercentLog(increase.hp),
    attackSpeed: sumLog(attackSpeed),
    criticalRate: sumLog(criticalRate),
    criticalDamage: criticalDamageLog,
    normalMonster: multiplierPercentLog(read.log(TARGET_STATS.normal.MONSTER_DAMAGE)),
    bossMonster: multiplierPercentLog(read.log(TARGET_STATS.boss.MONSTER_DAMAGE)),
    heroMonster: multiplierPercentLog(read.log(TARGET_STATS.hero.MONSTER_DAMAGE)),
    doubleAttack: sumLog(doubleAttackPercent(combined, attackSpeed)),
    superCritical: sumLog(
      pairSum(STATS.SUPER_CRITICAL, STATS.SUPER_CRITICAL_ADD) + superCriticalSteps * read.sum(STATS.SUPER_CRITICAL_OVER),
    ),
    spearAttack: sumLog(pairSum(STATS.SPEAR_ATTACK, STATS.SPEAR_ATTACK_ADD)),
    switchingBoost: sumLog(pairSum(STATS.SWITCHING_BOOST, STATS.SWITCHING_BOOST_ADD)),
    skillCombo: sumLog(pairSum(STATS.SKILL_COMBO, STATS.SKILL_COMBO_ADD)),
    smite: sumLog(pairSum(STATS.SMITE, STATS.SMITE_ADD)),
    barrier: sumLog(pairSum(STATS.BARRIER, STATS.BARRIER_ADD)),
  };
  return SUMMARY_ROW_IDS.map((rowId) => ({
    id: rowId,
    log: logs[rowId],
    percent: PERCENT_ROWS.has(rowId),
    estimated: ESTIMATED_ROWS.has(rowId),
  }));
}

/** 줄의 화면 값 칸 이름 */
export function screenFieldId(rowId: SummaryRowId): string {
  return SCREEN_FIELD_PREFIX + rowId;
}

export interface ScreenComparison {
  screenLog: number;
  /** 계산 값 ÷ 화면 값 (log10) */
  differenceLog: number;
  /** 계산 값이 화면 값의 반올림 범위 안 */
  same: boolean;
}

const NUMBER_PART_PATTERN = /[\d.,]+/;

/** 화면 표기의 반올림 범위 (log10): "1.6CK%" → 1.6 ± 0.05 */
export function screenRoundingLog(text: string): number {
  const numberText = (NUMBER_PART_PATTERN.exec(text)?.[0] ?? '').replace(/,/g, '');
  const mantissa = parseFloat(numberText);
  if (!(mantissa > 0)) return 0;
  const decimals = numberText.includes('.') ? numberText.length - numberText.indexOf('.') - 1 : 0;
  const half = ROUNDING_HALF * Math.pow(10, -decimals);
  return Math.log10((mantissa + half) / mantissa);
}

/** 계산 값 대 화면 값. 화면 값이 비었거나 읽을 수 없으면 null */
export function compareWithScreen(calculatedLog: number | null, screenText: string | undefined): ScreenComparison | null {
  const parsed = parseGameNumber(screenText);
  if (!parsed || calculatedLog === null || !isFinite(calculatedLog)) return null;
  const differenceLog = calculatedLog - parsed.log;
  return {
    screenLog: parsed.log,
    differenceLog,
    same: Math.abs(differenceLog) <= screenRoundingLog(String(screenText)),
  };
}
