/**
 * 특성 (서버 표 Mastery) → 레벨별 효과 값과 일반 특성 줄.
 * 기존 stat-calc-core.js masteryTraits·traitValue, stat-calc.html masteryLevel·learnedTraitValue·calcTabGroups 특성 부분.
 * 특성 레벨은 values 의 칸 `mastery_<rNo>` 에 둔다 (기존 HTML 은 별도 저장 키 stat-calc-mastery-v2).
 */
import { CONSTS } from '../../../CONSTS';
import { tableRows, type RawTable } from '../../../data/statTables';
import { readNumber } from '../../../store/storedValues';
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import type { SourceLabel } from './sourceLabel';

const { MASTERY_KEY_PREFIX, ULTIMATE_TYPE_SUFFIX, PLAIN_NUMBER_DECIMALS, MIN_LEVEL } = CONSTS.masteryRuneBuff;

export interface MasteryTrait {
  rNo: string;
  /** Stat / Skill / Battle */
  group: string;
  ultimate: boolean;
  step: number;
  maxLevel: number;
  needPoint: number;
  statName: string;
  statValue: number;
  statUpValue: number;
  /** 설명문 (태그·줄바꿈 제거) */
  desc: string;
}

const HTML_TAG_PATTERN = /<[^>]+>/g;
const NEW_LINE_PATTERN = /\n/g;
const VALUE_PLACEHOLDER = '{0}';
/** 설명문에서 단독 n 자리 (예: "체력이 n배씩") */
const LONE_N_PATTERN = /(^|[^a-zA-Z])n(?=[^a-zA-Z]|$)/;

const traitCache = new WeakMap<RawTable, MasteryTrait[]>();

/** 특성 표 전체. 일반 → 얼티밋, 단계, 번호 순. 표마다 한 번만 만든다 */
export function masteryTraits(table: RawTable): MasteryTrait[] {
  let traits = traitCache.get(table);
  if (!traits) {
    traits = tableRows(table)
      .map((row) => ({
        rNo: row.rNo,
        group: row.masteryType.replace(ULTIMATE_TYPE_SUFFIX, ''),
        ultimate: row.masteryType.endsWith(ULTIMATE_TYPE_SUFFIX),
        step: Number(row.step),
        maxLevel: Number(row.maxLevel),
        needPoint: Number(row.needPoint),
        statName: row.statName,
        statValue: Number(row.statValue),
        statUpValue: Number(row.statUpValue),
        desc: String(row.desc || '').replace(HTML_TAG_PATTERN, '').replace(NEW_LINE_PATTERN, ' '),
      }))
      .sort(
        (left, right) =>
          Number(left.ultimate) - Number(right.ultimate) ||
          left.step - right.step ||
          Number(left.rNo) - Number(right.rNo),
      );
    traitCache.set(table, traits);
  }
  return traits;
}

export function masteryLevelKey(rNo: string): string {
  return MASTERY_KEY_PREFIX + rNo;
}

/** 찍은 레벨 (최대 레벨을 넘으면 최대) */
export function masteryLevel(values: CalcValues, trait: MasteryTrait): number {
  return Math.min(readNumber(values, masteryLevelKey(trait.rNo)), trait.maxLevel);
}

/** 레벨 입력 → 저장할 레벨 (0 ~ 최대, 소수 버림) */
export function clampedMasteryLevel(trait: MasteryTrait, level: number): number {
  return Math.min(Math.max(Math.floor(level) || MIN_LEVEL, MIN_LEVEL), trait.maxLevel);
}

/** 특성 레벨의 효과 값 = 기본 + 레벨당 × (레벨 − 1). 0레벨이면 0 */
export function traitValue(trait: MasteryTrait, level: number): number {
  return level > 0 ? trait.statValue + trait.statUpValue * (level - 1) : 0;
}

/** 스탯 이름으로 찾은 첫 특성의 찍은 효과 값 (안 찍었으면 0) */
export function learnedTraitValue(traits: MasteryTrait[], values: CalcValues, statName: string): number {
  const trait = traits.find((item) => item.statName === statName);
  if (!trait) return 0;
  const level = masteryLevel(values, trait);
  return level > 0 ? traitValue(trait, level) : 0;
}

/** 기존 HTML plainNumber: 소수 둘째 자리, 천 단위 쉼표 */
export function plainNumber(value: number): string {
  return Number(value.toFixed(PLAIN_NUMBER_DECIMALS)).toLocaleString('ko-KR');
}

/** 그 레벨의 효과 문구: 설명의 {0} 또는 단독 n 자리에 값 */
export function traitEffectText(trait: MasteryTrait, level: number): string {
  const value = plainNumber(traitValue(trait, level));
  return trait.desc.includes(VALUE_PLACEHOLDER)
    ? trait.desc.replace(VALUE_PLACEHOLDER, value)
    : trait.desc.replace(LONE_N_PATTERN, `$1${value}`);
}

export function traitName(trait: MasteryTrait, sourceLabel: SourceLabel): string {
  return sourceLabel(`calc.mastery.names.${trait.rNo}`, { defaultValue: trait.statName });
}

/** 레벨 > 0 인 일반 특성마다 한 줄 (얼티밋은 ultimate.ts) */
export function masteryLines(values: CalcValues, table: RawTable, sourceLabel: SourceLabel): Line[] {
  return masteryTraits(table)
    .filter((trait) => !trait.ultimate && masteryLevel(values, trait) > 0)
    .map((trait) => {
      const level = masteryLevel(values, trait);
      return {
        source: sourceLabel('calc.mastery.lineSource', { name: traitName(trait, sourceLabel), level }),
        stat: trait.statName,
        value: traitValue(trait, level),
      };
    });
}

export interface MasteryStatTotal {
  statName: string;
  value: number;
  /** 그 스탯이 처음 나온 특성 (설명 문구용) */
  trait: MasteryTrait;
}

export interface MasteryTotals {
  /** 사용 포인트 = 필요 포인트 × 레벨 합 */
  points: number;
  pointsByGroup: Record<string, number>;
  /** 찍은 특성 (얼티밋 포함) 의 스탯별 효과 합 (처음 나온 순서) */
  stats: MasteryStatTotal[];
}

export function masteryTotals(traits: MasteryTrait[], values: CalcValues): MasteryTotals {
  const totals: MasteryTotals = { points: 0, pointsByGroup: {}, stats: [] };
  const statIndex = new Map<string, MasteryStatTotal>();
  for (const trait of traits) {
    const level = masteryLevel(values, trait);
    if (!level) continue;
    totals.points += trait.needPoint * level;
    totals.pointsByGroup[trait.group] = (totals.pointsByGroup[trait.group] ?? 0) + trait.needPoint * level;
    let entry = statIndex.get(trait.statName);
    if (!entry) {
      entry = { statName: trait.statName, value: 0, trait };
      statIndex.set(trait.statName, entry);
      totals.stats.push(entry);
    }
    entry.value += traitValue(trait, level);
  }
  return totals;
}
