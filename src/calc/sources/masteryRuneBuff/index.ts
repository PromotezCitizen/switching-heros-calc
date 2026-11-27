/**
 * 특성·룬·베르 각성 세부·얼티밋 특성·버프 탭 묶음 (기존 stat-calc.html 내장 탭과 calcTabGroups 의 해당 줄들).
 * 줄 출처 글은 번역 파일 (src/i18n/calc/<탭 id>.ko.json) 에서 i18next 로 만든다.
 */
import i18next from 'i18next';
import { createElement, type ComponentType } from 'react';
import { CONSTS } from '@/CONSTS';
import AwakenDetailPanel from '@/calc/panels/AwakenDetailPanel';
import BuffPanel from '@/calc/panels/BuffPanel';
import MasteryPanel from '@/calc/panels/MasteryPanel';
import RunePanel from '@/calc/panels/RunePanel';
import type { StatTables } from '@/data/statTables';
import { combineLines, type Line } from '@/calc/combine';
import type { CalcTab, CalcValues, TabPanelProps } from '@/calc/types';
import { cardStackLines, stickerShapeCounts } from '@/calc/sources/heroWeaponCardPet/card';
import {
  equippedSkillPerkCount,
  equippedSkillTypeCounts,
  hasEquippedActiveSkill,
  skillOptionLines,
} from '@/calc/sources/skill/skill';
import { awakenDetailLines } from '@/calc/sources/masteryRuneBuff/awakenDetail';
import { battleDamageLines, chancesWithBattleState } from '@/calc/sources/masteryRuneBuff/battleState';
import { summaryTarget } from '@/calc/sources/summary/summary';
import {
  buffLines,
  combinedSum,
  exclusiveStackBuffLines,
  finalAttackMultiplierLines,
  normalMonsterFoodLines,
  attackEventBuffLines,
  onAttackBuffLines,
  stackLines,
  superCriticalStrikeLines,
} from '@/calc/sources/masteryRuneBuff/buff';
import {
  exclusiveBattleLines,
  figureBattleLines,
  magicGuardLines,
  switchingBoostLines,
} from '@/calc/sources/masteryRuneBuff/battleEffects';
import { chanceUltimateLines } from '@/calc/sources/masteryRuneBuff/chances';
import { masteryLines } from '@/calc/sources/masteryRuneBuff/mastery';
import { runeLabLines, runeLines } from '@/calc/sources/masteryRuneBuff/rune';
import type { SourceLabel } from '@/calc/sources/masteryRuneBuff/sourceLabel';
import {
  equippedPetIds,
  formationHeroAttributes,
  formationHeroGenders,
  slotHeroTargetUnit,
  ultimateLines,
} from '@/calc/sources/masteryRuneBuff/ultimate';
import { equippedWeaponStarSum } from '@/calc/sources/masteryRuneBuff/weaponStarSum';
import { petRegionLevelField, petRegionUnlocked } from '@/calc/sources/heroWeaponCardPet/pet';
import { bookLevelField } from '@/calc/sources/heroWeaponCardPet/library';
import { runeLabUnlocked } from '@/calc/sources/masteryRuneBuff/rune';

/** 개수 얼티밋 (아티팩트 칸 레벨 합, 전용 무기 클리어 미션 수, 펫 지역 레벨, 룬 미지의 비석 레벨, 책 레벨) 에 넘기는 값 */
function ultimateCountContext(values: CalcValues, tables: StatTables) {
  const { TRANS_MISSION_FIELDS, RUNE_STONE_LEVEL_FIELD } = CONSTS.masteryRuneBuff;
  const numberOf = (field: string) => Math.max(Number(values[field]) || 0, 0);
  const regionOpen = petRegionUnlocked(values, tables);
  return {
    artifactSlotLevelSum: CONSTS.dimensionStone.PARTS.reduce(
      (sum, part) => sum + numberOf(CONSTS.dimensionStone.LEVEL_KEY_PREFIX + part),
      0,
    ),
    // 계산하는 히어로 (1슬롯 칸, 교체 계산은 2슬롯 값이 1슬롯 칸으로 바뀌어 들어온다)
    transMissionCount: numberOf(TRANS_MISSION_FIELDS[0]),
    petRegionLevels: regionOpen
      ? Object.fromEntries(
          CONSTS.heroWeaponCardPet.pet.REGION.ATTRIBUTES.map((attribute: string) => [
            attribute,
            numberOf(petRegionLevelField(attribute)),
          ]),
        )
      : {},
    runeStoneLevel: runeLabUnlocked(values, tables) ? numberOf(RUNE_STONE_LEVEL_FIELD) : 0,
    libraryLevels: Object.fromEntries(CONSTS.heroWeaponCardPet.JOBS.map((job) => [job, numberOf(bookLevelField(job))])),
  };
}

const translateSource: SourceLabel = (translationKey, params) => i18next.t(translationKey, params ?? {});

/** 버프 탭을 뺀 모든 탭의 줄 (합산 직전 모양). 버프 탭이 연타·스킬 콤보 등 확률을 계산하는 데 쓴다 */
export type OtherTabLines = (values: CalcValues, tables: StatTables) => Line[];

/** 버프 패널에 다른 탭 줄을 모으는 함수를 넘긴다 (패널이 탭 목록을 import 하면 고리가 생김) */
function buffPanelWith(otherTabLines: OtherTabLines): ComponentType<TabPanelProps> {
  return function BuffTabPanel(props: TabPanelProps) {
    return createElement(BuffPanel, { ...props, otherTabLines });
  };
}

/** 특성 패널에 모든 탭 줄을 모으는 함수를 넘긴다 (툴팁의 "현재" 값용, 패널이 탭 목록을 import 하면 고리가 생김) */
function masteryPanelWith(allLines: OtherTabLines): ComponentType<TabPanelProps> {
  return function MasteryTabPanel(props: TabPanelProps) {
    return createElement(MasteryPanel, { ...props, traitLines: allLines });
  };
}

/**
 * 버프 탭 줄은 다른 탭 줄 (연타·공격속도·확률 합) 이 필요해서, 탭 목록 (tabs.ts) 이 그 줄을 모으는 함수와
 * 다른 탭들이 쓰는 표 이름 (otherTableNames) 을 넘긴다. 버프 탭은 그 표 전부 + 이 묶음 탭들의 표를 불러야 줄이 맞다
 */
export const masteryRuneBuffTabs = (
  otherTabLines: OtherTabLines,
  otherTableNames: readonly string[] = [],
): CalcTab[] => {
  const ownTabs: CalcTab[] = [
    {
      id: 'mastery',
      // 얼티밋 특성 줄도 특성 탭에서 만든다 (얼티밋은 특성 나무에서 켜고 끔, 따로 칸 없음). 펫·히어로·스킬 표는 얼티밋 개수용
      tableNames: ['Mastery', 'Pet', 'Character', CONSTS.skill.TABLE, 'WeaponChar', 'Card', 'CardStickerSet'],
      // 버프 탭 줄 (전투 조건 특성) 까지 모아 특성마다 지금 들어간 값을 보인다
      Panel: masteryPanelWith((values, tables) => [...otherTabLines(values, tables), ...buffTab.lines(values, tables)]),
      lines: (values, tables) => [
        ...(tables.Mastery
          ? masteryLines(
              values,
              tables.Mastery,
              translateSource,
              Number(values[CONSTS.masteryRuneBuff.SWAP_UPTIME_FIELD]) || 0,
            )
          : []),
        ...(tables.Mastery && tables.Pet
          ? ultimateLines(
              values,
              tables.Mastery,
              tables.Pet,
              equippedPetIds(values),
              translateSource,
              formationHeroGenders(values, tables),
              formationHeroAttributes(values, tables),
              {
                skillTypeCounts: equippedSkillTypeCounts(values, tables),
                targetUnit: slotHeroTargetUnit(values, tables),
                weaponStarSum: equippedWeaponStarSum(values, tables),
                alchemySameGradeCount: Number(values[CONSTS.masteryRuneBuff.ALCHEMY_SAME_GRADE_FIELD]) || 0,
                swapUptimePercent: Number(values[CONSTS.masteryRuneBuff.SWAP_UPTIME_FIELD]) || 0,
                stickerCounts: stickerShapeCounts(values, tables),
                skillPerkCount: equippedSkillPerkCount(values, tables),
                ...ultimateCountContext(values, tables),
              },
            ).lines
          : []),
      ],
    },
    {
      id: 'rune',
      tableNames: ['AttributeRune', CONSTS.masteryRuneBuff.LAB.TABLE],
      Panel: RunePanel,
      lines: (values, tables) => [
        ...(tables.AttributeRune ? runeLines(values, tables.AttributeRune, translateSource) : []),
        ...runeLabLines(values, tables, translateSource),
      ],
    },
    {
      id: 'awakenDetail',
      tableNames: ['Awaken'],
      Panel: AwakenDetailPanel,
      lines: (values, tables) => awakenDetailLines(values, tables, translateSource),
    },
  ];
  // 스킬 옵션 표 · 옵션 칸 수 (Option) 는 고른 스킬 옵션 줄 (skillOptionLines) 용
  const buffTableNames = [
    ...new Set([
      'Mastery',
      ...ownTabs.flatMap((tab) => tab.tableNames),
      CONSTS.skill.RUNE_TABLE,
      CONSTS.skill.SLOT_CONDITION_TABLE,
      ...otherTableNames,
    ]),
  ];
  const buffTab: CalcTab = {
    id: 'buff',
    tableNames: buffTableNames,
    Panel: buffPanelWith(otherTabLines),
    lines: (values, tables) => {
      // 음식 효과·공격력 이벤트 버프·최종 공격력 ×5 는 특성 표 없이도 줄이 된다
      const foodLines = [
        ...normalMonsterFoodLines(values, translateSource),
        ...attackEventBuffLines(values, translateSource),
      ];
      const multiplierLines = [
        ...exclusiveStackBuffLines(values, translateSource, tables),
        ...finalAttackMultiplierLines(values, translateSource, tables),
      ];
      // 다발 화살 252 등 스킬 옵션의 공격력 % (고른 옵션, 장착했을 때 최고 값 × 최대 중첩) 도 전투 중 몫이라 버프 탭 줄이다
      const optionLines = skillOptionLines(values, tables, translateSource);
      if (!tables.Mastery) return [...foodLines, ...multiplierLines, ...optionLines];
      const otherLines = otherTabLines(values, tables);
      // 전투 중 최대 상태 공격속도·치명타 확률·치명타 데미지 줄이 연타·슈퍼 치명타 단계 계산에 먼저 들어간다
      const { chances, battleLines } = chancesWithBattleState(
        otherLines,
        values,
        tables,
        tables.Mastery,
        translateSource,
      );
      // 매직 가드 기본 항 (0x105) 이 0 이면 게임은 보호막을 만들지 않고 매직 가드 효과를 모두 건너뛴다 (consts MAGIC_GUARD)
      const magicGuardOn = combinedSum(combineLines(otherLines), CONSTS.masteryRuneBuff.MAGIC_GUARD.BASE_STAT) !== 0;
      return [
        ...battleLines,
        ...buffLines(values, tables.Mastery, translateSource, chances.doubleAttack),
        ...stackLines(values, tables.Mastery, translateSource, chances.doubleAttack, chances.skillCombo),
        ...battleDamageLines(
          values,
          tables.Mastery,
          translateSource,
          chances,
          magicGuardOn,
          hasEquippedActiveSkill(values, tables),
        ),
        // 카드 2번·3번 전투 중 중첩 (최대 5중첩): 다른 탭 줄에 남아 있는 카드 줄에서 읽는다. 처치 중첩은 일반 몬스터 대상에서만 쌓인다
        ...cardStackLines(otherLines, translateSource, summaryTarget(values)),
        ...chanceUltimateLines(values, tables.Mastery, chances, translateSource, magicGuardOn),
        ...magicGuardLines(values, tables, tables.Mastery, chances, magicGuardOn, translateSource),
        ...switchingBoostLines(values, tables, tables.Mastery, chances, translateSource),
        // 피규어 조건형 효과 (확률 200% 초과 · 교체 등장 10초 · 기본 공격): 다른 탭 줄에 남은 피규어 원래 이름 줄에서 읽는다
        ...figureBattleLines(otherLines, values, tables, chances, magicGuardOn, translateSource),
        ...exclusiveBattleLines(values, tables, translateSource),
        ...superCriticalStrikeLines(values, tables.Mastery, translateSource, chances.superCritical),
        ...onAttackBuffLines(otherLines, summaryTarget(values), translateSource),
        ...optionLines,
        ...multiplierLines,
        ...foodLines,
      ];
    },
  };
  // 특성 패널은 버프 탭 줄도 계산하므로 버프 탭과 같은 표를 불러온다
  const [masteryTab, ...restTabs] = ownTabs;
  return [{ ...masteryTab, tableNames: buffTableNames }, ...restTabs, buffTab];
};
