/**
 * 여러 탭의 효과 줄을 합산 직전 모양으로 모은다: 탭 줄 → 몬스터 카드 "SSS 카드 장착 수" 펼침 → 명중 제외.
 * 연타·공격속도처럼 다른 탭 줄의 합이 필요한 계산이 쓴다
 */
import i18next from 'i18next';
import { CONSTS } from '../CONSTS';
import type { StatTables } from '../data/statTables';
import { readFlag } from '../store/storedValues';
import { withoutExcludedStats, type Line } from './combine';
import { cardSlotGradeStars, countExpandedLines, sssCardCount } from './sources/heroWeaponCardPet';
import type { CalcTab, CalcValues } from './types';

const { ENEMY_COUNT_FIELD } = CONSTS.summary;

export function expandedTabLines(tabs: readonly CalcTab[], values: CalcValues, tables: StatTables): Line[] {
  const lines = tabs.flatMap((tab) => tab.lines(values, tables));
  const sssCards = sssCardCount(cardSlotGradeStars(values, tables));
  const expanded = countExpandedLines(
    lines,
    sssCards,
    (translationKey, params) => i18next.t(translationKey, params ?? {}),
    readFlag(values, ENEMY_COUNT_FIELD),
  );
  return withoutExcludedStats(expanded.lines);
}
