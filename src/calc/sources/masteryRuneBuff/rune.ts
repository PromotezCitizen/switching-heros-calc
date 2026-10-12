/**
 * 룬 (서버 표 AttributeRune, 24,399행) → 룬 7개 (속성 룬 슬롯 0~5 + 코어) 와 레벨별 누적 값, 룬 줄.
 * 기존 stat-calc-core.js attributeRunes·runeValue, stat-calc.html renderRunes·calcTabGroups 룬 부분.
 * 표가 커서 행 객체를 만들지 않고 열 번호로 한 번만 훑어 표마다 결과를 보관한다.
 */
import { CONSTS } from '../../../CONSTS';
import type { RawTable } from '../../../data/statTables';
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import type { SourceLabel } from './sourceLabel';

const { RUNE_KEY_PREFIX, CORE_RUNE_KEY, ATTRIBUTE_RUNE_LEVELS_PER_CORE, MIN_LEVEL } = CONSTS.masteryRuneBuff;
/** 표에서 코어 룬의 slot 값 (빈칸) */
const CORE_SLOT = '';

export interface AttributeRune {
  /** 칸 이름 꼬리 (슬롯 번호 '0'~'5' 또는 'core') */
  key: string;
  stat: string;
  maxLevel: number;
  /** 레벨 → 그 레벨의 누적 값 (표 statValue) */
  valueByLevel: Map<number, number>;
}

const runeCache = new WeakMap<RawTable, AttributeRune[]>();

/** 룬 목록 (속성 룬 슬롯 순서, 코어는 마지막). 같은 슬롯·레벨이 여러 행이면 나중 행 값 (기존과 같음) */
export function attributeRunes(table: RawTable): AttributeRune[] {
  const cached = runeCache.get(table);
  if (cached) return cached;
  const slotColumn = table.columns.indexOf('slot');
  const statColumn = table.columns.indexOf('stat');
  const levelColumn = table.columns.indexOf('level');
  const valueColumn = table.columns.indexOf('statValue');
  const runeBySlot = new Map<string, AttributeRune>();
  for (const row of table.rows) {
    const slot = row[slotColumn];
    let rune = runeBySlot.get(slot);
    if (!rune) {
      rune = { key: slot === CORE_SLOT ? CORE_RUNE_KEY : slot, stat: row[statColumn], maxLevel: 0, valueByLevel: new Map() };
      runeBySlot.set(slot, rune);
    }
    const level = Number(row[levelColumn]);
    rune.valueByLevel.set(level, Number(row[valueColumn]));
    rune.maxLevel = Math.max(rune.maxLevel, level);
  }
  const runes = [...runeBySlot.keys()]
    .sort((left, right) => Number(left === CORE_SLOT) - Number(right === CORE_SLOT) || Number(left) - Number(right))
    .map((slot) => runeBySlot.get(slot) as AttributeRune);
  runeCache.set(table, runes);
  return runes;
}

export function runeFieldKey(rune: AttributeRune): string {
  return RUNE_KEY_PREFIX + rune.key;
}

/** 입력한 레벨 (소수 버림, 숫자 아님은 0) */
export function runeLevel(values: CalcValues, rune: AttributeRune): number {
  return Math.floor(Number(values[runeFieldKey(rune)]) || MIN_LEVEL);
}

/** 룬 레벨의 효과 값 (표의 값 그대로). 0레벨이면 0, 최대 레벨을 넘으면 최대 레벨 값 */
export function runeValue(rune: AttributeRune, level: number): number {
  const clamped = Math.min(Math.max(Math.floor(Number(level) || MIN_LEVEL), MIN_LEVEL), rune.maxLevel);
  return clamped ? (rune.valueByLevel.get(clamped) ?? 0) : 0;
}

/** 지금 올릴 수 있는 레벨 상한: 속성 룬 = min((코어 + 1) × 10, 표 최대), 코어 = 표 최대 (화면 표시용, 계산은 표 최대로만 자름) */
export function runeLevelLimit(rune: AttributeRune, values: CalcValues): number {
  if (rune.key === CORE_RUNE_KEY) return rune.maxLevel;
  const coreLevel = Number(values[RUNE_KEY_PREFIX + CORE_RUNE_KEY]) || MIN_LEVEL;
  return Math.min((coreLevel + 1) * ATTRIBUTE_RUNE_LEVELS_PER_CORE, rune.maxLevel);
}

export function runeName(rune: AttributeRune, sourceLabel: SourceLabel): string {
  return sourceLabel(`calc.rune.names.${rune.key}`, { defaultValue: rune.key });
}

/** 레벨이 있는 룬마다 한 줄 (값은 log) */
export function runeLines(values: CalcValues, table: RawTable, sourceLabel: SourceLabel): Line[] {
  const lines: Line[] = [];
  for (const rune of attributeRunes(table)) {
    const level = runeLevel(values, rune);
    const value = runeValue(rune, level);
    if (value) {
      lines.push({
        source: sourceLabel('calc.rune.lineSource', { name: runeName(rune, sourceLabel), level }),
        stat: rune.stat,
        log: Math.log10(value),
      });
    }
  }
  return lines;
}
