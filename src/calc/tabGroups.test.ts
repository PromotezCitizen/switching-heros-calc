import { describe, expect, it } from 'vitest';
import { CALC_TAB_GROUPS } from '@/calc/tabGroups';
import { CALC_TABS } from '@/calc/tabs';

describe('하위 탭 묶음', () => {
  it('모든 콘텐츠 탭이 정확히 한 묶음에 들어 있다', () => {
    const grouped = CALC_TAB_GROUPS.flatMap((group) => group.tabIds);
    for (const tab of CALC_TABS) {
      expect(grouped.filter((tabId) => tabId === tab.id), `${tab.id} 가 묶음에 ${grouped.filter((tabId) => tabId === tab.id).length}번 들어 있음`).toHaveLength(1);
    }
  });
  it('같은 id 가 두 묶음에 들어 있지 않다', () => {
    const grouped = CALC_TAB_GROUPS.flatMap((group) => group.tabIds);
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});
