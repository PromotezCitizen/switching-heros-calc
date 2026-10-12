/**
 * 코스튬·도감·칭호 "누적 능력치" 화면 값 → 효과 줄 (기존 stat-calc-sources.js COLLECTION_SCREEN_FIELDS / renderCollection).
 * 기존 HTML 은 한 탭(collection)이었고, React 에서는 코스튬(costume)·도감(collection)·칭호(title) 세 탭으로 나눈다.
 */
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import { screenFieldLines, type ScreenField, type SourceLabel } from './screenFields';

export const COSTUME_FIELDS: ScreenField[] = [
  { id: 'costumeAtk', stat: '_per_attackDamage', sourceKey: 'calc.costume.source' },
];
/** 보유 코스튬 수 (숫자 칸). 이 탭의 줄에는 쓰지 않고 얼티밋 특성 (HaveCostumeCnt) 계산이 읽는다 */
export const COSTUME_COUNT_FIELD = 'costumeCount';

export const ENCYCLOPEDIA_FIELDS: ScreenField[] = [
  { id: 'encyclopediaAtk', stat: '_per_attackDamage', sourceKey: 'calc.collection.source' },
  { id: 'encyclopediaHp', stat: '_per_hp', sourceKey: 'calc.collection.source' },
];

export const TITLE_FIELDS: ScreenField[] = [
  { id: 'titleAtk', stat: '_per_attackDamage', sourceKey: 'calc.title.source' },
  { id: 'titleHp', stat: '_per_hp', sourceKey: 'calc.title.source' },
];

export function costumeLines(values: CalcValues, sourceLabel: SourceLabel): Line[] {
  return screenFieldLines(values, COSTUME_FIELDS, sourceLabel);
}

export function encyclopediaLines(values: CalcValues, sourceLabel: SourceLabel): Line[] {
  return screenFieldLines(values, ENCYCLOPEDIA_FIELDS, sourceLabel);
}

export function titleLines(values: CalcValues, sourceLabel: SourceLabel): Line[] {
  return screenFieldLines(values, TITLE_FIELDS, sourceLabel);
}
