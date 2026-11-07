/**
 * 캐릭터 각성 탭: 히어로 선택 · 1슬롯 등급·성 · 캐릭터 각성 단계 · 기본값 확인.
 * 효과 줄 = 1슬롯 히어로 기본 공격속도·기본 치명타 확률·치명타 데미지 (character.ts, 치명타 둘은 게임 코드의 기본 상수) + 캐릭터 각성 한 줄 (계산은 textLines/other.ts heroAwakenLines).
 * 히어로 이름은 다른 탭도 읽는다
 */
import i18next from 'i18next';
import { CONSTS } from '@/CONSTS';
import { heroAwakenLines } from '@/calc/sources/textLines/other';
import { heroBaseAttackSpeedLines, heroBaseCriticalLines } from '@/calc/sources/hero/character';
import type { CalcTab } from '@/calc/types';
import { HeroRosterPanel } from '@/calc/panels/RosterPanels';
import HeroPanel from '@/calc/sources/hero/HeroPanel';

export { awakenFinalCheck, awakenGradeChoices, awakenStages, awakenStarChoices, selectedAwakenChoice, selectedAwakenStage } from '@/calc/sources/hero/awaken';
export type { AwakenFinalCheckRow, AwakenStage } from '@/calc/sources/hero/awaken';
export { baseCheck } from '@/calc/sources/hero/baseCheck';
export type { BaseCheckRow } from '@/calc/sources/hero/baseCheck';
export {
  characterBase,
  characterRows,
  classHpLog,
  classHpStats,
  heroBase,
  heroBaseAttackSpeedLines,
  heroBaseCriticalLines,
  heroFirstRow,
  heroGradeChoices,
  heroNames,
  heroRows,
  heroStarChoices,
  resolveChoice,
  selectedHero,
} from '@/calc/sources/hero/character';
export type { HeroBase, HeroSelection } from '@/calc/sources/hero/character';

/** WeaponChar = 1슬롯 히어로에게 전용 무기가 있는지 (전용 무기 장착 켬/끔 칸) */
const HERO_TABLE_NAMES: readonly string[] = [CONSTS.hero.TABLES.CHARACTER, CONSTS.hero.TABLES.HERO_AWAKEN, 'WeaponChar'];

export const heroTabs: CalcTab[] = [
  {
    id: 'hero',
    tableNames: HERO_TABLE_NAMES,
    Panel: HeroPanel,
    lines: (values, tables) => {
      const sourceLabel = (key: string, params?: Record<string, string | number>) => i18next.t(key, params ?? {});
      return [
        ...heroBaseAttackSpeedLines(values, tables, sourceLabel),
        ...heroBaseCriticalLines(values, tables, sourceLabel),
        ...heroAwakenLines(values, tables, sourceLabel),
      ];
    },
  },
  // 히어로 · 전용 무기 표 (한 탭): 줄은 만들지 않는다 (1슬롯 히어로·전용 무기·유물 연동이 이 값을 읽음)
  {
    id: 'heroRoster',
    tableNames: [CONSTS.hero.TABLES.CHARACTER, 'WeaponChar', 'DiceOption'],
    Panel: HeroRosterPanel,
    lines: () => [],
  },
];
