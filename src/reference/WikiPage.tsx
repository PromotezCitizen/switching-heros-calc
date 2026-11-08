import { createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Anchor,
  Box,
  Button,
  Divider,
  Group,
  Image,
  NavLink,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { CONSTS } from '@/CONSTS';
import { useUiStore, useUiValue } from '@/store/useUiStore';
import { useStickyHeaderHeight } from '@/useStickyHeaderHeight';
import { SLIDE_TAB_STYLE } from '@/components/slideTabs';
import SlideTabsList from '@/components/SlideTabsList';
import ScrollTopButton from '@/components/ScrollTopButton';
import { iconUrl } from '@/calc/panels/heroWeaponCardPet/IconPicker';
import { HeroImage } from '@/calc/sources/hero/HeroPicker';
import wiki from '@/i18n/wiki.ko.json';

const { SIDE_NAV_MIN_SCREEN_WIDTH, STICKY_HEADER_HEIGHT_VAR, STICKY_SUB_TAB_HEIGHT_VAR, STICKY_HEADER_Z_INDEX } = CONSTS.display;
const TERM_UI_KEY = 'wikiTerm';
/** 계정 페이지가 고른 칸 · 묶음을 기억하는 키 (CalcSideNavLayout · CalcPage 와 같은 키) */
const CALC_PANEL_UI_KEY = 'calcPanel';
const CALC_GROUP_UI_KEY = 'calcGroup';
/** 나란히 놓을 때 왼쪽 목록 폭 (스탯 정보와 같은 비율) */
const TERM_LIST_WIDTH = '25%';
/** 페이지 아래 여백 (App 의 Container pb="md") */
const PAGE_BOTTOM_GAP = 'var(--mantine-spacing-md)';
/** 페이지 줄 사이 간격 (맨 바깥 Stack gap="md") */
const PAGE_STACK_GAP = 'var(--mantine-spacing-md)';
const TERM_IMAGE_SIZE = 48;
/** 해금이 없는 개념 설명 묶음 (스탯 읽는 법) */
const CONCEPT_GROUP = 'reading';

interface CalcLink {
  page?: string;
  group?: string;
  panel?: string | null;
}
/** 항목 하나 또는 소절 하나의 칸들 */
interface WikiPart {
  meaning: string | null;
  inGame: string | null;
  inCalc: string | null;
  calcLink: CalcLink | null;
  unlock: string | null;
  opens?: string | null;
  tables?: WikiTable[];
}
/** 한 항목에 묶은 다른 주제 (예: 길드 › 길드 스킬) */
interface WikiSection extends WikiPart {
  title: string;
}
interface WikiTerm {
  id: string;
  group: string;
  term: string;
  note: string | null;
  sections?: WikiSection[];
  /** 같이 보기 (용어 이름) */
  related?: string[];
  meaning: string | null;
  inGame: string | null;
  inCalc: string | null;
  calcLink: CalcLink | null;
  unlock: string | null;
  /** 이 값 (레벨 등) 을 조건으로 열리는 것. 있는 항목만 */
  opens?: string | null;
  image: string | null;
  /** 항목 안 표 (재료 개수 · 등급별 목록 등, 서버 표에서 뽑은 값) */
  tables?: WikiTable[];
}
interface WikiTable {
  title: string;
  columns: string[];
  rows: string[][];
  /** 히어로 이름 칸 (있으면 그 칸은 히어로 아이콘 + 이름으로 그림) */
  heroColumn?: number;
  /** 줄마다 그 칸의 히어로 번호 (칸 글의 ", " 로 나눈 이름과 같은 순서) */
  heroIds?: string[][];
  /** 칸마다 그림 (icons/ 아래 경로, 없으면 null). 있으면 그림 아래에 칸 글 */
  cellImages?: (string | null)[][];
  /** 머리줄 · 칸을 가운데 정렬 */
  center?: boolean;
}
const CELL_IMAGE_SIZE = 40;
const HERO_ICON_SIZE = 28;

/** 히어로 칸: 아이콘 + 이름을 나란히 (넘치면 다음 줄로) */
function HeroCell({ ids, names }: { ids: string[]; names: string[] }) {
  return (
    <Group gap="xs">
      {ids.map((id, index) => (
        <Group key={id} gap={4} wrap="nowrap">
          <HeroImage hero={{ charId: id }} size={HERO_ICON_SIZE} />
          <Text size="xs">{names[index]}</Text>
        </Group>
      ))}
    </Group>
  );
}
const TERMS = wiki.terms as WikiTerm[];
const GROUP_LABELS = wiki.groups as Record<string, string>;
/** Mantine 기본 탭 밑줄 두께 (px) */
const TAB_LINE_WIDTH = 2;
/** 폰 용어 탭: 감싼 상자에 아래 선, 탭 줄 자체 선은 지우고 고른 탭 밑줄을 상자 선 위로 */
const PHONE_TERM_LINE_STYLE: CSSProperties = { borderBottom: `${TAB_LINE_WIDTH}px solid var(--mantine-color-default-border)` };
const PHONE_TERM_TABS_STYLE = { marginBottom: -TAB_LINE_WIDTH, '--tab-border-color': 'transparent' } as CSSProperties;
/** 용어가 있는 묶음 (폰 묶음 탭 순서) */
const PHONE_GROUP_IDS = Object.keys(GROUP_LABELS).filter((groupId) => TERMS.some((term) => term.group === groupId));

/** 아직 덜 된 항목: 뜻 · 게임에서 보는 곳 · 해금 조건 (개념 설명 제외) 중 비었거나 "확인하지 못함" 이 있는 칸이 있으면 */
const partPending = (part: WikiPart, concept: boolean) =>
  [part.meaning, part.inGame, ...(concept ? [] : [part.unlock])].some((text) => !text || /확인하지 못|확인 못/.test(text));
/** 항목 또는 그 소절 중 하나라도 덜 됐으면 */
const isPending = (term: WikiTerm) =>
  partPending(term, term.group === CONCEPT_GROUP) || (term.sections ?? []).some((section) => partPending(section, false));
/** 덜 된 것 옆에 붙는 "(확인중)" */
function PendingMark({ pending }: { pending: boolean }) {
  const { t: translate } = useTranslation();
  if (!pending) return null;
  return (
    <Text span size="xs" c="dimmed" ml={4}>
      ({translate('wiki.pending')})
    </Text>
  );
}
/** 용어 이름 + 덜 된 항목이면 "(확인중)" */
function TermName({ term }: { term: WikiTerm }) {
  return (
    <>
      {term.term}
      <PendingMark pending={isPending(term)} />
    </>
  );
}

const termMatches = (term: WikiTerm, search: string) =>
  !search ||
  [
    term.term,
    term.note,
    term.meaning,
    term.inGame,
    ...(term.sections ?? []).flatMap((section) => [section.title, section.meaning, section.inGame]),
  ].some((text) => text?.toLowerCase().includes(search.toLowerCase()));

/** 칸 하나: 이름 + 글 (없으면 비었다는 안내) */
function Field({ label, text, empty, link = true }: { label: string; text: string | null; empty: string; link?: boolean }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      {/* 글의 줄바꿈 (해금 조건은 한 줄에 메뉴 하나) 을 그대로 */}
      <Text size="sm" c={text ? undefined : 'dimmed'} style={{ whiteSpace: 'pre-line' }}>
        {text && link ? <LinkedText text={text} /> : (text ?? empty)}
      </Text>
    </Stack>
  );
}

/** 글 안에서 다른 용어로 가는 링크용: 지금 보는 용어, 용어 고르기 */
interface WikiNavValue {
  currentId: string;
  select: (id: string) => void;
}
const WikiNav = createContext<WikiNavValue | null>(null);

/** 너무 흔하거나 짧아 엉뚱한 낱말에 걸리는 이름은 링크하지 않는다 */
const UNLINKED_NAMES: readonly string[] = ['히어로', '등급', '성', '스킬', '무기'];
/** 용어 이름을 품은 다른 낱말: 먼저 통째로 맞춰서 링크하지 않는다 (룬스톤 ≠ 룬) */
const NOT_TERM_WORDS: readonly string[] = ['룬스톤'];
/** 링크할 이름 → 용어 id (합친 항목은 " · " 로 나눈 이름 각각, 소절 이름은 그 항목으로) */
const LINK_TARGETS = new Map<string, string>();
for (const term of TERMS) {
  const names = [term.term, ...term.term.split(' · '), ...(term.sections ?? []).map((section) => section.title)];
  for (const name of names) if (!UNLINKED_NAMES.includes(name) && !LINK_TARGETS.has(name)) LINK_TARGETS.set(name, term.id);
}
/** 긴 이름부터 맞춘다 ("코어 특성" 이 "특성" 보다 먼저) */
const LINK_PATTERN = new RegExp(
  `(${[...LINK_TARGETS.keys(), ...NOT_TERM_WORDS]
    .sort((left, right) => right.length - left.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})`,
  'g',
);

const LATIN_NAME = /^[A-Za-z0-9 +]+$/;
const LATIN_CHAR = /[A-Za-z0-9]/;
/** 영문 이름이 더 긴 영문 낱말의 일부인지 (MAX1 안의 M 은 링크하지 않는다) */
function insideLatinWord(piece: string, before = '', after = ''): boolean {
  return LATIN_NAME.test(piece) && (LATIN_CHAR.test(before.slice(-1)) || LATIN_CHAR.test(after.slice(0, 1)));
}

/** 글 안의 다른 용어 이름을 누르면 그 용어로 간다 */
function LinkedText({ text }: { text: string }) {
  const nav = useContext(WikiNav);
  if (!nav) return text;
  // 이 글 안에서 이미 링크한 용어 (같은 용어는 처음 한 번만, 이 함수 안에서만 쓰는 목록)
  const linked = new Set<string>();
  const pieces = text.split(LINK_PATTERN);
  return pieces.map((piece, index) => {
    const id = index % 2 === 1 ? LINK_TARGETS.get(piece) : undefined;
    if (!id || id === nav.currentId || linked.has(id) || insideLatinWord(piece, pieces[index - 1], pieces[index + 1])) return piece;
    linked.add(id);
    return (
      <Anchor key={`${piece}-${index}`} component="button" type="button" fz="sm" onClick={() => nav.select(id)}>
        {piece}
      </Anchor>
    );
  });
}

/** 항목 맨 아래 "같이 보기": 데이터의 related (용어 이름) 를 버튼으로 */
function RelatedTerms({ names }: { names: string[] }) {
  const { t: translate } = useTranslation();
  const nav = useContext(WikiNav);
  const targets = names.map((name) => TERMS.find((term) => term.term === name)).filter((term): term is WikiTerm => term !== undefined);
  if (!nav || targets.length === 0) return null;
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed" fw={700}>
        {translate('wiki.related')}
      </Text>
      <Group gap="xs">
        {targets.map((term) => (
          <Button key={term.id} variant="default" size="compact-sm" onClick={() => nav.select(term.id)}>
            {term.term}
          </Button>
        ))}
      </Group>
    </Stack>
  );
}

/** 항목 안 표: 제목 + 표 (좁으면 표 안에서 가로 스크롤) */
function TermTable({ table }: { table: WikiTable }) {
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed" fw={700}>
        {table.title}
      </Text>
      <Table.ScrollContainer minWidth={0}>
        <Table striped withTableBorder withColumnBorders fz="xs">
          <Table.Thead>
            <Table.Tr>
              {table.columns.map((column) => (
                <Table.Th key={column} ta={table.center ? 'center' : undefined} style={{ whiteSpace: 'nowrap' }}>
                  {column}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {table.rows.map((row, rowIndex) => (
              <Table.Tr key={row.join('|')}>
                {row.map((cell, index) => (
                  <Table.Td key={table.columns[index]} ta={table.center ? 'center' : undefined}>
                    {index === table.heroColumn && table.heroIds ? (
                      <HeroCell ids={table.heroIds[rowIndex]} names={cell.split(', ')} />
                    ) : table.cellImages?.[rowIndex]?.[index] ? (
                      <Stack gap={2} align="center">
                        <Image
                          src={iconUrl(table.cellImages[rowIndex][index] as string)}
                          w={CELL_IMAGE_SIZE}
                          h={CELL_IMAGE_SIZE}
                          fit="contain"
                          alt=""
                        />
                        <Text size="xs" ta="center">
                          {cell}
                        </Text>
                      </Stack>
                    ) : (
                      cell
                    )}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}

/** 고른 용어 설명. "넣는 칸으로 가기" 는 계정 페이지의 그 칸 (또는 추천 페이지) 으로 간다 */
function TermDetail({ term, onSelect }: { term: WikiTerm; onSelect: (id: string) => void }) {
  const nav: WikiNavValue = { currentId: term.id, select: onSelect };
  return (
    <WikiNav.Provider value={nav}>
      <Stack gap="md">
        <Group gap="sm" wrap="nowrap">
          {term.image && <Image src={iconUrl(term.image)} w={TERM_IMAGE_SIZE} h={TERM_IMAGE_SIZE} fit="contain" alt="" />}
          <Stack gap={0}>
            <Title order={3}>
              <TermName term={term} />
            </Title>
            {term.note && (
              <Text size="sm" c="dimmed">
                {term.note}
              </Text>
            )}
          </Stack>
        </Group>
        <TermBody part={term} concept={term.group === CONCEPT_GROUP} />
        {/* 소절: 한 항목에 묶은 다른 주제 (길드 › 길드 스킬 · 길드 레이드 등). 소절마다 칸 · 표 · 넣는 칸 버튼이 따로 */}
        {term.sections?.map((section) => (
          <Stack key={section.title} gap="md">
            <Divider />
            <Title order={4}>
              {section.title}
              <PendingMark pending={partPending(section, false)} />
            </Title>
            <TermBody part={section} concept={false} />
          </Stack>
        ))}
        {term.related && term.related.length > 0 && (
          <>
            <Divider />
            <RelatedTerms names={term.related} />
          </>
        )}
      </Stack>
    </WikiNav.Provider>
  );
}

/** 항목 (또는 소절) 의 칸들: 뜻 · 표 · 게임에서 보는 곳 · 해금 조건 · 해금 대상 · 넣는 곳 · 넣는 칸으로 가기 */
function TermBody({ part, concept }: { part: WikiPart; concept: boolean }) {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const setUiValue = useUiStore((state) => state.setValue);
  const link = part.calcLink;
  const open = () => {
    if (!link) return;
    if (link.page) {
      navigate(link.page);
      return;
    }
    if (link.group) setUiValue(CALC_GROUP_UI_KEY, link.group);
    if (link.panel) setUiValue(CALC_PANEL_UI_KEY, link.panel);
    navigate('/values');
  };
  const unknown = translate('wiki.unknown');
  return (
    <Stack gap="md">
      <Field label={translate('wiki.meaning')} text={part.meaning} empty={unknown} />
      {part.tables?.map((table) => (
        <TermTable key={table.title} table={table} />
      ))}
      <Field label={translate('wiki.inGame')} text={part.inGame} empty={unknown} />
      {/* 개념 설명 (스탯 읽는 법) 은 해금이 없는 항목이라 칸을 숨긴다 */}
      {!concept && <Field label={translate('wiki.unlock')} text={part.unlock} empty={unknown} link={false} />}
      {part.opens && <Field label={translate('wiki.opens')} text={part.opens} empty={unknown} link={false} />}
      <Field label={translate('wiki.inCalc')} text={part.inCalc} empty={translate('wiki.notInCalc')} link={false} />
      {/* 넣는 곳이 있을 때만 그 칸으로 가는 버튼 */}
      {link && part.inCalc && (
        <Box>
          <Button variant="light" onClick={open}>
            {translate('wiki.openInCalc')}
          </Button>
        </Box>
      )}
    </Stack>
  );
}

/** 폰: 위쪽 탭 줄 아래에 붙는 검색 · 용어 탭 줄 (자기 높이를 STICKY_SUB_TAB_HEIGHT_VAR 로 알림) */
function PhoneTermBar({ label, children }: { label: string; children: ReactNode }) {
  const measureRef = useStickyHeaderHeight<HTMLDivElement>(STICKY_SUB_TAB_HEIGHT_VAR);
  return (
    <Box
      ref={measureRef}
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

/** 게임 용어: 용어를 골라 뜻 · 게임에서 보는 곳 · 해금 조건 · 넣는 곳을 본다. 글은 i18n/wiki.ko.json */
export default function WikiPage() {
  const { t: translate } = useTranslation();
  const [savedTerm, setSavedTerm] = useUiValue(TERM_UI_KEY);
  const [search, setSearch] = useState('');
  const sideBySide = useMediaQuery(`(min-width: ${SIDE_NAV_MIN_SCREEN_WIDTH}px)`);
  const rowRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  /** 나란히 놓은 줄이 시작하는 위치 (페이지 맨 위에서). 줄 높이 = 화면 높이 − 이 위치 − 아래 여백 */
  const [rowTop, setRowTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      if (rowRef.current) setRowTop(rowRef.current.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [sideBySide]);

  const shown = TERMS.filter((term) => termMatches(term, search));
  const active = TERMS.find((term) => term.id === savedTerm) ?? TERMS[0];
  const choose = (id: string) => {
    setSavedTerm(id);
    detailRef.current?.scrollTo({ top: 0 });
    if (!sideBySide) window.scrollTo({ top: 0 });
  };
  /** 폰: 묶음 탭을 고르면 그 묶음의 첫 용어 */
  const chooseGroup = (groupId: string) => {
    const first = TERMS.find((term) => term.group === groupId);
    if (first) choose(first.id);
  };
  /** 폰 용어 탭: 검색 중이면 맞는 용어 전부, 아니면 지금 묶음의 용어 */
  const phoneTerms = search ? shown : shown.filter((term) => term.group === active.group);
  const searchInput = (
    <TextInput
      type="search"
      placeholder={translate('wiki.search')}
      aria-label={translate('wiki.search')}
      value={search}
      onChange={(event) => setSearch(event.currentTarget.value.trim())}
    />
  );
  const noResult = (
    <Text size="sm" c="dimmed" mt="xs">
      {translate('wiki.noSearchResult')}
    </Text>
  );

  if (sideBySide) {
    // 묶음 이름 아래에 그 묶음 용어 (검색에 맞는 것만)
    const groups = Object.keys(GROUP_LABELS)
      .map((groupId) => ({ groupId, terms: shown.filter((term) => term.group === groupId) }))
      .filter((group) => group.terms.length > 0);
    return (
      <Group
        ref={rowRef}
        mt="md"
        align="stretch"
        wrap="nowrap"
        gap="md"
        // 페이지 아래 여백만큼 남겨 칸 테두리가 화면 바닥에 붙지 않고, 페이지가 화면보다 길어지지 않게
        h={rowTop === null ? undefined : `calc(100dvh - ${rowTop}px - ${PAGE_BOTTOM_GAP})`}
      >
        <Paper
          withBorder
          p="sm"
          component="nav"
          aria-label={translate('wiki.label')}
          style={{ flex: `0 0 ${TERM_LIST_WIDTH}`, minWidth: 0, display: 'flex', flexDirection: 'column' }}
        >
          {searchInput}
          <ScrollArea mt="xs" type="auto" style={{ flex: 1, minHeight: 0 }}>
            {groups.length
              ? groups.map(({ groupId, terms }) => (
                  <Box key={groupId} mb="xs">
                    <Text size="xs" c="dimmed" fw={700} px="sm" py={4}>
                      {GROUP_LABELS[groupId]}
                    </Text>
                    {terms.map((term) => (
                      <NavLink
                        key={term.id}
                        label={<TermName term={term} />}
                        active={term.id === active.id}
                        variant="filled"
                        onClick={() => choose(term.id)}
                      />
                    ))}
                  </Box>
                ))
              : noResult}
          </ScrollArea>
        </Paper>
        <Paper ref={detailRef} withBorder p="md" style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <TermDetail term={active} onSelect={choose} />
        </Paper>
        <ScrollTopButton target={detailRef} />
      </Group>
    );
  }

  return (
    <Stack gap="md" mt="md">
      <PhoneTermBar label={translate('wiki.label')}>
        {searchInput}
        {/* 묶음 탭: 고르면 그 묶음 첫 용어. 검색 중에는 숨기고 맞는 용어를 전부 */}
        {!search && (
          <Tabs value={active.group} onChange={(groupId) => groupId && chooseGroup(groupId)} variant="pills" mt="xs">
            <SlideTabsList>
              {PHONE_GROUP_IDS.map((groupId) => (
                <Tabs.Tab key={groupId} value={groupId} style={SLIDE_TAB_STYLE}>
                  {GROUP_LABELS[groupId]}
                </Tabs.Tab>
              ))}
            </SlideTabsList>
          </Tabs>
        )}
        {phoneTerms.length ? (
          // 아래 회색 선은 탭 줄이 아니라 감싼 상자에 그린다 (탭 줄에 그리면 옆으로 밀 때 처음 보이던 폭에서 끊긴다).
          // 탭 줄 자체 선은 지우고, 고른 탭 밑줄이 상자 선 위에 겹치게 선 두께만큼 내린다
          <Box mt="xs" style={PHONE_TERM_LINE_STYLE}>
            <Tabs value={active.id} onChange={(id) => id && choose(id)} style={PHONE_TERM_TABS_STYLE}>
              <SlideTabsList>
                {phoneTerms.map((term) => (
                  <Tabs.Tab key={term.id} value={term.id} style={SLIDE_TAB_STYLE}>
                    <TermName term={term} />
                  </Tabs.Tab>
                ))}
              </SlideTabsList>
            </Tabs>
          </Box>
        ) : (
          noResult
        )}
      </PhoneTermBar>
      {/* 탭 줄과 사이 간격을 없애 내용이 탭 줄 바로 아래에 */}
      <Paper withBorder p="md" mt={`calc(-1 * ${PAGE_STACK_GAP})`}>
        <TermDetail term={active} onSelect={choose} />
      </Paper>
      <ScrollTopButton />
    </Stack>
  );
}
