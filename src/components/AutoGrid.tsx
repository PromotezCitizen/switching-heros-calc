import type { ReactNode } from 'react';
import { Box } from '@mantine/core';

interface AutoGridProps {
  /** 카드 한 장의 최소 폭 (px). 열 수는 정하지 않고, 칸 폭에 이 폭이 들어가는 만큼 가로로 놓는다 */
  minItemWidth: number;
  gap?: string;
  children: ReactNode;
}

/** 열 수를 고정하지 않는 카드 격자: 넓으면 한 줄에 많이 (남는 폭은 카드가 나눠 가짐), 좁으면 줄바꿈 */
export default function AutoGrid({ minItemWidth, gap = 'var(--mantine-spacing-xs)', children }: AutoGridProps) {
  return (
    <Box
      style={{
        display: 'grid',
        // auto-fit: 카드 수가 한 줄을 다 못 채워도 빈 열을 남기지 않고 카드가 늘어나 줄을 채운다
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minItemWidth}px), 1fr))`,
        gap,
      }}
    >
      {children}
    </Box>
  );
}
