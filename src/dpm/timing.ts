/** 입력값 전체 → DPM 시간 주기 (게임초 · 실제 초). 능력치는 계산기 탭 줄 합계 (전투 중 최대 상태 포함) 그대로 */
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { combineLines } from '@/calc/combine';
import { heroFirstRow, slotHeroName } from '@/calc/sources/hero/character';
import { rosterAwakenField } from '@/calc/sources/hero/rosterFields';
import { attackSpeedPercent, combinedSum, doubleAttackPercent } from '@/calc/sources/masteryRuneBuff/buff';
import {
  SKILL_EQUIP_SLOT_NUMBERS,
  hasEquippedActiveSkill,
  skillCoolOptionSeconds,
  skillEquipField,
  skillLevel,
  skillOptionSum,
  skillPerkCoolSeconds,
  skillRows,
} from '@/calc/sources/skill/skill';
import { expandedTabLines } from '@/calc/tabLines';
import { CALC_TABS } from '@/calc/tabs';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { attackAnimationSeconds, normalAttackGameSeconds } from '@/dpm/attackCycle';
import { buffProcGameSeconds, buffSkillCooldownGameSeconds } from '@/dpm/buffSkillCycle';
import { CONSTS } from '@/CONSTS';
import { charSkillGameSeconds, charSkillRow } from '@/dpm/charSkillCycle';
import { gameSpeedMultiplier } from '@/dpm/gameSpeed';

const SKILL_COOL_REDUCTION_STAT = 'skillCoolReduction';
const BUFF_SKILL_TYPE = 'BuffSkill';
const { BUFF_DURATION_OPTION_TYPE, PROC_CHANCE_OPTION_TYPE } = CONSTS.skill;
const { BUFF_PROC } = CONSTS.dpm;

export interface SkillTiming {
  skillId: string;
  /** 발동 (대미지) 사이 평균 간격. 버프 스킬은 켜짐 주기가 아니라 켜진 동안 평타마다 굴리는 발동의 평균 간격 (buffSkillCycle.ts) */
  gameSeconds: number;
  realSeconds: number;
  /** 버프 스킬만: 켜짐 주기 (쿨타임, 게임초) */
  cooldownGameSeconds?: number;
}

export interface DpmTiming {
  gameSpeed: number;
  normalAttackGameSeconds: number;
  buffSkills: SkillTiming[];
  charSkill: SkillTiming | null;
}

export function dpmTiming(values: CalcValues, tables: StatTables): DpmTiming {
  const combined = combineLines(expandedTabLines(CALC_TABS, values, tables));
  const hero = heroFirstRow(tables, slotHeroName(values, tables));
  const attackSpeed = attackSpeedPercent(combined, hero, !hasEquippedActiveSkill(values, tables));
  const normalAttack = normalAttackGameSeconds({
    attackSpeedPercent: attackSpeed,
    doubleAttackPercent: doubleAttackPercent(combined, attackSpeed),
    animationSeconds: attackAnimationSeconds(hero?.charId ?? ''),
  });
  const gameSpeed = gameSpeedMultiplier(tables.Vip, Number(values[ACCOUNT_KEYS.vipLevel]) || 0);
  const coolReduction = combinedSum(combined, SKILL_COOL_REDUCTION_STAT);
  const rows = skillRows(tables);
  const buffSkills = SKILL_EQUIP_SLOT_NUMBERS.map((slot) => values[skillEquipField(slot)])
    .map((skillId) => rows.find((row) => row.skillId === skillId))
    .filter((row) => row && row.skillType === BUFF_SKILL_TYPE && skillLevel(values, row.skillId) > 0)
    .flatMap((row): SkillTiming[] => {
      const skillId = row!.skillId;
      const cooldownGameSeconds = buffSkillCooldownGameSeconds({
        coolTime: Number(row!.coolTime),
        optionSeconds: skillCoolOptionSeconds(values, tables, skillId) + skillPerkCoolSeconds(values, tables, skillId),
        coolReductionPercent: coolReduction,
      });
      const gameSeconds = buffProcGameSeconds({
        cooldownGameSeconds,
        durationGameSeconds: (Number(row!.buffDuration) || 0) + skillOptionSum(values, tables, skillId, BUFF_DURATION_OPTION_TYPE),
        chancePermille: (Number(row!.buffPer) || 0) + BUFF_PROC.OPTION_PERCENT_TO_PERMILLE * skillOptionSum(values, tables, skillId, PROC_CHANCE_OPTION_TYPE),
        normalAttackGameSeconds: normalAttack,
      });
      return gameSeconds === null ? [] : [{ skillId, gameSeconds, realSeconds: gameSeconds / gameSpeed, cooldownGameSeconds }];
    });
  const awakenLevel = hero ? Number(values[rosterAwakenField(hero.charId)]) || 0 : 0;
  const charRow = hero ? charSkillRow(tables.CharacterAwaken, tables.CharSkill, hero.charId, awakenLevel) : undefined;
  const charSeconds = charRow ? charSkillGameSeconds(charRow.buffDuration, charRow.buffPer, normalAttack) : null;
  return {
    gameSpeed,
    normalAttackGameSeconds: normalAttack,
    buffSkills,
    charSkill: charRow && charSeconds !== null ? { skillId: charRow.skillId, gameSeconds: charSeconds, realSeconds: charSeconds / gameSpeed } : null,
  };
}
