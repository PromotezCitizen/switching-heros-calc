/** 글자 칸 → 줄 탭 묶음: 일기장 · 코스튬 · 도감 · 칭호 · 프로필 아이콘 · 요정의 축복 · 호감도 · 프로필 창 값 */
import i18n from '@/i18n';
import CollectionPanel from '@/calc/panels/CollectionPanel';
import CostumePanel from '@/calc/panels/CostumePanel';
import DiaryPanel from '@/calc/panels/DiaryPanel';
import { AffinityPanel, FairyPanel, ProfileIconPanel } from '@/calc/panels/OtherPanel';
import ProfilePanel from '@/calc/panels/ProfilePanel';
import TitlePanel from '@/calc/panels/TitlePanel';
import type { CalcTab } from '@/calc/types';
import { costumeLines, encyclopediaLines, titleLines } from '@/calc/sources/textLines/collection';
import { diaryLines } from '@/calc/sources/textLines/diary';
import { AFFINITY_TABLE_NAMES, FAIRY_TABLE_NAMES, affinityLines, fairyBlessingLines, profileIconLines } from '@/calc/sources/textLines/other';
import type { SourceLabel } from '@/calc/sources/textLines/screenFields';

/** 출처 글은 번역 파일에서 가져온다 (계산 함수는 번역을 직접 부르지 않고 이 함수를 받는다) */
const translateSource: SourceLabel = (translationKey, params) => i18n.t(translationKey, params);

const NO_TABLES: readonly string[] = [];
const DIARY_TABLE_NAMES: readonly string[] = ['DiaryStat'];

export const textLinesTabs: CalcTab[] = [
  {
    id: 'diary',
    tableNames: DIARY_TABLE_NAMES,
    Panel: DiaryPanel,
    lines: (values, tables) => diaryLines(values, tables, translateSource),
  },
  {
    id: 'costume',
    tableNames: NO_TABLES,
    Panel: CostumePanel,
    lines: (values) => costumeLines(values, translateSource),
  },
  {
    id: 'collection',
    tableNames: NO_TABLES,
    Panel: CollectionPanel,
    lines: (values) => encyclopediaLines(values, translateSource),
  },
  {
    id: 'title',
    tableNames: NO_TABLES,
    Panel: TitlePanel,
    lines: (values) => titleLines(values, translateSource),
  },
  {
    id: 'profileIcon',
    tableNames: NO_TABLES,
    Panel: ProfileIconPanel,
    lines: (values) => profileIconLines(values, translateSource),
  },
  {
    id: 'fairy',
    tableNames: FAIRY_TABLE_NAMES,
    Panel: FairyPanel,
    lines: (values, tables) => fairyBlessingLines(values, tables, translateSource),
  },
  {
    id: 'affinity',
    tableNames: AFFINITY_TABLE_NAMES,
    Panel: AffinityPanel,
    lines: (values, tables) => affinityLines(values, tables, translateSource),
  },
  {
    /** 프로필 창 값: 줄을 만들지 않는다. 화면 값은 profile.ts 의 parseProfile 로 읽는다 */
    id: 'profile',
    tableNames: NO_TABLES,
    Panel: ProfilePanel,
    lines: () => [],
  },
];
