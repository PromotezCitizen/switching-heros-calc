/**
 * 특성·룬·베르 각성 세부·얼티밋 특성·버프 탭 묶음 (기존 stat-calc.html 내장 탭과 calcTabGroups 의 해당 줄들).
 * 줄 출처 글은 번역 파일 (src/i18n/calc/<탭 id>.ko.json) 에서 i18next 로 만든다.
 */
import i18next from 'i18next';
import { createElement, type ComponentType } from 'react';
import { CONSTS } from '../../../CONSTS';
import AwakenDetailPanel from '../../panels/AwakenDetailPanel';
import BuffPanel from '../../panels/BuffPanel';
import MasteryPanel from '../../panels/MasteryPanel';
import RunePanel from '../../panels/RunePanel';
import type { StatTables } from '../../../data/statTables';
import type { Line } from '../../combine';
import type { CalcTab, CalcValues, TabPanelProps } from '../../types';
import { cardStackLines } from '../heroWeaponCardPet/card';
import { equippedSkillTypeCounts, skillOptionLines } from '../skill/skill';
import { awakenDetailLines } from './awakenDetail';
import { battleDamageLines, chancesWithBattleState } from './battleState';
import { summaryTarget } from '../summary/summary';
import {
  buffLines,
  exclusiveStackBuffLines,
  finalAttackMultiplierLines,
  normalMonsterFoodLines,
  attackEventBuffLines,
  onAttackBuffLines,
  stackLines,
  superCriticalStrikeLines,
} from './buff';
import { chanceUltimateLines } from './chances';
import { masteryLines } from './mastery';
import { runeLabLines, runeLines } from './rune';
import type { SourceLabel } from './sourceLabel';
import {
  equippedPetIds,
  formationHeroAttributes,
  formationHeroGenders,
  slotHeroTargetUnit,
  ultimateLines,
} from './ultimate';

const translateSource: SourceLabel = (translationKey, params) => i18next.t(translationKey, params ?? {});

/** 버프 탭을 뺀 모든 탭의 줄 (합산 직전 모양). 버프 탭이 연타·스킬 콤보 등 확률을 계산하는 데 쓴다 */
export type OtherTabLines = (values: CalcValues, tables: StatTables) => Line[];

/** 버프 패널에 다른 탭 줄을 모으는 함수를 넘긴다 (패널이 탭 목록을 import 하면 고리가 생김) */
function buffPanelWith(otherTabLines: OtherTabLines): ComponentType<TabPanelProps> {
  return function BuffTabPanel(props: TabPanelProps) {
    return createElement(BuffPanel, { ...props, otherTabLines });
  };
}

/**
 * 버프 탭 줄은 다른 탭 줄 (연타·공격속도·확률 합) 이 필요해서, 탭 목록 (tabs.ts) 이 그 줄을 모으는 함수와
 * 다른 탭들이 쓰는 표 이름 (otherTableNames) 을 넘긴다. 버프 탭은 그 표 전부 + 이 묶음 탭들의 표를 불러야 줄이 맞다
 */
export const masteryRuneBuffTabs = (otherTabLines: OtherTabLines, otherTableNames: readonly string[] = []): CalcTab[] => {
  const ownTabs: CalcTab[] = [
    {
      id: 'mastery',
      // 얼티밋 특성 줄도 특성 탭에서 만든다 (얼티밋은 특성 나무에서 켜고 끔, 따로 칸 없음). 펫·히어로·스킬 표는 얼티밋 개수용
      tableNames: ['Mastery', 'Pet', 'Character', CONSTS.skill.TABLE],
      Panel: MasteryPanel,
      lines: (values, tables) => [
        ...(tables.Mastery ? masteryLines(values, tables.Mastery, translateSource) : []),
        ...(tables.Mastery && tables.Pet
          ? ultimateLines(
              values,
              tables.Mastery,
              tables.Pet,
              equippedPetIds(values),
              translateSource,
              formationHeroGenders(values, tables),
              formationHeroAttributes(values, tables),
              { skillTypeCounts: equippedSkillTypeCounts(values, tables), targetUnit: slotHeroTargetUnit(values, tables) },
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
  const buffTableNames = [...new Set(['Mastery', ...ownTabs.flatMap((tab) => tab.tableNames), ...otherTableNames])];
  return [
    ...ownTabs,
    {
      id: 'buff',
      tableNames: buffTableNames,
      Panel: buffPanelWith(otherTabLines),
      lines: (values, tables) => {
        // 음식 효과·공격력 이벤트 버프·최종 공격력 ×5 는 특성 표 없이도 줄이 된다
        const foodLines = [...normalMonsterFoodLines(values, translateSource), ...attackEventBuffLines(values, translateSource)];
        const multiplierLines = [
          ...exclusiveStackBuffLines(values, translateSource, tables),
          ...finalAttackMultiplierLines(values, translateSource, tables),
        ];
        // 다발 화살 252 옵션 (적중마다 공격력 % 최대 5중첩) 도 전투 중 몫이라 버프 탭 줄이다
        const optionLines = skillOptionLines(values, translateSource);
        if (!tables.Mastery) return [...foodLines, ...multiplierLines, ...optionLines];
        const otherLines = otherTabLines(values, tables);
        // 전투 중 최대 상태 공격속도·치명타 확률·치명타 데미지 줄이 연타·슈퍼 치명타 단계 계산에 먼저 들어간다
        const { chances, battleLines } = chancesWithBattleState(otherLines, values, tables, tables.Mastery, translateSource);
        return [
          ...battleLines,
          ...buffLines(values, tables.Mastery, translateSource, chances.doubleAttack),
          ...stackLines(values, tables.Mastery, translateSource, chances.doubleAttack, chances.skillCombo),
          ...battleDamageLines(values, tables.Mastery, translateSource, chances),
          // 카드 2번·3번 전투 중 중첩 (최대 5중첩): 다른 탭 줄에 남아 있는 카드 줄에서 읽는다
          ...cardStackLines(otherLines, translateSource),
          ...chanceUltimateLines(values, tables.Mastery, chances, translateSource),
          ...superCriticalStrikeLines(values, tables.Mastery, translateSource, chances.superCritical),
          ...onAttackBuffLines(otherLines, summaryTarget(values), translateSource),
          ...optionLines,
          ...multiplierLines,
          ...foodLines,
        ];
      },
    },
  ];
};
