/**
 * 차원의 돌로 아티팩트 슬롯이 어디까지 오르는지 계산한다. 수가 매우 커서 (슬롯 비용 최대 10^1083) 모두 log10 으로 다룬다.
 * 근거: claude-docs/react-port/dimension-stone-2026-11-22.md
 * - 슬롯 lv 로 올리는 비용 = AlchemySlot 부위 행 enhCostVal (10부위 같음, 한 번에 1레벨)
 * - 돌 N 등급 = 파편 8^(N − 1) 개를 1개씩 10부위 중 무작위로 → 한 부위 평균 = 8^(N − 1) / 10
 * - 세트 k 단계 = 10칸의 가장 낮은 레벨이 All 행 enhCostVal 이상
 * - 연성 1번마다 0~100 난수 <= 확률 x 버프 배수 이면 그 연성 레벨의 돌 1개
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables } from '@/data/statTables';
import { logSum } from '@/dpm/targetDamage';

const DS = CONSTS.dimensionStone;
const STONE_LOG = Math.log10(DS.STONE_BASE);
const PART_SHARE_LOG = Math.log10(DS.PART_SHARE);

/** 표 숫자 칸 ("5", "1569280000000…", "1.276E+1083") → log10. 0 이하나 해석 못 하면 -Infinity */
export function tableNumberLog(text: string): number {
  const match = /^\s*(\d+)(?:\.(\d+))?(?:[eE]\+?(-?\d+))?\s*$/.exec(String(text ?? ''));
  if (!match) return -Infinity;
  const [, integer, fraction = '', exponent = '0'] = match;
  const digits = integer.replace(/^0+/, '');
  if (digits.length === 0) {
    const value = parseFloat(`0.${fraction}`);
    return value > 0 ? Math.log10(value) + Number(exponent) : -Infinity;
  }
  const head = digits.slice(0, DS.TABLE_MANTISSA_DIGITS);
  const mantissa = parseFloat(
    `${head[0]}.${head.slice(1)}${digits.length <= DS.TABLE_MANTISSA_DIGITS ? fraction : ''}`,
  );
  return Math.log10(mantissa) + (digits.length - 1) + Number(exponent);
}

/** log10(10^a − 10^b). b >= a 이면 -Infinity (남는 것 없음) */
export function logDiff(a: number, b: number): number {
  if (b === -Infinity) return a;
  if (b >= a) return -Infinity;
  return a + Math.log10(1 - Math.pow(10, b - a));
}

export interface SlotCosts {
  /** prefix[lv] = log10(레벨 0 에서 lv 까지 비용 합). prefix[0] = -Infinity */
  prefix: number[];
  maxLevel: number;
  /** 세트 단계마다 필요한 가장 낮은 슬롯 레벨 (setLevels[k − 1] = k 단계 조건) */
  setLevels: number[];
  /** 세트 단계마다 붙는 값 (setStats[k − 1] = k 단계, 스탯 이름과 %) */
  setStats: { stat: string; percent: number }[];
}

/** AlchemySlot 표 → 레벨별 누적 비용 (log) 과 세트 조건 */
export function slotCosts(tables: StatTables): SlotCosts {
  const rows = tableRows(tables.AlchemySlot);
  const costRows = rows.filter((row) => row.parts === DS.COST_PART).sort((a, b) => Number(a.lv) - Number(b.lv));
  const prefix = [-Infinity];
  for (const row of costRows) prefix.push(logSum([prefix[prefix.length - 1], tableNumberLog(row.enhCostVal)]));
  const setRows = rows.filter((row) => row.parts === DS.SET_PART).sort((a, b) => Number(a.lv) - Number(b.lv));
  return {
    prefix,
    maxLevel: costRows.length,
    setLevels: setRows.map((row) => Number(row.enhCostVal)),
    setStats: setRows.map((row) => ({ stat: row.statType, percent: Number(row.statValue) })),
  };
}

/** 레벨 from 에서 to 로 가는 데 더 필요한 파편 (보유 heldLog 를 뺀 값, log). 이미 되면 -Infinity, 갈 수 없는 레벨이면 null */
export function fragmentsNeededLog(costs: SlotCosts, from: number, to: number, heldLog: number): number | null {
  if (to > costs.maxLevel || from < 0) return null;
  if (to <= from) return -Infinity;
  return logDiff(logDiff(costs.prefix[to], costs.prefix[from]), heldLog);
}

/** 돌 N 등급 1개가 한 부위에 주는 평균 파편 (log) */
export function stonePartLog(grade: number): number {
  return (grade - 1) * STONE_LOG - PART_SHARE_LOG;
}

/** 돌 N 등급 1개의 파편 합계 (log) */
export function stoneTotalLog(grade: number): number {
  return (grade - 1) * STONE_LOG;
}

/**
 * 한 부위에 neededLog 만큼 넣으려면 몇 등급 돌 1개가 필요한지 (평균 기준).
 * 0 = 돌 없이 이미 됨, null = 가장 높은 돌로도 안 됨
 */
export function stoneGradeFor(neededLog: number | null): number | null {
  if (neededLog === null) return null;
  if (neededLog === -Infinity) return 0;
  const grade = Math.max(DS.MIN_STONE_GRADE, Math.ceil((neededLog + PART_SHARE_LOG) / STONE_LOG - 1e-9) + 1);
  return grade > DS.MAX_STONE_GRADE ? null : grade;
}

export interface StepResult {
  /** 목표 레벨 (슬롯) 또는 목표 세트 단계 */
  target: number;
  /** 세트일 때 목표 세트가 요구하는 슬롯 레벨 */
  slotLevel: number;
  /** 한 부위에 더 필요한 파편 (log, 세트면 가장 많이 필요한 부위). -Infinity = 이미 됨, null = 갈 수 없음 */
  neededLog: number | null;
  /** 세트일 때 10부위 합계로 더 필요한 파편 (log) */
  totalNeededLog?: number | null;
  /** 세트일 때 그 단계에서 붙는 값 */
  stat?: string;
  percent?: number;
  /** 필요한 돌 등급 (0 = 이미 됨, null = 안 됨) */
  grade: number | null;
}

export interface PartInput {
  level: number;
  heldLog: number;
}

/** 지금 세트 단계 = 조건 (가장 낮은 슬롯 레벨 >= 행 값) 을 만족하는 행 수 */
export function currentSetLevel(costs: SlotCosts, minLevel: number): number {
  return costs.setLevels.filter((required) => required <= minLevel).length;
}

/**
 * 10부위 모두: 다음 공격력 세트 (SHOWN_SET_STAT) STEPS_AHEAD 개. 돌 1개는 10부위에 평균 1/10 씩 들어가므로
 * 가장 많이 필요한 부위가 돌 등급을 정한다
 */
export function setSteps(
  costs: SlotCosts,
  parts: readonly PartInput[],
): { setLevel: number; minLevel: number; steps: StepResult[] } {
  const minLevel = Math.min(...parts.map((part) => part.level));
  const setLevel = currentSetLevel(costs, minLevel);
  // 지금 세트 다음부터 공격력 세트만 골라 STEPS_AHEAD 개 (표 끝이면 끝 다음 단계 하나로 끝냄)
  const targets: number[] = [];
  for (let target = setLevel + 1; targets.length < DS.STEPS_AHEAD; target += 1) {
    const entry = costs.setStats[target - 1];
    if (!entry) {
      targets.push(target);
      break;
    }
    if (entry.stat === DS.SHOWN_SET_STAT) targets.push(target);
  }
  const steps = targets.map((target) => {
    const slotLevel = costs.setLevels[target - 1];
    const { stat, percent } = costs.setStats[target - 1] ?? {};
    if (slotLevel === undefined) return { target, slotLevel: NaN, neededLog: null, totalNeededLog: null, grade: null };
    const needs = parts.map((part) =>
      fragmentsNeededLog(costs, part.level, Math.max(part.level, slotLevel), part.heldLog),
    );
    if (needs.some((need) => need === null))
      return { target, slotLevel, neededLog: null, totalNeededLog: null, grade: null, stat, percent };
    const logs = needs as number[];
    const neededLog = Math.max(...logs);
    return {
      target,
      slotLevel,
      neededLog,
      totalNeededLog: logSum(logs),
      grade: stoneGradeFor(neededLog),
      stat,
      percent,
    };
  });
  return { setLevel, minLevel, steps };
}

export interface AlchemyStone {
  grade: number;
  /** 연성 1번에 돌이 나올 확률 (%) */
  chancePercent: number;
  /** 돌 1개를 얻는 데 드는 평균 연성 횟수 */
  alchemiesPerStone: number;
}

/** 연성 레벨에서 나오는 돌과 확률. 200 미만이면 null */
export function alchemyStone(level: number, buffed: boolean): AlchemyStone | null {
  if (!(level >= DS.ALCHEMY_STONE_START_LEVEL)) return null;
  const clamped = Math.min(Math.floor(level), DS.ALCHEMY_MAX_LEVEL);
  const offset = clamped - DS.ALCHEMY_STONE_START_LEVEL;
  const grade = Math.floor(offset / DS.ALCHEMY_LEVELS_PER_GRADE) + 1;
  const base =
    clamped === DS.ALCHEMY_MAX_LEVEL
      ? DS.ALCHEMY_LAST_LEVEL_PROB
      : DS.ALCHEMY_STONE_PROBS[offset % DS.ALCHEMY_LEVELS_PER_GRADE];
  const chancePercent = base * (buffed ? DS.BUFF_MULTIPLIER : 1);
  return { grade, chancePercent, alchemiesPerStone: DS.PERCENT_RANGE / chancePercent };
}

/**
 * 10칸 입력 중 비운 칸은 넣은 칸 중 가장 낮은 레벨, 보유 파편 0 으로 본다 (칸 하나만 넣어도 세트를 계산).
 * 하나도 안 넣었으면 null
 */
export function fillParts(parts: readonly (PartInput | null)[]): PartInput[] | null {
  const filled = parts.filter((part): part is PartInput => part !== null);
  if (filled.length === 0) return null;
  const lowest = Math.min(...filled.map((part) => part.level));
  return parts.map((part) => part ?? { level: lowest, heldLog: -Infinity });
}

/** 돌 N 등급이 처음 나오는 연성 레벨 (그 레벨부터 3레벨 동안 N 등급, 표 AlchemyLevel) */
export function minAlchemyLevelFor(grade: number): number {
  return DS.ALCHEMY_STONE_START_LEVEL + (grade - 1) * DS.ALCHEMY_LEVELS_PER_GRADE;
}
