import coreMasteryTable from '@/test/legacyTables/CoreMastery.json';
import diaryStatTable from '@/test/legacyTables/DiaryStat.json';
import diceOptionTable from '@/test/legacyTables/DiceOption.json';
import figureStatTable from '@/test/legacyTables/FigureStat.json';
import petRegionTable from '@/test/legacyTables/PetRegion.json';
import type { StatTables } from '@/data/statTables';

/**
 * 5.70 수치표 갱신 전 (서버 표 5.5대) 의 값. 옛 게임 화면 (01:54 · 02:13 · 02:48 계정) 과 대조하는 시험은 그 화면이 찍힌 때의 표 값으로만 맞으므로,
 * 이 5개 표만 옛 값으로 덮어 쓴다 (public/data/tables 는 5.70 앱 내장 값으로 갱신됨)
 */
export const LEGACY_TABLES = {
  CoreMastery: coreMasteryTable,
  DiaryStat: diaryStatTable,
  DiceOption: diceOptionTable,
  FigureStat: figureStatTable,
  PetRegion: petRegionTable,
} as unknown as StatTables;
