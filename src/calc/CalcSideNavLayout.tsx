import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Group, NavLink, ScrollArea } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { useUiValue } from '@/store/useUiStore';
import { shownGroupTabs } from '@/calc/tabGroups';
import TabItem from '@/calc/TabItem';
import type { StatDescriptions } from '@/calc/statText';

const PANEL_UI_KEY = 'calcPanel';
const { SIDE_NAV_WIDTH, STICKY_HEADER_HEIGHT_VAR } = CONSTS.display;
/** 페이지 아래 여백 (App 의 Container pb="md") */
const PAGE_BOTTOM_GAP = 'var(--mantine-spacing-md)';

/** 목록 한 줄: 계산 칸 (tabId) 이거나, 계산 칸이 아닌 묶음 (기본 정보 · 계산 설정) */
interface NavItem {
  id: string;
  label: string;
  render: () => ReactNode;
}
interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

interface CalcSideNavLayoutProps {
  /** 화면 순서의 묶음 id (기본 정보 · 계산 묶음들 · 계산 설정) */
  groupIds: string[];
  /** 계산 칸이 아닌 묶음 → 그 칸 */
  specialGroups: Record<string, () => ReactNode>;
  /** 계산 묶음 id → 묶음 안 탭 id */
  tabIdsByGroup: Record<string, string[]>;
  descriptions: StatDescriptions;
}

/**
 * 넓은 화면의 계정 페이지: 왼쪽에 묶음 · 칸 목록, 오른쪽에 고른 칸 하나.
 * 한 번 연 칸은 다른 칸으로 가도 지우지 않고 숨겨 둔다 (히어로 탭처럼 다시 그리는 데 오래 걸리는 칸이 있어서)
 */
export default function CalcSideNavLayout({ groupIds, specialGroups, tabIdsByGroup, descriptions }: CalcSideNavLayoutProps) {
  const { t: translate } = useTranslation();
  const sections: NavSection[] = groupIds.map((groupId) => {
    const special = specialGroups[groupId];
    const label = translate(`calc.groups.${groupId}`);
    if (special) return { id: groupId, label, items: [{ id: groupId, label, render: special }] };
    const tabs = shownGroupTabs(tabIdsByGroup[groupId] ?? []);
    return {
      id: groupId,
      label,
      items: tabs.map((tab) => ({
        id: tab.id,
        // 칸이 하나뿐인 묶음은 묶음 이름으로
        label: tabs.length === 1 ? label : translate(`calc.${tab.id}.title`),
        render: () => <TabItem tab={tab} descriptions={descriptions} single />,
      })),
    };
  });
  const items = sections.flatMap((section) => section.items);
  const [savedPanel, setSavedPanel] = useUiValue(PANEL_UI_KEY);
  const activeId = items.some((item) => item.id === savedPanel) ? (savedPanel as string) : items[0]?.id;
  const [openedIds, setOpenedIds] = useState<string[]>([]);
  /** 칸이 든 묶음 */
  const sectionOf = (itemId: string | undefined) => sections.find((section) => section.items.some((item) => item.id === itemId))?.id;
  /** 펼쳐 둔 묶음: 처음에는 지금 보는 칸의 묶음, 그 뒤로는 누른 대로 (보는 칸의 묶음도 접을 수 있다) */
  const [openedSections, setOpenedSections] = useState<string[]>(() => {
    const first = sectionOf(activeId);
    return first ? [first] : [];
  });
  /*
   * 줄 높이 = 화면 높이 − 이 줄이 시작하는 위치 (페이지 맨 위에서). 페이지는 스크롤되지 않고,
   * 목록과 오른쪽 칸이 각자 안에서 스크롤된다
   */
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowTop, setRowTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      if (rowRef.current) setRowTop(rowRef.current.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const renderedIds = activeId && !openedIds.includes(activeId) ? [...openedIds, activeId] : openedIds;
  const choose = (itemId: string) => {
    setOpenedIds((previous) => (previous.includes(itemId) ? previous : [...renderedIds, itemId]));
    setSavedPanel(itemId);
    // 고른 칸의 묶음은 펼쳐 둔다
    const section = sectionOf(itemId);
    if (section) setOpenedSections((previous) => (previous.includes(section) ? previous : [...previous, section]));
  };

  const isOpen = (sectionId: string) => openedSections.includes(sectionId);
  const toggleSection = (sectionId: string) =>
    setOpenedSections((previous) => (previous.includes(sectionId) ? previous.filter((id) => id !== sectionId) : [...previous, sectionId]));

  return (
    <Group
      ref={rowRef}
      align="stretch"
      wrap="nowrap"
      gap="md"
      // 줄 높이 = 화면 바닥 − 페이지 아래 여백. dvh = 지금 보이는 높이 (모바일 크롬의 vh 는 주소창이 숨은 높이라 화면보다 길다).
      // 아래 여백을 남겨 칸이 화면 바닥에 붙지 않고, 페이지가 화면보다 길어지지 않게
      h={
        rowTop === null
          ? `calc(100dvh - var(${STICKY_HEADER_HEIGHT_VAR}) - ${PAGE_BOTTOM_GAP})`
          : `calc(100dvh - ${rowTop}px - ${PAGE_BOTTOM_GAP})`
      }
    >
      {/* 목록은 움직이지 않고, 목록이 길면 이 안에서만 스크롤 */}
      <Box w={SIDE_NAV_WIDTH} style={{ flexShrink: 0 }}>
        <ScrollArea h="100%" type="auto">
          {sections.map((section) =>
            section.items.length === 1 && section.items[0].label === section.label ? (
              <NavLink
                key={section.id}
                label={section.label}
                active={section.items[0].id === activeId}
                onClick={() => choose(section.items[0].id)}
              />
            ) : (
              // 묶음 이름을 누르면 칸 목록을 펼치고 접는다
              <NavLink
                key={section.id}
                label={section.label}
                opened={isOpen(section.id)}
                onClick={() => toggleSection(section.id)}
                childrenOffset="md"
              >
                {section.items.map((item) => (
                  <NavLink key={item.id} label={item.label} active={item.id === activeId} onClick={() => choose(item.id)} />
                ))}
              </NavLink>
            ),
          )}
        </ScrollArea>
      </Box>
      {/* 오른쪽 칸만 스크롤 */}
      <Box style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {items
          .filter((item) => renderedIds.includes(item.id))
          .map((item) => (
            <Box key={item.id} style={{ display: item.id === activeId ? undefined : 'none' }}>
              {item.render()}
            </Box>
          ))}
      </Box>
    </Group>
  );
}
