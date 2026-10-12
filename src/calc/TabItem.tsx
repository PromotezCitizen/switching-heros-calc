import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Accordion, Alert, Loader } from '@mantine/core';
import { useStatTables, type StatTables } from '../data/statTables';
import { useTrackedCalcValues } from './useTrackedCalcValues';
import type { CalcTab } from './types';
import type { StatDescriptions } from './statText';
import { CALC_KEY_PREFIX } from './storeKeys';
import { useCalcStore } from '../store/useCalcStore';
import { tabWidthStyle } from './tabWidths';
import { CONSTS } from '../CONSTS';
import { useStickyHeaderHeight } from '../useStickyHeaderHeight';

/**
 * 칸 제목이 붙는 위치 = 메인 탭 줄 높이 + 하위 탭 줄 높이 + 칸 테두리 두께.
 * 테두리 두께만큼 띄워야 제목 줄 위에 그린 선이 하위 탭 줄에 가려지지 않는다
 */
/** 수치표를 쓰지 않는 탭에 넘기는 빈 표 묶음 (그릴 때마다 새 객체를 만들지 않게) */
const NO_TABLES: StatTables = {};

const CONTENT_TITLE_TOP =`calc(var(${CONSTS.display.STICKY_HEADER_HEIGHT_VAR}) + var(${CONSTS.display.STICKY_SUB_TAB_HEIGHT_VAR}) + ${CONSTS.display.CONTENT_BORDER_WIDTH}px)`;

interface TabItemProps {
  tab: CalcTab;
  descriptions: StatDescriptions;
  /** 위아래로 쌓은 묶음 안의 칸이면 폭은 묶음이 정한다 (칸 자신의 폭 설정을 쓰지 않음) */
  stacked?: boolean;
}

/**
 * 접이식 항목 하나: 입력 패널. 이 탭이 쓰는 수치표만 불러오고, 이 탭이 읽은 칸이 바뀔 때만 다시 그린다
 * (memo: 하위 탭을 바꿔 페이지가 다시 그려져도 이 칸은 다시 그리지 않음)
 */
export default memo(TabItem);

function TabItem({ tab, descriptions, stacked = false }: TabItemProps) {
  const { t: translate } = useTranslation();
  const values = useTrackedCalcValues();
  const contentTitleRef = useStickyHeaderHeight<HTMLButtonElement>(CONSTS.display.STICKY_CONTENT_TITLE_HEIGHT_VAR);
  const setStoreValue = useCalcStore((state) => state.setValue);
  // 패널에 넘기는 저장 함수는 늘 같은 함수 (패널 안 칸들이 memo 로 다시 그리지 않게)
  const setValue = useCallback(
    (fieldId: string, text: string) => setStoreValue(CALC_KEY_PREFIX + fieldId, text),
    [setStoreValue],
  );
  const loaded = useStatTables(tab.tableNames);
  const needsTables = tab.tableNames.length > 0;
  const tables = needsTables ? (loaded.status === 'ready' ? loaded.data : null) : NO_TABLES;

  return (
    <Accordion.Item value={tab.id} style={stacked ? undefined : tabWidthStyle(tab.id)}>
      {/* 칸 제목은 스크롤해도 위쪽 탭 두 줄 바로 아래에 남는다 (그 칸이 화면에 있는 동안) */}
      <Accordion.Control
        ref={contentTitleRef}
        style={{
          position: 'sticky',
          top: CONTENT_TITLE_TOP,
          zIndex: CONSTS.display.STICKY_HEADER_Z_INDEX - 2,
          background: 'var(--mantine-color-body)',
          // 칸 테두리 위쪽 선은 칸 본체에 붙어 있어 스크롤하면 위로 사라진다 → 고정된 제목 줄 위에 같은 색 선을 그려 잘려 보이지 않게
          // (스크롤 전에는 칸 테두리와 같은 자리에 겹쳐 그려져 보이지 않음)
          boxShadow: `0 -${CONSTS.display.CONTENT_BORDER_WIDTH}px 0 0 var(--mantine-color-default-border)`,
        }}
      >
        {translate(`calc.${tab.id}.title`)}
      </Accordion.Control>
      <Accordion.Panel>
        {loaded.status === 'failed' && needsTables && <Alert color="red">{translate('calc.tableLoadFailed')}</Alert>}
        {needsTables && loaded.status === 'loading' && <Loader size="sm" />}
        {tables && (
          <tab.Panel
            values={values}
            setValue={setValue}
            tables={tables}
            descriptions={descriptions}
          />
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}
