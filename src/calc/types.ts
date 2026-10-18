import type { ComponentType } from 'react';
import type { StatTables } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import type { StatDescriptions } from '@/calc/statText';

/** 입력 칸 값 전체 (칸 이름 → 입력한 글). 칸 이름은 기존 HTML 의 data-key 와 같고, 저장소에는 `calc.` 를 붙여 넣는다 */
export type CalcValues = Record<string, string>;

export interface TabPanelProps {
  /**
   * 칸 값 (읽은 칸만 구독). 탭이 살아 있는 동안 늘 같은 객체라서 useMemo·memo 의 비교 기준으로 쓰면 안 된다
   * (필요한 칸 값을 꺼내서 넘기기). 칸 이름 목록을 훑으면 (Object.keys 등) 모든 칸이 구독된다
   */
  values: CalcValues;
  setValue: (fieldId: string, text: string) => void;
  tables: StatTables;
  descriptions: StatDescriptions;
}

/** 계산식 확인기의 콘텐츠 하나 (접이식 패널 하나 + 효과 줄을 만드는 함수) */
export interface CalcTab {
  /** 패널 이름 (번역 키: calc.<id>.title) */
  id: string;
  /** 이 탭이 쓰는 수치표 이름 */
  tableNames: readonly string[];
  Panel: ComponentType<TabPanelProps>;
  /** 입력 → 효과 줄. 다른 탭의 입력도 읽을 수 있도록 입력 전체를 받는다 */
  lines: (values: CalcValues, tables: StatTables) => Line[];
}
