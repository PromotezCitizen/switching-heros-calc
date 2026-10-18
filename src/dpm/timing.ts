/** 입력값 전체 → DPM 시간 주기 (게임초 · 실제 초). 능력치는 계산기 탭 줄 합계 (전투 중 최대 상태 포함) 그대로 */
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { combineLines } from '@/calc/combine';
import { heroFirstRow, slotHeroName } from '@/calc/sources/hero/character';
import { rosterAwakenField } from '@/calc/sources/hero/rosterFields';
import { attackSpeedPercent, combinedSum, doubleAttackPercent } from '@/calc/sources/masteryRuneBuff/buff';
import { SKILL_EQUIP_SLOT_NUMBERS, hasEquippedActiveSkill, skillEquipField, skillLevel, skillRows } from '@/calc/sources/skill/skill';
import { expandedTabLines } from '@/calc/tabLines';
import { CALC_TABS } from '@/calc/tabs';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { attackAnimationSeconds, normalAttackGameSeconds } from '@/dpm/attackCycle';
import { buffSkillCooldownGameSeconds, coolOptionSeconds } from '@/dpm/buffSkillCycle';
import { charSkillGameSeconds, charSkillRow } from '@/dpm/charSkillCycle';
import { gameSpeedMultiplier } from '@/dpm/gameSpeed';

const SKILL_COOL_REDUCTION_STAT = 'skillCoolReduction';
const BUFF_SKILL_TYPE = 'BuffSkill';

export interface SkillTiming {
  skillId: string;
  gameSeconds: number;
  realSeconds: number;
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
    .map((row) => {
      const gameSeconds = buffSkillCooldownGameSeconds({
        coolTime: Number(row!.coolTime),
        optionSeconds: coolOptionSeconds(tables.SkillCoolOption, row!.skillId),
        coolReductionPercent: coolReduction,
      });
      return { skillId: row!.skillId, gameSeconds, realSeconds: gameSeconds / gameSpeed };
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
