import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Container, Group, Tabs, Title } from '@mantine/core';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CONSTS } from '@/CONSTS';
import CalcPage from '@/calc/CalcPage';
import HuntingPage from '@/hunting/HuntingPage';
import LoadDialog from '@/load/LoadDialog';
import ColorSchemeButton from '@/components/ColorSchemeButton';
import { SLIDE_TAB_LIST_STYLE, SLIDE_TAB_STYLE } from '@/components/slideTabs';
import OptimizerPage from '@/masteryOptimizer/OptimizerPage';
import MasteryLevelPage from '@/masteryDebug/MasteryLevelPage';
import ReferencePage from '@/reference/ReferencePage';
import { useStickyHeaderHeight } from '@/useStickyHeaderHeight';

/** 페이지 순서: 추천 (첫 화면) · 사냥 · 계정 · 자료 */
const PAGES = [
  { path: '/', labelKey: 'page.optimizer' },
  { path: '/hunting', labelKey: 'page.hunting' },
  { path: '/values', labelKey: 'page.calc' },
  { path: '/data', labelKey: 'page.reference' },
] as const;

/** 내용을 만든 페이지 (나머지는 제목만 있는 자리) */
const IMPLEMENTED_PATHS: readonly string[] = ['/', '/hunting', '/values', '/data'];
/** 예전 주소 → 지금 주소 (추천이 첫 화면이 되기 전 /optimizer, 자료 페이지로 옮기기 전 스탯 모아 보기 /viewer · 값 찾는 법 /guide) */
const OLD_PATHS: readonly { from: string; to: string }[] = [
  { from: '/optimizer', to: '/' },
  { from: '/viewer', to: '/data' },
  { from: '/guide', to: '/data' },
];
/** Mantine 기본 탭 밑줄 두께 (px) */
const TAB_LINE_WIDTH = 2;
const HEADER_ROW_STYLE: CSSProperties = { borderBottom: `${TAB_LINE_WIDTH}px solid var(--mantine-color-default-border)` };
/** 탭 줄 자체의 밑줄은 지우고, 고른 탭 표시가 바깥 줄 위에 겹치게 아래로 붙인다 */
const PAGE_TABS_STYLE = {
  flex: 1,
  minWidth: 0,
  marginBottom: -TAB_LINE_WIDTH,
  '--tab-border-color': 'transparent',
} as CSSProperties;

export default function App() {
  const { t: translate } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const headerRef = useStickyHeaderHeight<HTMLDivElement>();
  return (
    <Container fluid px="md" pb="md">
      {/* 스크롤해도 탭과 계정 정보 버튼이 화면 위에 남는다 */}
      <Box
        ref={headerRef}
        pos="sticky"
        top={0}
        pt="md"
        bg="var(--mantine-color-body)"
        style={{ zIndex: CONSTS.display.STICKY_HEADER_Z_INDEX }}
      >
        {/* 페이지 탭은 한 줄 (넘치면 옆으로 밀기), 불러오기 버튼은 탭과 따로 늘 오른쪽 위 */}
        {/* 탭 아래 회색 줄은 탭 줄이 아니라 이 줄 전체에 그린다 (탭을 밀어도 버튼 아래까지 끝까지 이어지게) */}
        <Group wrap="nowrap" align="center" gap="xs" style={HEADER_ROW_STYLE}>
          {/* page-tabs: 고른 탭 · 마우스 올린 탭 모양 (global.css) */}
          <Tabs value={pathname} onChange={(path) => path && navigate(path)} style={PAGE_TABS_STYLE} className="page-tabs">
            <Tabs.List style={SLIDE_TAB_LIST_STYLE}>
              {PAGES.map((page) => (
                <Tabs.Tab key={page.path} value={page.path} style={SLIDE_TAB_STYLE}>
                  {translate(page.labelKey)}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
          <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
            <ColorSchemeButton />
            <LoadDialog />
          </Group>
        </Group>
      </Box>
      <Routes>
        <Route path="/" element={<OptimizerPage />} />
        <Route path="/hunting" element={<HuntingPage />} />
        <Route path="/values" element={<CalcPage />} />
        <Route path="/data" element={<ReferencePage />} />
        {OLD_PATHS.map(({ from, to }) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}
        {/* 디버그 페이지: 개발 서버에서만, 탭 없이 주소로 (/mastery-level) */}
        {import.meta.env.DEV && <Route path="/mastery-level" element={<MasteryLevelPage />} />}
        {PAGES.filter((page) => !IMPLEMENTED_PATHS.includes(page.path)).map((page) => (
          <Route
            key={page.path}
            path={page.path}
            element={
              <Title order={1} mt="lg">
                {translate(page.labelKey)}
              </Title>
            }
          />
        ))}
      </Routes>
    </Container>
  );
}
