import type { CSSProperties } from 'react';

/** 탭 줄을 한 줄로 두고, 넘치면 옆으로 밀어서 본다 (폰 폭에서 여러 줄로 꺾이지 않게) */
export const SLIDE_TAB_LIST_STYLE: CSSProperties = {
  flexWrap: 'nowrap',
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',
};

/** 탭 하나가 줄어들거나 글이 꺾이지 않게 */
export const SLIDE_TAB_STYLE: CSSProperties = { flex: '0 0 auto', whiteSpace: 'nowrap' };
