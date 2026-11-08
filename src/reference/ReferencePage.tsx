import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Stack, Tabs } from '@mantine/core';
import { useUiValue } from '@/store/useUiStore';
import { SLIDE_TAB_LIST_STYLE, SLIDE_TAB_STYLE } from '@/components/slideTabs';
import StatViewerPage from '@/statViewer/StatViewerPage';
import WikiPage from '@/reference/WikiPage';

const SECTION_UI_KEY = 'referenceSection';

interface ReferenceSection {
  id: string;
  labelKey: string;
  render: () => ReactNode;
}

/** 자료 페이지 하위 탭 순서 */
const SECTIONS: readonly ReferenceSection[] = [
  { id: 'statViewer', labelKey: 'page.viewer', render: () => <StatViewerPage /> },
  { id: 'wiki', labelKey: 'page.wiki', render: () => <WikiPage /> },
];

/** 자료: 계산에 넣는 값이 아니라 찾아보는 내용 (스탯 정보 등). 하위 탭 하나를 골라 보여 주고, 고른 탭은 이 기기에 기억 */
export default function ReferencePage() {
  const { t: translate } = useTranslation();
  const [savedSection, setSavedSection] = useUiValue(SECTION_UI_KEY);
  const active = SECTIONS.find((section) => section.id === savedSection) ?? SECTIONS[0];
  return (
    <Stack gap={0} mt="md">
      {/* 계정 페이지 폰 화면의 묶음 탭과 같은 모양 (가로로 미는 칠한 탭) */}
      <Tabs value={active.id} onChange={(id) => id && setSavedSection(id)} variant="pills">
        <Tabs.List style={SLIDE_TAB_LIST_STYLE}>
          {SECTIONS.map((section) => (
            <Tabs.Tab key={section.id} value={section.id} style={SLIDE_TAB_STYLE}>
              {translate(section.labelKey)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      {active.render()}
    </Stack>
  );
}
