import { artifactTab } from './sources/artifactTab';
import { heroTabs } from './sources/hero';
import { heroWeaponCardPetTabs } from './sources/heroWeaponCardPet';
import { masteryRuneBuffTabs } from './sources/masteryRuneBuff';
import { skillTab } from './sources/skill';
import { SUMMARY_TAB_ID, summaryTab } from './sources/summary';
import { textLinesTabs } from './sources/textLines';
import { trainingRelicTabs } from './sources/trainingRelic';
import { expandedTabLines } from './tabLines';
import type { CalcTab, CalcValues } from './types';
import type { StatTables } from '../data/statTables';
import type { Line } from './combine';

/** 다른 탭 줄의 합을 읽는 탭 (버프: 연타·스킬 콤보 등 확률). 이 탭의 줄은 다른 탭 줄을 모을 때 빼야 서로 부르지 않는다 */
const BUFF_TAB_ID = 'buff';

/** 특성·룬·버프 묶음 앞뒤의 탭 (버프 탭이 이 탭들의 표를 같이 불러 줄을 계산한다) */
const TABS_BEFORE_BUFF_GROUP: CalcTab[] = [...heroTabs, artifactTab, ...trainingRelicTabs];
const TABS_AFTER_BUFF_GROUP: CalcTab[] = [...heroWeaponCardPetTabs, skillTab, ...textLinesTabs];

/**
 * 계산식 확인기에 나오는 콘텐츠 탭 목록 (화면 순서).
 * 새 콘텐츠는 CalcTab 하나를 만들어 여기에 넣으면 패널·효과 표·합산에 자동으로 들어간다
 */
export const CALC_TABS: CalcTab[] = [
  ...TABS_BEFORE_BUFF_GROUP,
  ...masteryRuneBuffTabs(
    linesExceptBuff,
    [...TABS_BEFORE_BUFF_GROUP, ...TABS_AFTER_BUFF_GROUP].flatMap((tab) => tab.tableNames),
  ),
  ...TABS_AFTER_BUFF_GROUP,
  summaryTab(tabsExceptSummary),
];

/** 종합 탭을 뺀 모든 탭 (종합 탭이 읽을 표를 모을 때 쓴다) */
function tabsExceptSummary(): CalcTab[] {
  return CALC_TABS.filter((tab) => tab.id !== SUMMARY_TAB_ID);
}

/** 버프 탭을 뺀 모든 탭의 줄 (함수 선언이라 CALC_TABS 를 만들 때 넘길 수 있고, 부를 때는 CALC_TABS 가 이미 있다) */
function linesExceptBuff(values: CalcValues, tables: StatTables): Line[] {
  return expandedTabLines(
    CALC_TABS.filter((tab) => tab.id !== BUFF_TAB_ID),
    values,
    tables,
  );
}
