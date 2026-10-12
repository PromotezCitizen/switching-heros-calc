/** 글자 칸 (게임 화면 값) → 효과 줄 공통 부분. 화면·React 와 무관한 순수 함수 */
import { CONSTS } from '../../../CONSTS';
import type { Line } from '../../combine';
import { parseGameNumber } from '../../gameNumber';
import type { CalcValues } from '../../types';

/** 출처 글을 만드는 함수 (번역 키, 끼워 넣을 값) → 글. 탭 목록(index.ts)이 번역 함수를 넘겨 준다 */
export type SourceLabel = (translationKey: string, params?: Record<string, string | number>) => string;

/** 화면 값 칸 하나: 칸 이름 (기존 HTML 의 data-key), 스탯, 출처 글 번역 키 */
export interface ScreenField {
  id: string;
  stat: string;
  sourceKey: string;
}

/** 읽을 수 있는 칸만 log 줄로 만든다 (빈칸·해석 불가·0 이하는 건너뜀 — 기존 HTML screenLog 와 같음) */
export function screenFieldLines(
  values: CalcValues,
  fields: readonly ScreenField[],
  sourceLabel: SourceLabel,
  sourceParams?: (field: ScreenField) => Record<string, string | number>,
): Line[] {
  const lines: Line[] = [];
  for (const field of fields) {
    const parsed = parseGameNumber(values[field.id]);
    if (parsed) {
      lines.push({ source: sourceLabel(field.sourceKey, sourceParams?.(field)), stat: field.stat, log: parsed.log });
    }
  }
  return lines;
}

/** 숫자 칸 → 정수 레벨 (기존 HTML numberValue: 소수 버림, 0 미만·숫자 아님은 0) */
export function wholeLevel(text: string | undefined): number {
  return Math.max(Math.floor(Number(text) || CONSTS.textLines.MIN_LEVEL), CONSTS.textLines.MIN_LEVEL);
}

/** 체크 칸 값 → 켜짐 여부 */
export function isChecked(text: string | undefined): boolean {
  return text === CONSTS.textLines.CHECKED_TEXT;
}
