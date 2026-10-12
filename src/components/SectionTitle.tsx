import type { ReactNode } from 'react';
import { Title, type MantineSpacing } from '@mantine/core';

interface SectionTitleProps {
  /** 위쪽 여백 (앞 칸 묶음과 띄울 때만) */
  mt?: MantineSpacing;
  children: ReactNode;
}

/** 패널 안 소제목. 모든 계산 패널이 같은 글자 크기·굵기로 보이도록 소제목은 이것만 쓴다 */
export default function SectionTitle({ mt, children }: SectionTitleProps) {
  return (
    <Title order={4} mt={mt}>
      {children}
    </Title>
  );
}
