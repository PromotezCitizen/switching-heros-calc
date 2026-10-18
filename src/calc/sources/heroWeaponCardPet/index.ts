/** 히어로의 기록·무기·몬스터 카드·펫·광산 탭 목록 */
import i18n from 'i18next';
import CardPanel from '@/calc/panels/CardPanel';
import LibraryPanel from '@/calc/panels/LibraryPanel';
import MinePanel from '@/calc/panels/MinePanel';
import PetPanel from '@/calc/panels/PetPanel';
import SoulForgePanel from '@/calc/panels/SoulForgePanel';
import WeaponPanel from '@/calc/panels/WeaponPanel';
import type { CalcTab } from '@/calc/types';
import { cardLines } from '@/calc/sources/heroWeaponCardPet/card';
import { libraryLines } from '@/calc/sources/heroWeaponCardPet/library';
import { mineLines } from '@/calc/sources/heroWeaponCardPet/mine';
import { petLines } from '@/calc/sources/heroWeaponCardPet/pet';
import type { SourceLabel } from '@/calc/sources/heroWeaponCardPet/shared';
import { soulForgeLines, weaponLines } from '@/calc/sources/heroWeaponCardPet/weapon';

export { cardCountsByGrade, cardSlotGradeStars, cardStackLines, countExpandedLines, sssCardCount } from '@/calc/sources/heroWeaponCardPet/card';
export type { CardSlotGradeStar } from '@/calc/sources/heroWeaponCardPet/card';
export { equippedPetIds } from '@/calc/sources/heroWeaponCardPet/pet';

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
