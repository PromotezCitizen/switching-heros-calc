/**
 * 일기장: 현재 책 번호와 슬롯 12개의 레벨을 받아 서버 표 DiaryStat 으로 누적 효과를 계산한다.
 * 식: 슬롯 하나의 책 t 효과 = × (1 + value_t × 레벨 / 100) (value = 레벨 1당 %), 누적 = 모든 책의 곱 − 1.
 * 앞 책은 전부 최대 레벨, 현재 책은 입력한 슬롯 레벨 (화면 누적 12개와 소수 넷째 자리까지 일치 확인,
 * claude-docs/diary_formula_check.py).
 */
import { CONSTS } from '../../../CONSTS';
import { tableRows, type RawTable, type StatTables, type TableRow } from '../../../data/statTables';
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import type { SourceLabel } from './screenFields';

const { SLOT_COUNT, MIN_BOOK } = CONSTS.textLines;
const PERCENT_DIVISOR = CONSTS.common.PERCENT_DIVISOR;

/** 입력 칸 이름 */
export const DIARY_BOOK_FIELD = 'diaryBook';
export const diarySlotField = (slot: number) => `diarySlotLevel${slot}`;

/** 슬롯 번호(1~12) → 아이콘 이름 (public/icons/Atlas_diary_icon/<이름>.png), 화면 순서는 게임 일기장 효과 목록과 같음 */
export const DIARY_SLOT_ICONS = [
  'Per_FireHero',
  'Per_WaterHero',
  'Per_EarthHero',
  'Per_HeroMST',
  'Per_Boss',
  'Per_NomalMST',
  'Per_NomalSkillAtk',
  'Per_OnlySkillAtk',
  'Per_ChangeSkill',
  'Per_ATK',
  'Per_SkillAtk',
  'Per_CRThit',
];

interface DiaryCell {
  stat: string;
  value: number;
  maxLevel: number;
}

interface DiaryCells {
  cells: Map<string, DiaryCell>;
  lastBook: number;
}

/** 표마다 한 번만 만든 맵 (일기장 패널을 그릴 때마다 표 전체로 다시 만들지 않게) */
const diaryCellsCache = new WeakMap<RawTable, DiaryCells>();

/** 표 → 책 번호·슬롯 번호로 찾는 맵 */
function diaryCells(tables: StatTables): DiaryCells {
  const table = tables.DiaryStat;
  let cells = diaryCellsCache.get(table);
  if (!cells) {
    cells = buildDiaryCells(table);
    diaryCellsCache.set(table, cells);
  }
  return cells;
}

function buildDiaryCells(table: RawTable): DiaryCells {
  const cells = new Map<string, DiaryCell>();
  let lastBook = 0;
  for (const row of tableRows(table) as TableRow[]) {
    const book = Number(row.tabIdx);
    cells.set(`${book}:${Number(row.slotOrder)}`, {
      stat: row.stat,
      value: Number(row.value),
      maxLevel: Number(row.maxLv),
    });
    lastBook = Math.max(lastBook, book);
  }
  return { cells, lastBook };
}

function wholeNumber(text: string | undefined): number {
  const parsed = Math.floor(Number(text));
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

export interface DiarySlotResult {
  slot: number;
  stat: string;
  /** 누적 % (화면 "일기장 효과" 목록의 값) */
  cumulativePercent: number;
}

/** 슬롯 12개의 누적 효과. 책 번호가 비어 있거나 0 이면 빈 목록 */
export function diarySlotResults(values: CalcValues, tables: StatTables): DiarySlotResult[] {
  const { cells, lastBook } = diaryCells(tables);
  const currentBook = Math.min(wholeNumber(values[DIARY_BOOK_FIELD]), lastBook);
  if (currentBook < MIN_BOOK) return [];
  const results: DiarySlotResult[] = [];
  for (let slot = 1; slot <= SLOT_COUNT; slot += 1) {
    let multiplier = 1;
    for (let book = 1; book <= currentBook; book += 1) {
      const cell = cells.get(`${book}:${slot}`);
      if (!cell) continue;
      const level =
        book < currentBook ? cell.maxLevel : Math.min(wholeNumber(values[diarySlotField(slot)]), cell.maxLevel);
      multiplier *= 1 + (cell.value * level) / PERCENT_DIVISOR;
    }
    const firstCell = cells.get(`${MIN_BOOK}:${slot}`);
    results.push({
      slot,
      stat: firstCell?.stat ?? '',
      cumulativePercent: (multiplier - 1) * PERCENT_DIVISOR,
    });
  }
  return results;
}

/** 슬롯별 누적 효과 → 효과 줄. 출처 글 = "일기장: <효과 이름>" (번역 calc.diary.slots.<번호>) */
export function diaryLines(values: CalcValues, tables: StatTables, sourceLabel: SourceLabel): Line[] {
  return diarySlotResults(values, tables)
    .filter((result) => result.cumulativePercent > 0)
    .map((result) => ({
      source: sourceLabel('calc.diary.source', { name: sourceLabel(`calc.diary.slots.${result.slot}`) }),
      stat: result.stat,
      value: result.cumulativePercent,
    }));
}
