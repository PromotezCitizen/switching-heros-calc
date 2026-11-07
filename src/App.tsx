import { useTranslation } from 'react-i18next';
import { Box, Container, Group, Tabs, Title } from '@mantine/core';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CONSTS } from '@/CONSTS';
import CalcPage from '@/calc/CalcPage';
import HuntingPage from '@/hunting/HuntingPage';
import LoadDialog from '@/load/LoadDialog';
import OptimizerPage from '@/masteryOptimizer/OptimizerPage';
import MasteryLevelPage from '@/masteryDebug/MasteryLevelPage';
import StatViewerPage from '@/statViewer/StatViewerPage';
import { useStickyHeaderHeight } from '@/useStickyHeaderHeight';

/** 페이지 순서: 추천 (첫 화면) · 사냥 · 계정 · 스탯 모아 보기 · 값 찾는 법 */
const PAGES = [
  { path: '/', labelKey: 'page.optimizer' },
  { path: '/hunting', labelKey: 'page.hunting' },
  { path: '/values', labelKey: 'page.calc' },
  { path: '/viewer', labelKey: 'page.viewer' },
  { path: '/guide', labelKey: 'page.guide' },
] as const;

/** 내용을 만든 페이지 (나머지는 제목만 있는 자리) */
const IMPLEMENTED_PATHS: readonly string[] = ['/', '/hunting', '/values', '/viewer'];
/** 예전 주소 → 지금 주소 (추천이 첫 화면이 되기 전 주소) */
const OLD_OPTIMIZER_PATH = '/optimizer';

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
        <Tabs value={pathname} onChange={(path) => path && navigate(path)}>
          <Tabs.List>
            {PAGES.map((page) => (
              <Tabs.Tab key={page.path} value={page.path}>
                {translate(page.labelKey)}
              </Tabs.Tab>
            ))}
            {/* 버튼도 탭 줄 안에 두어 아래 줄이 끝까지 이어진다 */}
            <Group ml="auto" pb="xs" gap="xs">
              <LoadDialog />
            </Group>
          </Tabs.List>
        </Tabs>
      </Box>
      <Routes>
        <Route path="/" element={<OptimizerPage />} />
        <Route path="/hunting" element={<HuntingPage />} />
        <Route path="/values" element={<CalcPage />} />
        <Route path={OLD_OPTIMIZER_PATH} element={<Navigate to="/" replace />} />
        <Route path="/viewer" element={<StatViewerPage />} />
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
