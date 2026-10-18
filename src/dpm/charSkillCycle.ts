/**
 * 전용 스킬 행 = 히어로 각성 표 (CharacterAwaken) 의 charSkillId (각성 레벨 이하에서 마지막으로 나온 값).
 * 발동 조건 종류 = 행 buffDuration (char_skill_desc_1~4), 1 = 일반 공격 buffPer 번마다 (T436 m2495 카운터, 코드 확정)
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type RawTable, type TableRow } from '@/data/statTables';

const { CHAR_SKILL_TRIGGER_NORMAL_ATTACK } = CONSTS.dpm;

export function charSkillRow(
  awakenTable: RawTable | undefined,
  charSkillTable: RawTable | undefined,
  charId: string,
  awakenLevel: number,
): TableRow | undefined {
  if (!awakenTable || !charSkillTable) return undefined;
  const skillId = tableRows(awakenTable)
    .filter((row) => row.charId === charId && Number(row.lv) <= awakenLevel && row.charSkillId)
    .sort((left, right) => Number(left.lv) - Number(right.lv))
    .at(-1)?.charSkillId;
  return skillId ? tableRows(charSkillTable).find((row) => row.skillId === skillId) : undefined;
}

/** 전용 스킬 주기 (게임초). 조건이 일반 공격 횟수가 아니면 null (다른 조건은 다음 계획) */
export function charSkillGameSeconds(triggerKind: string, triggerCount: string, normalAttackSeconds: number): number | null {
  if (triggerKind !== CHAR_SKILL_TRIGGER_NORMAL_ATTACK) return null;
  return Number(triggerCount) * normalAttackSeconds;
}
