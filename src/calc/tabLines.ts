/**
 * 여러 탭의 효과 줄을 합산 직전 모양으로 모은다: 탭 줄 → 몬스터 카드 "SSS 카드 장착 수" 펼침 → 명중 제외.
 * 연타·공격속도처럼 다른 탭 줄의 합이 필요한 계산이 쓴다
 */
import i18next from 'i18next';
import { CONSTS } from '@/CONSTS';
import type { StatTables } from '@/data/statTables';
import { readFlag } from '@/store/storedValues';
import { withoutExcludedStats, type Line } from '@/calc/combine';
import { cardCountsByGrade, cardSlotGradeStars, countExpandedLines, sssCardCount } from '@/calc/sources/heroWeaponCardPet';
import type { CalcTab, CalcValues } from '@/calc/types';

const { ENEMY_COUNT_FIELD } = CONSTS.summary;
const { SWAP_UPTIME_FIELD } = CONSTS.masteryRuneBuff;
const { DAMAGE_TARGET_FIELD, TARGETS_PER_SKILL_FIELD } = CONSTS.dpm;

export function expandedTabLines(tabs: readonly CalcTab[], values: CalcValues, tables: StatTables): Line[] {
  const lines = tabs.flatMap((tab) => tab.lines(values, tables));
  const slotGradeStars = cardSlotGradeStars(values, tables);
  // 카드 전투 조건 (주위 적 수 · 스테이지 보스전 …) 판정용 전투 상황: 대미지 계산만 값 칸에 넣는다 (없으면 조건 효과는 꺼짐)
  const damageTarget = values[DAMAGE_TARGET_FIELD];
  const battle = damageTarget ? { damageTarget, targetsPerSkill: Number(values[TARGETS_PER_SKILL_FIELD]) || 1 } : undefined;
  const expanded = countExpandedLines(
    lines,
    sssCardCount(slotGradeStars),
    (translationKey, params) => i18next.t(translationKey, params ?? {}),
    readFlag(values, ENEMY_COUNT_FIELD),
    cardCountsByGrade(slotGradeStars),
    Number(values[SWAP_UPTIME_FIELD]) || 0,
    battle,
  );
  return withoutExcludedStats(expanded.lines);
}
