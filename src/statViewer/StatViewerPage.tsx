/**
 * 스탯 정보: 스탯 계열 (공격력, 체력 등) 을 고르면 그 계열을 주는 수치표 출처를 한 화면에 모은다.
 * 데이터 = statMeta.json (출처 · 스탯 · 계열 · 뺀 스탯) + statViewerTables/<표>.json (원본 행 보기용, 출처 행 번호와 같은 표)
 */
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Chip,
  Collapse,
  Group,
  Loader,
  NavLink,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery, useMergedRef } from '@mantine/hooks';
import { useStickyHeaderHeight } from '@/useStickyHeaderHeight';
import { CONSTS } from '@/CONSTS';
import { useJsonData, useJsonFiles } from '@/data/useJsonData';
import { SLIDE_TAB_STYLE } from '@/components/slideTabs';
import SlideTabsList from '@/components/SlideTabsList';
import ScrollTopButton from '@/components/ScrollTopButton';
import {
  defaultSortDirection,
  entityRows,
  familyMatches,
  formatRange,
  groupRange,
  groupSources,
  rawRows,
  sameValueRange,
  statLabel,
  type SortDirection,
  type ViewerMeta,
  type ViewerSource,
  type ViewerTable,
  type ViewerTables,
} from '@/statViewer/statViewerData';

const { KIND_ORDER, TAG_TYPES, UNRESOLVED_TABLES, TABLE_DIR, MASTERY_TABLE, RAW_TABLE_MAX_HEIGHT, ENTITY_MIN_WIDTH, ENTITY_MAX_WIDTH } =
  CONSTS.statViewer;
const { SIDE_NAV_MIN_SCREEN_WIDTH, STICKY_HEADER_HEIGHT_VAR, STICKY_SUB_TAB_HEIGHT_VAR, STICKY_HEADER_Z_INDEX } = CONSTS.display;
/** 나란히 놓을 때 왼쪽 목록 폭 (예전 격자 12칸 중 3칸과 같은 비율) */
const FAMILY_LIST_WIDTH = '25%';
/** 페이지 아래 여백 (App 의 Container pb="md") */
const PAGE_BOTTOM_GAP = 'var(--mantine-spacing-md)';
/** 페이지 줄 사이 간격 (맨 바깥 Stack gap="md") */
const PAGE_STACK_GAP = 'var(--mantine-spacing-md)';
const META_FILE = 'statMeta.json';
const NO_TABLES: readonly string[] = [];
const MONO = 'var(--mantine-font-family-monospace)';
const RATIO_PREFIX = '×';

/** 원본 표 (자기 안에서만 스크롤) */
function RawTable({ table, rowIndexes, columns, memberColumns }: { table: ViewerTable; rowIndexes?: number[]; columns?: string[]; memberColumns?: string[] }) {
  const { headers, rows } = rawRows(table, rowIndexes, columns, memberColumns);
  return (
    <ScrollArea.Autosize mah={RAW_TABLE_MAX_HEIGHT} type="auto">
      <Table fz="xs" verticalSpacing={4} horizontalSpacing="xs" stickyHeader withRowBorders>
        <Table.Thead>
          <Table.Tr>
            {headers.map((header) => (
              <Table.Th key={header}>{header}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((cells, rowIndex) => (
            <Table.Tr key={rowIndex}>
              {cells.map((cell, cellIndex) => (
                <Table.Td key={cellIndex} style={{ whiteSpace: 'nowrap' }}>
                  {cell}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
}

/** 대상별 표: 등급 머리글로 정렬 방향 전환, 원본 버튼으로 그 줄의 원본 행 */
function EntityTable({ list, table, groupKey }: { list: ViewerSource[]; table: ViewerTable | undefined; groupKey: string }) {
  const { t: translate } = useTranslation();
  const [direction, setDirection] = useState<SortDirection>(() => defaultSortDirection(groupKey.split('|')[0]));
  const [openRaw, setOpenRaw] = useState<ReadonlySet<number>>(new Set());
  const { rows, columns } = entityRows(list, table, direction);

  const toggleRaw = (index: number) =>
    setOpenRaw((previous) => {
      const next = new Set(previous);
      if (!next.delete(index)) next.add(index);
      return next;
    });

  return (
    <Table.ScrollContainer minWidth={0}>
      <Table fz="sm" verticalSpacing={4} horizontalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{translate('viewer.entity')}</Table.Th>
            {columns.map((column) => (
              <Table.Th key={column} style={{ whiteSpace: 'nowrap' }}>
                {column === 'grade' ? (
                  <UnstyledButton fw={600} fz="sm" onClick={() => setDirection(direction === 'asc' ? 'desc' : 'asc')}>
                    {translate(direction === 'asc' ? 'viewer.gradeAscending' : 'viewer.gradeDescending')}
                  </UnstyledButton>
                ) : (
                  translate(`viewer.${column}`)
                )}
              </Table.Th>
            ))}
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, index) => (
            <EntityTableRow key={index} row={row} columns={columns} table={table} rawOpen={openRaw.has(index)} onToggleRaw={() => toggleRaw(index)} />
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function EntityTableRow({
  row,
  columns,
  table,
  rawOpen,
  onToggleRaw,
}: {
  row: ReturnType<typeof entityRows>['rows'][number];
  columns: ReturnType<typeof entityRows>['columns'];
  table: ViewerTable | undefined;
  rawOpen: boolean;
  onToggleRaw: () => void;
}) {
  const { t: translate } = useTranslation();
  const numeric = (column: string) => column === 'levels' || column === 'values' || column === 'perLevel';
  return (
    <>
      <Table.Tr>
        <Table.Td style={{ minWidth: ENTITY_MIN_WIDTH, maxWidth: ENTITY_MAX_WIDTH }}>{row.source.entity}</Table.Td>
        {columns.map((column) => (
          <Table.Td key={column} style={{ whiteSpace: 'nowrap', fontFamily: numeric(column) ? MONO : undefined }}>
            {row.cells[column].map((line, lineIndex) => (
              <div key={lineIndex}>{line}</div>
            ))}
          </Table.Td>
        ))}
        <Table.Td>
          {row.hasRaw && table && (
            <Button size="compact-xs" variant="default" onClick={onToggleRaw}>
              {translate('viewer.raw')}
            </Button>
          )}
        </Table.Td>
      </Table.Tr>
      {rawOpen && table && (
        <Table.Tr bg="var(--mantine-color-default-hover)">
          <Table.Td colSpan={columns.length + 2} style={{ maxWidth: 0 }}>
            <RawTable table={table} rowIndexes={row.source.rows} columns={row.source.columns} memberColumns={row.source.memberColumns} />
          </Table.Td>
        </Table.Tr>
      )}
    </>
  );
}

/** 표 × 스탯 묶음 한 줄: 요약 (표 · 스탯 · 태그 · 계산 방식 · 값 범위), 값이 다르면 펼쳐서 대상별 표 */
function SourceGroup({ meta, tables, groupKey, list }: { meta: ViewerMeta; tables: ViewerTables; groupKey: string; list: ViewerSource[] }) {
  const { t: translate } = useTranslation();
  const [opened, setOpened] = useState(false);
  const first = list[0];
  const info = meta.stats[first.stat];
  const table = tables[first.table];
  const { low, high, allSame } = groupRange(list);
  const same = allSame ? sameValueRange(list, table) : null;

  const heading = (
    <Group gap="xs" wrap="wrap" align="baseline">
      <Text fw={600} size="sm">
        {table?.label ?? first.table}
      </Text>
      {first.table === MASTERY_TABLE && (
        <Text fw={600} size="sm">
          {list.map((source) => source.entity).join(', ')}
        </Text>
      )}
      <Text size="sm">{statLabel(meta, first.stat)}</Text>
      {info.tags.map(([, label]) => (
        <Badge key={label} variant="default" size="sm" radius="xl" tt="none" fw={400}>
          {label}
        </Badge>
      ))}
      <Badge variant="default" size="sm" radius="xl" tt="none" fw={400}>
        {translate(`viewer.kinds.${info.kind}`)}
      </Badge>
      <Text size="sm" fw={500} ff={MONO}>
        {(first.ratio ? RATIO_PREFIX : '') + formatRange(low, high)}
      </Text>
      <Text size="xs" c="dimmed">
        {allSame
          ? same?.type === 'levels'
            ? translate('viewer.sameLevels', { from: same.from, to: same.to })
            : same?.type === 'count'
              ? translate('viewer.sameCount', { count: same.count })
              : ''
          : translate('viewer.entityCount', { count: list.length, formula: first.formula })}
      </Text>
    </Group>
  );

  if (allSame) {
    return <Box py="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>{heading}</Box>;
  }
  return (
    <Box style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
      <UnstyledButton w="100%" py="xs" onClick={() => setOpened((value) => !value)} aria-expanded={opened}>
        <Group gap="xs" wrap="nowrap" align="baseline">
          <Text size="xs" c="dimmed">
            {opened ? '▾' : '▸'}
          </Text>
          {heading}
        </Group>
      </UnstyledButton>
      <Collapse expanded={opened}>{opened && <EntityTable list={list} table={table} groupKey={groupKey} />}</Collapse>
    </Box>
  );
}

/** 고른 계열의 필터 칩 + 묶음 목록. 칩 두 줄은 스크롤해도 chipsTop 위치에 붙어 있다 */
function FamilySources({ meta, tables, family, chipsTop }: { meta: ViewerMeta; tables: ViewerTables; family: string; chipsTop: string }) {
  const { t: translate } = useTranslation();
  const sources = useMemo(() => meta.sources.filter((source) => meta.stats[source.stat]?.family === family), [meta, family]);
  const kindsPresent = KIND_ORDER.filter((kind) => sources.some((source) => meta.stats[source.stat].kind === kind));
  const tagsPresent = TAG_TYPES.filter((type) => sources.some((source) => meta.stats[source.stat].tags.some(([tagType]) => tagType === type)));
  const [kinds, setKinds] = useState<string[]>(kindsPresent);
  const [tagTypes, setTagTypes] = useState<string[]>(tagsPresent);
  const groups = groupSources(sources, meta.stats, kinds, tagTypes);

  return (
    // 칩 줄 바로 아래에 항목 목록 (사이 간격 없음)
    <Stack gap={0}>
      <Stack
        gap="sm"
        pos="sticky"
        top={chipsTop}
        py="xs"
        bg="var(--mantine-color-body)"
        style={{
          zIndex: 1,
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Group gap="xs">
          <Text size="xs" c="dimmed" miw="5rem">
            {translate('viewer.kindFilter')}
          </Text>
          <Chip.Group multiple value={kinds} onChange={setKinds}>
            {kindsPresent.map((kind) => (
              <Chip key={kind} value={kind} size="xs">
                {translate(`viewer.kinds.${kind}`)}
              </Chip>
            ))}
          </Chip.Group>
        </Group>
        <Group gap="xs">
          <Text size="xs" c="dimmed" miw="5rem">
            {translate('viewer.tagFilter')}
          </Text>
          <Chip.Group multiple value={tagTypes} onChange={setTagTypes}>
            {tagsPresent.map((type) => (
              <Chip key={type} value={type} size="xs">
                {translate(`viewer.tagTypes.${type}`, { defaultValue: type })}
              </Chip>
            ))}
          </Chip.Group>
        </Group>
      </Stack>
      {/* 첫 항목 위 테두리를 칩 줄 아래 테두리와 겹쳐 선 하나로 */}
      <Box mt={-1}>
        {groups.length ? (
          groups.map(({ key, list }) => <SourceGroup key={key} meta={meta} tables={tables} groupKey={key} list={list} />)
        ) : (
          <Text size="sm" c="dimmed">
            {translate('viewer.noSources')}
          </Text>
        )}
      </Box>
    </Stack>
  );
}

/**
 * 폰: 위쪽 탭 줄 아래에 붙는 검색 · 계열 탭 줄. 자기 높이를 STICKY_SUB_TAB_HEIGHT_VAR 로 알려
 * 그 아래 칩 줄이 틈 없이 붙는다 (자료를 다 불러온 뒤 나타나므로 따로 떼어 나타날 때 잰다)
 */
function PhoneFamilyBar({ barRef, label, children }: { barRef: Ref<HTMLDivElement>; label: string; children: ReactNode }) {
  const measureRef = useStickyHeaderHeight<HTMLDivElement>(STICKY_SUB_TAB_HEIGHT_VAR);
  const ref = useMergedRef(measureRef, barRef);
  return (
    <Box
      ref={ref}
      component="nav"
      aria-label={label}
      pos="sticky"
      top={`var(${STICKY_HEADER_HEIGHT_VAR})`}
      py="xs"
      bg="var(--mantine-color-body)"
      style={{ zIndex: STICKY_HEADER_Z_INDEX - 1 }}
    >
      {children}
    </Box>
  );
}

export default function StatViewerPage() {
  const { t: translate } = useTranslation();
  const metaState = useJsonData<ViewerMeta>(META_FILE);
  const meta = metaState.status === 'ready' ? metaState.data : null;
  const tableNames = useMemo(
    () => (meta ? [...new Set([...meta.sources.map((source) => source.table), ...UNRESOLVED_TABLES])] : NO_TABLES),
    [meta],
  );
  const tableFiles = useMemo(() => tableNames.map((name) => `${TABLE_DIR}/${name}.json`), [tableNames]);
  const filesState = useJsonFiles<ViewerTable>(tableFiles);
  const [family, setFamily] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // 화면 폭이 계정 페이지 왼쪽 목록 기준 이상이면 목록 · 내용을 나란히
  const sideBySide = useMediaQuery(`(min-width: ${SIDE_NAV_MIN_SCREEN_WIDTH}px)`);
  const rowRef = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<HTMLDivElement>(null);
  /** 나란히 놓은 줄이 시작하는 위치 (페이지 맨 위에서). 줄 높이 = 화면 높이 − 이 위치 */
  const [rowTop, setRowTop] = useState<number | null>(null);
  const ready = metaState.status === 'ready' && filesState.status === 'ready';
  useLayoutEffect(() => {
    const measure = () => {
      if (rowRef.current) setRowTop(rowRef.current.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ready, sideBySide]);
  /** 폰: 위에 붙은 검색 · 계열 탭 줄, 그 아래 내용 */
  const phoneBarRef = useRef<HTMLDivElement>(null);
  const phoneSourcesRef = useRef<HTMLDivElement>(null);
  /** 다른 계열을 고르면 내용을 맨 위부터 */
  const chooseFamily = (key: string) => {
    setFamily(key);
    sourcesRef.current?.scrollTo({ top: 0 });
    // 폰: 내용을 읽다 고르면 내용 첫 줄이 탭 줄 바로 아래에 오도록 올린다
    const bar = phoneBarRef.current;
    const content = phoneSourcesRef.current;
    if (bar && content) {
      const contentStart =
        content.getBoundingClientRect().top + window.scrollY - bar.getBoundingClientRect().height - bar.getBoundingClientRect().top;
      if (window.scrollY > contentStart) window.scrollTo({ top: contentStart });
    }
  };

  const familyKeys = useMemo(
    () => (meta ? Object.keys(meta.families).sort((left, right) => meta.families[right].sourceCount - meta.families[left].sourceCount) : []),
    [meta],
  );

  if (metaState.status === 'failed' || filesState.status === 'failed') {
    return (
      <Alert color="red" mt="md">
        {translate('viewer.loadFailed')}
      </Alert>
    );
  }
  if (!meta || filesState.status !== 'ready') {
    return (
      <Group mt="md" gap="xs">
        <Loader size="sm" />
        <Text size="sm">{translate('viewer.loading')}</Text>
      </Group>
    );
  }
  const tables: ViewerTables = Object.fromEntries(tableNames.map((name, index) => [name, filesState.data[tableFiles[index]]]));
  const shownFamilies = familyKeys.filter((key) => familyMatches(meta, key, search));

  const familyItems = shownFamilies.length ? (
    shownFamilies.map((key) => (
      <NavLink
        key={key}
        label={meta.families[key].label}
        rightSection={
          <Text size="xs" ff={MONO}>
            {meta.families[key].sourceCount}
          </Text>
        }
        active={key === family}
        variant="filled"
        onClick={() => chooseFamily(key)}
      />
    ))
  ) : (
    <Text size="sm" c="dimmed">
      {translate('viewer.noSearchResult')}
    </Text>
  );
  const searchInput = (
    <TextInput
      type="search"
      placeholder={translate('viewer.search')}
      aria-label={translate('viewer.search')}
      value={search}
      onChange={(event) => setSearch(event.currentTarget.value.trim())}
    />
  );
  const sources = family ? (
    <FamilySources
      key={family}
      meta={meta}
      tables={tables}
      family={family}
      // 넓은 화면: 오른쪽 칸 맨 위 / 폰: 위쪽 탭 줄 + 검색 · 계열 탭 줄 아래.
      // 내용 칸 위쪽 안쪽 여백을 0 으로 두어 칩이 처음 자리와 붙은 자리가 같다 (스크롤해도 움직이지 않음)
      chipsTop={sideBySide ? '0' : `calc(var(${STICKY_HEADER_HEIGHT_VAR}) + var(${STICKY_SUB_TAB_HEIGHT_VAR}))`}
    />
  ) : (
    // 칸 가운데 (넓은 화면은 칸 높이가 화면 바닥까지라 위아래로도 가운데)
    <Center h="100%">
      <Text size="sm" c="dimmed">
        {translate('viewer.pickFamily')}
      </Text>
    </Center>
  );

  return (
    // 제목은 자료 페이지의 하위 탭 이름 ("스탯 정보") 이 대신하고, 값이 쌓이는 방법 · N 뜻은 게임 용어 탭에서 설명한다
    <Stack gap="md" mt="md">
      {sideBySide ? (
        // 넓은 화면: 줄 높이를 화면 바닥까지 고정하고 목록 · 오른쪽 내용이 각자 안에서 스크롤 (페이지는 스크롤 안 됨)
        <Group
          ref={rowRef}
          align="stretch"
          wrap="nowrap"
          gap="md"
          // dvh = 지금 보이는 높이 (모바일 크롬의 vh 는 주소창이 숨은 높이라 화면보다 길다)
          // 페이지 아래 여백만큼 남겨 칸 테두리가 화면 바닥에 붙지 않고, 페이지가 화면보다 길어지지 않게
          h={rowTop === null ? undefined : `calc(100dvh - ${rowTop}px - ${PAGE_BOTTOM_GAP})`}
        >
          <Paper
            withBorder
            p="sm"
            component="nav"
            aria-label={translate('viewer.familiesLabel')}
            style={{
              flex: `0 0 ${FAMILY_LIST_WIDTH}`,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {searchInput}
            <ScrollArea mt="xs" type="auto" style={{ flex: 1, minHeight: 0 }}>
              {familyItems}
            </ScrollArea>
          </Paper>
          <Paper ref={sourcesRef} withBorder p="sm" pt={family ? 0 : undefined} style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
            {sources}
          </Paper>
          <ScrollTopButton target={sourcesRef} />
        </Group>
      ) : (
        // 폰: 검색 칸 + 가로로 미는 계열 탭을 위쪽 탭 줄 아래에 붙여 두고, 그 아래 내용 (페이지가 스크롤)
        <>
          <PhoneFamilyBar barRef={phoneBarRef} label={translate('viewer.familiesLabel')}>
            {searchInput}
            {shownFamilies.length ? (
              <Tabs value={family} onChange={(key) => key && chooseFamily(key)} variant="pills" mt="xs">
                <SlideTabsList>
                  {shownFamilies.map((key) => (
                    <Tabs.Tab key={key} value={key} style={SLIDE_TAB_STYLE}>
                      {meta.families[key].label}
                    </Tabs.Tab>
                  ))}
                </SlideTabsList>
              </Tabs>
            ) : (
              <Text size="sm" c="dimmed" mt="xs">
                {translate('viewer.noSearchResult')}
              </Text>
            )}
          </PhoneFamilyBar>
          {/* 탭 줄과 사이 간격 (Stack gap md) 을 없애 칩이 처음 자리 = 붙은 자리 (탭 줄 바로 아래) */}
          <Paper ref={phoneSourcesRef} withBorder p="sm" pt={family ? 0 : undefined} mt={`calc(-1 * ${PAGE_STACK_GAP})`}>
            {sources}
          </Paper>
          <ScrollTopButton />
        </>
      )}
    </Stack>
  );
}
