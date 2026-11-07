import { CALC_TABS } from '@/calc/tabs';
import type { CalcTab } from '@/calc/types';

/**
 * 계산식 확인기의 하위 탭 묶음 (화면 순서). 게임 메뉴(성장 안 탭: 훈련·특성·각성·유물·일기장·룬)를 기준으로 묶었다.
 * 콘텐츠를 새로 넣으면 여기 한 묶음에 id 를 적는다 (빠지면 검사가 실패한다).
 */
export const CALC_TAB_GROUPS: { id: string; tabIds: string[] }[] = [
  { id: 'summary', tabIds: ['summary'] },
  { id: 'hero', tabIds: ['hero', 'awakenDetail', 'heroRoster', 'mastery', 'coreMastery', 'library'] },
  { id: 'growth', tabIds: ['training', 'relic', 'ancientRelic', 'diary', 'rune'] },
  { id: 'equipment', tabIds: ['artifact', 'weapon', 'skill', 'soulForge'] },
  { id: 'card', tabIds: ['card'] },
  { id: 'pet', tabIds: ['pet'] },
  // 피규어는 따로 한 탭 (전용 · 공용 108개 전부, 사용자 결정 2026-11-07 "피규어를 새로운 탭으로 만들라니까")
  { id: 'figure', tabIds: ['figure'] },
  { id: 'collection', tabIds: ['costume', 'collection', 'title', 'profileIcon', 'affinity', 'fairy', 'mine', 'frame'] },
  { id: 'battle', tabIds: ['buff', 'profile'] },
];

/** 묶음마다 실제로 존재하는 탭만 (아직 만들지 않은 탭 id 는 건너뜀) */
export function groupTabs(tabIds: string[]): CalcTab[] {
  return tabIds
    .map((tabId) => CALC_TABS.find((tab) => tab.id === tabId))
    .filter((tab): tab is CalcTab => tab !== undefined);
}
