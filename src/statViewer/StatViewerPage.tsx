/**
 * 스탯 모아 보기: 스탯 계열 (공격력, 체력 등) 을 고르면 그 계열을 주는 수치표 출처를 한 화면에 모은다.
 * 데이터 = statMeta.json (출처 · 스탯 · 계열 · 뺀 스탯) + statViewerTables/<표>.json (원본 행 보기용, 출처 행 번호와 같은 표)
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
  Grid,
  Group,
  Loader,
  NavLink,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { useJsonData, useJsonFiles } from '@/data/useJsonData';
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

const { KIND_ORDER, TAG_TYPES, UNRESOLVED_TABLES, TABLE_DIR, MASTERY_TABLE, FAMILY_LIST_MAX_HEIGHT, RAW_TABLE_MAX_HEIGHT, ENTITY_MIN_WIDTH, ENTITY_MAX_WIDTH } =
  CONSTS.statViewer;
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

/** 맨 위 안내: 값이 합쳐지는 방식 · N 뜻, 해석 미확인 표가 있으면 그 원본 (접힘) */
function Notice({ tables }: { tables: ViewerTables }) {
  const { t: translate } = useTranslation();
  const unresolved = UNRESOLVED_TABLES.filter((name) => tables[name]?.unresolved);
  return (
    <Alert color="yellow" variant="light">
      <Text size="sm">{translate('viewer.noticeBody')}</Text>
      <Text size="sm">{translate('viewer.valueHint')}</Text>
      {unresolved.length > 0 && (
        <Accordion mt="xs" variant="separated" chevronPosition="left" keepMounted={false}>
          {unresolved.map((name) => (
            <Accordion.Item key={name} value={name}>
              <Accordion.Control>{translate('viewer.unresolvedTitle', { label: tables[name].label })}</Accordion.Control>
              <Accordion.Panel>
                <RawTable table={tables[name]} />
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Alert>
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

/** 고른 계열의 필터 칩 + 묶음 목록 */
function FamilySources({ meta, tables, family }: { meta: ViewerMeta; tables: ViewerTables; family: string }) {
  const { t: translate } = useTranslation();
  const sources = useMemo(() => meta.sources.filter((source) => meta.stats[source.stat]?.family === family), [meta, family]);
  const kindsPresent = KIND_ORDER.filter((kind) => sources.some((source) => meta.stats[source.stat].kind === kind));
  const tagsPresent = TAG_TYPES.filter((type) => sources.some((source) => meta.stats[source.stat].tags.some(([tagType]) => tagType === type)));
  const [kinds, setKinds] = useState<string[]>(kindsPresent);
  const [tagTypes, setTagTypes] = useState<string[]>(tagsPresent);
  const groups = groupSources(sources, meta.stats, kinds, tagTypes);

  return (
    <Stack gap="sm">
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
      <Box>
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

  return (
    <Stack gap="md" mt="md">
      <Title order={1}>{translate('page.viewer')}</Title>
      <Notice tables={tables} />
      <Grid gap="md" align="flex-start">
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Paper withBorder p="sm" component="nav" aria-label={translate('viewer.familiesLabel')}>
            <TextInput
              type="search"
              placeholder={translate('viewer.search')}
              aria-label={translate('viewer.search')}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value.trim())}
            />
            <ScrollArea.Autosize mah={FAMILY_LIST_MAX_HEIGHT} mt="xs" type="auto">
              {shownFamilies.length ? (
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
                    onClick={() => setFamily(key)}
                  />
                ))
              ) : (
                <Text size="sm" c="dimmed">
                  {translate('viewer.noSearchResult')}
                </Text>
              )}
            </ScrollArea.Autosize>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Paper withBorder p="sm">
            {family ? (
              <FamilySources key={family} meta={meta} tables={tables} family={family} />
            ) : (
              <Text size="sm" c="dimmed">
                {translate('viewer.pickFamily')}
              </Text>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
