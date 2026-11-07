/** 히어로의 기록 (기존 stat-calc-sources.js buildLibrary / libraryMainLevel / renderLibrary) → 효과 줄 */
import { CONSTS } from '@/CONSTS';
import type { StatTables } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import { numberValue, rowsOf, screenLog, type SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';

const { JOBS, EMPTY_STAT } = CONSTS.heroWeaponCardPet;
const { ARCHIVE_JOB, ARCHIVE_LEVEL_DIVISOR, INHERIT_ROWS, ARCHIVE_LEVELS_PER_INHERIT_SLOT, FIRST_LEVEL } =
  CONSTS.heroWeaponCardPet.library;

export type Job = (typeof JOBS)[number];

/** 책 레벨 칸 이름 (library_<직업>) */
export function bookLevelField(job: Job): string {
  return `library_${job}`;
}
export function inheritStatField(index: number): string {
  return `inheritStat${index}`;
}
export function inheritValueField(index: number): string {
  return `inheritValue${index}`;
}

/**
 * 폰 불러오기가 채우는 기록 보관소 레벨 칸 (저장 _libraryData.mainLv). 게임은 보관소 레벨을 계산하지 않고 이 저장값을 쓴다
 * (조건을 채운 뒤 버튼으로 올림, html-verify-E-2026-11-07.md E20). 책 레벨을 손으로 고치면 비운다 (LibraryPanel)
 */
export const ARCHIVE_LEVEL_FIELD = 'libraryArchiveLevel';

/**
 * 기록 보관소 레벨: 불러온 값이 있으면 그 값 (사용자 결정 2026-11-07 "불러올땐 불러온 값으로"),
 * 없으면 floor(min(책 4권 레벨) / 10) (사용자 식, 끝까지 올렸을 때 게임과 같음)
 */
export function libraryArchiveLevel(values: CalcValues): number {
  const imported = values[ARCHIVE_LEVEL_FIELD];
  if (imported !== undefined && imported !== '') return numberValue(values, ARCHIVE_LEVEL_FIELD);
  return Math.floor(Math.min(...JOBS.map((job) => numberValue(values, bookLevelField(job)))) / ARCHIVE_LEVEL_DIVISOR);
}

/** 열린 전승된 능력 칸 수 = min(floor(보관소 레벨 / 2), 8) */
export function openInheritSlots(archiveLevel: number): number {
  return Math.min(Math.floor(archiveLevel / ARCHIVE_LEVELS_PER_INHERIT_SLOT), INHERIT_ROWS);
}

/** 책 효과 = 표 Library 의 그 직업 Lv1~레벨 값의 합 (직업 공격력 %) */
export function bookEffectSum(tables: StatTables, job: Job, level: number): number {
  return rowsOf(tables, 'Library').reduce((sum, row) => {
    const rowLevel = Number(row.lv);
    return row.job === job && rowLevel >= FIRST_LEVEL && rowLevel <= level ? sum + Number(row.statValue) : sum;
  }, 0);
}

export function bookStat(job: Job): string {
  return `_per_${job}_AttackDamage`;
}

export function libraryLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  const lines: Line[] = [];
  const archiveLevel = libraryArchiveLevel(values);
  // 기록 보관소: 레벨 행마다 한 줄 (공격력·체력 효과가 번갈아 누적)
  for (const row of rowsOf(tables, 'Library')) {
    const rowLevel = Number(row.lv);
    if (row.job !== ARCHIVE_JOB || rowLevel < FIRST_LEVEL || rowLevel > archiveLevel) continue;
    if (!row.statType || row.statType === EMPTY_STAT) continue;
    lines.push({
      source: label('calc.library.sources.archive', { level: row.lv }),
      stat: row.statType,
      value: Number(row.statValue),
    });
  }
  // 책: Lv1~레벨 값의 합을 한 줄로
  for (const job of JOBS) {
    const level = numberValue(values, bookLevelField(job));
    const sum = bookEffectSum(tables, job, level);
    if (sum) {
      lines.push({
        source: label('calc.library.sources.book', { book: label(`calc.library.books.${job}`), level }),
        stat: bookStat(job),
        value: sum,
      });
    }
  }
  // 전승된 능력: 열린 칸만. 같은 스탯 칸은 값을 먼저 더해 스탯마다 한 줄 (게임 T1283 m6880 부분 C 가 보조 사전에 누적한 뒤 스탯마다 AddPct 한 번,
  // stat-provider-formulas.md 291줄 · html-verify-A-2026-11-07.md, 사용자 지시 2026-11-07 "틀린부분 진행". 예전 HTML 은 칸마다 곱함)
  const openSlots = openInheritSlots(archiveLevel);
  const inheritSums = new Map<string, { log: number; slots: number[] }>();
  for (let index = 1; index <= Math.min(openSlots, INHERIT_ROWS); index++) {
    const stat = values[inheritStatField(index)];
    const log = screenLog(values, inheritValueField(index));
    if (!stat || log === null) continue;
    const sum = inheritSums.get(stat);
    if (sum) {
      // log 끼리 더하기 (큰 값에서도 넘치지 않게: 큰 쪽 + log10(1 + 10^(작은 쪽 − 큰 쪽)))
      const high = Math.max(sum.log, log);
      sum.log = high + Math.log10(1 + Math.pow(10, Math.min(sum.log, log) - high));
      sum.slots.push(index);
    } else inheritSums.set(stat, { log, slots: [index] });
  }
  for (const [stat, { log, slots }] of inheritSums) {
    lines.push({ source: label('calc.library.sources.inherit', { index: slots.join(' · ') }), stat, log });
  }
  return lines;
}
