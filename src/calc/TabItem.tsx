import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Accordion, Alert, Center, Loader, Paper } from '@mantine/core';
import { useStatTables, type StatTables } from '@/data/statTables';
import { useTrackedCalcValues } from '@/calc/useTrackedCalcValues';
import type { CalcTab } from '@/calc/types';
import type { StatDescriptions } from '@/calc/statText';
import { CALC_KEY_PREFIX } from '@/calc/storeKeys';
import { useCalcStore } from '@/store/useCalcStore';
import { tabWidthStyle } from '@/calc/tabWidths';
import { CONSTS } from '@/CONSTS';
import { useStickyHeaderHeight } from '@/useStickyHeaderHeight';

/** 수치표를 쓰지 않는 탭에 넘기는 빈 표 묶음 (그릴 때마다 새 객체를 만들지 않게) */
const NO_TABLES: StatTables = {};

/**
 * 칸 제목이 붙는 위치 = 메인 탭 줄 높이 + 하위 탭 줄 높이 + 칸 사이 간격 (CONTENT_TOP_GAP).
 * 간격만큼 띄워야 제목 줄 위에 그린 선이 하위 탭 줄에 가려지지 않는다
 */
const CONTENT_TITLE_TOP = `calc(var(${CONSTS.display.STICKY_HEADER_HEIGHT_VAR}) + var(${CONSTS.display.STICKY_SUB_TAB_HEIGHT_VAR}) + ${CONSTS.display.CONTENT_TOP_GAP}px)`;

interface TabItemProps {
  tab: CalcTab;
  descriptions: StatDescriptions;
  /** 위아래로 쌓은 묶음 안의 칸이면 폭은 묶음이 정한다 (칸 자신의 폭 설정을 쓰지 않음) */
  stacked?: boolean;
  /** 하위 탭 묶음에 칸이 이것 하나뿐이면 접이식 제목 줄 없이 테두리 안에 내용만 (접을 일이 없음) */
  single?: boolean;
}

/**
 * 접이식 항목 하나: 입력 패널. 이 탭이 쓰는 수치표만 불러오고, 이 탭이 읽은 칸이 바뀔 때만 다시 그린다
 * (memo: 하위 탭을 바꿔 페이지가 다시 그려져도 이 칸은 다시 그리지 않음)
 */
export default memo(TabItem);

function TabItem({ tab, descriptions, stacked = false, single = false }: TabItemProps) {
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
  const content = (
    <>
      {loaded.status === 'failed' && needsTables && <Alert color="red">{translate('calc.tableLoadFailed')}</Alert>}
      {needsTables && loaded.status === 'loading' && (
        // 불러오는 동안 칸 가운데에
        <Center>
          <Loader size="sm" />
        </Center>
      )}
      {tables && <tab.Panel values={values} setValue={setValue} tables={tables} descriptions={descriptions} />}
    </>
  );

  if (single) {
    return (
      <Paper withBorder p="md">
        {content}
      </Paper>
    );
  }
  return (
    <Accordion.Item value={tab.id} style={stacked ? undefined : tabWidthStyle(tab.id)}>
      {/* 칸 제목은 스크롤해도 위쪽 탭 두 줄 바로 아래에 남는다 (그 칸이 화면에 있는 동안) */}
      <Accordion.Control
        ref={contentTitleRef}
        style={{
          position: 'sticky',
          top: CONTENT_TITLE_TOP,
          // 하위 탭 줄보다 뒤에 그린다 (하위 탭 줄을 덮지 않게)
          zIndex: CONSTS.display.STICKY_HEADER_Z_INDEX - 2,
          background: 'var(--mantine-color-body)',
          // 제목 줄 위: 바로 위 1px 는 테두리 색 선 (칸 테두리 위쪽 선은 칸 본체에 붙어 스크롤하면 사라지므로 고정된 제목 위에 다시 그림),
          // 그 위 하위 탭 줄까지의 틈 (CONTENT_TOP_GAP) 은 배경색으로 채워 아래로 지나가는 내용이 비치지 않게
          boxShadow: `0 -${CONSTS.display.CONTENT_BORDER_WIDTH}px 0 0 var(--mantine-color-default-border), 0 -${CONSTS.display.CONTENT_TOP_GAP}px 0 0 var(--mantine-color-body)`,
        }}
      >
        {translate(`calc.${tab.id}.title`)}
      </Accordion.Control>
      <Accordion.Panel>{content}</Accordion.Panel>
    </Accordion.Item>
  );
}
