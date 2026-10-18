import type { CSSProperties } from 'react';
import { CONSTS } from '@/CONSTS';

/** 콘텐츠 칸 폭: 좁은 칸 (입력이 몇 줄), 넓은 칸 (카드 여러 장), 한 줄 전체 (특성 나무) */
type TabWidth = 'narrow' | 'wide' | 'full';

const { TAB_MIN_WIDTH } = CONSTS.display;

/** 적지 않은 탭은 좁은 칸 */
const TAB_WIDTHS: Record<string, TabWidth> = {
  // 캐릭터 각성 (hero) · 베르 각성 (awakenDetail) 은 좁은 칸 두 개로 좌우에 나란히 (화면이 좁으면 위아래)
  mastery: 'full',
  library: 'wide',
  diary: 'wide',
  rune: 'wide',
  weapon: 'wide',
  skill: 'wide',
  card: 'wide',
  pet: 'wide',
  summary: 'wide',
};

/**
 * 넓은 화면 (TAB_STACK_MIN_SCREEN_WIDTH 초과) 에서 한 칸 폭 안에 위아래로 쌓는 칸 묶음 (첫 칸 자리에 묶음을 놓는다).
 * 캐릭터 각성 · 베르 각성 = 둘 다 짧아 위아래로 두고 옆에 히어로 표·전용 무기 표를 놓는다
 */
export const TAB_STACKS: readonly (readonly string[])[] = [['hero', 'awakenDetail']];

/** 쌓은 묶음 하나의 크기 (좁은 칸과 같음) 와 안쪽 세로 배치 */
export const TAB_STACK_STYLE: CSSProperties = {
  ...tabWidthStyle('hero'),
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--mantine-spacing-xs)',
};

/** 콘텐츠 칸 하나의 크기: 최소 폭에서 시작해 남는 폭만큼 늘어나고, 화면보다 넓으면 화면 폭으로 줄어든다 */
export function tabWidthStyle(tabId: string): CSSProperties {
  const width = TAB_WIDTHS[tabId] ?? 'narrow';
  if (width === 'full') return { flex: '1 1 100%', minWidth: 0 };
  const grow = width === 'wide' ? 2 : 1;
  return { flex: `${grow} 1 ${TAB_MIN_WIDTH[width]}px`, minWidth: 0, maxWidth: '100%' };
}

/**
 * 콘텐츠 칸 하나의 위쪽 여백 없앰: 접이식 부품 (separated 모양) 은 두 번째 칸부터 위쪽 여백을 자동으로 붙이는데,
 * 칸을 좌우로 놓으면 같은 줄 칸끼리 높이가 어긋난다. 칸 사이 간격은 줄의 gap 하나로만 띄운다.
 * 테두리: separated 모양은 닫힌 칸 테두리를 투명으로 두고 배경색으로만 구분하는데, 제목 줄 배경 (고정용) 이 그 배경을 덮어
 * 닫힌 칸 모양이 사라진다 → 열림·닫힘과 상관없이 테두리를 그린다
 */
export const TAB_ITEM_STYLE: CSSProperties = {
  marginTop: 0,
  border: `${CONSTS.display.CONTENT_BORDER_WIDTH}px solid var(--mantine-color-default-border)`,
};
/** 콘텐츠 칸들을 담는 줄: 칸이 화면 폭에 들어가는 만큼 나란히, 넘치면 다음 줄 */
export const TAB_ROW_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  gap: 'var(--mantine-spacing-xs)',
};
