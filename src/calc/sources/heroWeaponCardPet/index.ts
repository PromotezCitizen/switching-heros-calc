/** 히어로의 기록·무기·몬스터 카드·펫·광산 탭 목록 */
import i18n from 'i18next';
import CardPanel from '../../panels/CardPanel';
import LibraryPanel from '../../panels/LibraryPanel';
import MinePanel from '../../panels/MinePanel';
import PetPanel from '../../panels/PetPanel';
import SoulForgePanel from '../../panels/SoulForgePanel';
import WeaponPanel from '../../panels/WeaponPanel';
import type { CalcTab } from '../../types';
import { cardLines } from './card';
import { libraryLines } from './library';
import { mineLines } from './mine';
import { petLines } from './pet';
import type { SourceLabel } from './shared';
import { soulForgeLines, weaponLines } from './weapon';

export { cardCountsByGrade, cardSlotGradeStars, cardStackLines, countExpandedLines, sssCardCount } from './card';
export type { CardSlotGradeStar } from './card';
export { equippedPetIds } from './pet';

/** 출처 글 = 번역 (i18n 이 준비된 뒤 호출된다) */
const sourceLabel: SourceLabel = (translationKey, params) => i18n.t(translationKey, params);

export const heroWeaponCardPetTabs: CalcTab[] = [
  {
    id: 'library',
    tableNames: ['Library'],
    Panel: LibraryPanel,
    lines: (values, tables) => libraryLines(values, tables, sourceLabel),
  },
  {
    id: 'weapon',
    tableNames: ['WeaponJob', 'WeaponChar', 'WeaponTranscend', 'Character', 'WeaponLink', 'ContentMission', 'Relic'],
    Panel: WeaponPanel,
    lines: (values, tables) => weaponLines(values, tables, sourceLabel),
  },
  {
    id: 'soulForge',
    tableNames: ['SoulForge'],
    Panel: SoulForgePanel,
    lines: (values, tables) => soulForgeLines(values, tables, sourceLabel),
  },
  {
    id: 'card',
    tableNames: ['Card', 'CardSet', 'CardStickerSet'],
    Panel: CardPanel,
    lines: (values, tables) => cardLines(values, tables, sourceLabel),
  },
  {
    id: 'pet',
    tableNames: ['Pet', 'DiceOption', 'PetRegion', 'Option'],
    Panel: PetPanel,
    lines: (values, tables) => petLines(values, tables, sourceLabel),
  },
  {
    id: 'mine',
    tableNames: [],
    Panel: MinePanel,
    lines: (values) => mineLines(values, sourceLabel),
  },
];
