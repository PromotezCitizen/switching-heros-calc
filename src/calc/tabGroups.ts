import { CALC_TABS } from '@/calc/tabs';
import type { CalcTab } from '@/calc/types';

/**
 * 계산식 확인기의 하위 탭 묶음 (화면 순서). 게임 메뉴(성장 안 탭: 훈련·특성·각성·유물·일기장·룬)를 기준으로 묶었다.
 * 콘텐츠를 새로 넣으면 여기 한 묶음에 id 를 적는다 (빠지면 검사가 실패한다).
 */
export const CALC_TAB_GROUPS: { id: string; tabIds: string[] }[] = [
  { id: 'summary', tabIds: ['summary'] },
  { id: 'hero', tabIds: ['hero', 'awakenDetail', 'heroRoster', 'library'] },
  { id: 'mastery', tabIds: ['mastery', 'coreMastery'] },
  { id: 'growth', tabIds: ['training', 'relic', 'ancientRelic', 'diary', 'rune'] },
  { id: 'equipment', tabIds: ['artifact', 'weapon', 'skill', 'soulForge'] },
  { id: 'card', tabIds: ['card'] },
  { id: 'pet', tabIds: ['pet'] },
  // 피규어는 따로 한 탭 (전용 · 공용 108개 전부)
  { id: 'figure', tabIds: ['figure'] },
  { id: 'collection', tabIds: ['costume', 'collection', 'title', 'profileIcon', 'affinity', 'fairy', 'mine', 'frame'] },
  { id: 'battle', tabIds: ['buff', 'profile'] },
];

/**
 * 화면에 칸을 그리지 않는 탭 (계산에는 그대로 들어감). 보이는 칸이 없는 묶음은 탭째 숨는다
 */
export const HIDDEN_PANEL_TAB_IDS: readonly string[] = ['affinity', 'fairy', 'buff', 'profile'];

/** 화면에 그리는 탭 (묶음 안에서 HIDDEN_PANEL_TAB_IDS 를 뺀 것) */
export function shownGroupTabs(tabIds: string[]): CalcTab[] {
  return groupTabs(tabIds).filter((tab) => !HIDDEN_PANEL_TAB_IDS.includes(tab.id));
}

/** 묶음마다 실제로 존재하는 탭만 (아직 만들지 않은 탭 id 는 건너뜀) */
export function groupTabs(tabIds: string[]): CalcTab[] {
  return tabIds
    .map((tabId) => CALC_TABS.find((tab) => tab.id === tabId))
    .filter((tab): tab is CalcTab => tab !== undefined);
}
