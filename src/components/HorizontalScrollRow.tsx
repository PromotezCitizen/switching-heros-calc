import { Children, type ReactNode } from 'react';
import { Box, Group } from '@mantine/core';

interface HorizontalScrollRowProps {
  /** 칸 하나의 폭 (px). 칸들은 줄바꿈하지 않고 한 줄로 놓이고, 칸 폭을 넘치면 가로 스크롤 */
  itemWidth: number;
  gap?: string;
  children: ReactNode;
}

/** 한 줄 칸 묶음 (카드 편성·펫 장착 칸처럼 순서가 있는 칸): 넓으면 칸이 늘어나 한 줄을 채우고, 좁으면 가로 스크롤 */
export default function HorizontalScrollRow({ itemWidth, gap = 'var(--mantine-spacing-xs)', children }: HorizontalScrollRowProps) {
  return (
    <Box style={{ overflowX: 'auto', overflowY: 'hidden' }}>
      <Group gap={gap} wrap="nowrap" align="stretch">
        {/* 빈 칸 (null·false) 은 칸 자리를 만들지 않는다 */}
        {Children.map(children, (child) =>
          child === null || child === undefined || typeof child === 'boolean' ? null : (
            <Box miw={itemWidth} style={{ flex: `1 0 ${itemWidth}px` }}>
              {child}
            </Box>
          ),
        )}
      </Group>
    </Box>
  );
}
