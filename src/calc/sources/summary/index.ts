/**
 * 종합 탭: 줄은 만들지 않고, 다른 모든 탭의 줄을 합쳐 프로필 창 줄마다 계산 값을 보여 준다.
 * 다른 탭 목록은 탭 목록 (tabs.ts) 이 넘긴다 (이 파일이 탭 목록을 불러오면 서로 부르게 된다)
 */
import { CONSTS } from '../../../CONSTS';
import SummaryPanel from '../../panels/SummaryPanel';
import type { CalcTab } from '../../types';

export {
  SUMMARY_ROW_IDS,
  attackIncreaseStats,
  compareWithScreen,
  groupSubtotals,
  increaseLogs,
  linesByGroup,
  screenFieldId,
  screenRoundingLog,
  summaryRows,
  summaryTarget,
} from './summary';
export type { GroupLines, IncreaseLogs, ScreenComparison, SummaryRow, SummaryRowId, SummaryTarget } from './summary';

export const SUMMARY_TAB_ID = CONSTS.summary.TAB_ID;

/** otherTabs = 종합 탭을 뺀 모든 탭. 표는 그 탭들이 쓰는 표 전부 (처음 읽을 때 한 번만 모은다) */
export function summaryTab(otherTabs: () => readonly CalcTab[]): CalcTab {
  let tableNames: readonly string[] | null = null;
  return {
    id: SUMMARY_TAB_ID,
    get tableNames() {
      tableNames ??= [...new Set(otherTabs().flatMap((tab) => [...tab.tableNames]))];
      return tableNames;
    },
    Panel: SummaryPanel,
    lines: () => [],
  };
}
