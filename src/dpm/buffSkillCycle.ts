/**
 * 버프 스킬은 쿨타임마다, 액티브 스킬을 쓰는 중이 아니면 바로 발동 (사용자 확인, 10-18 실측 4.94초).
 * 쿨타임 = (표 coolTime − 스킬 옵션 "스킬 쿨타임 {0}초 감소" 최고 등급) × (1 − skillCoolReduction / 100).
 * 시전 가속 (스탯 0x42) 은 버프 스킬에 안 붙는다 (stat-ids.md)
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type RawTable } from '@/data/statTables';

const { PERCENT_DIVISOR } = CONSTS.dpm;

export interface BuffCooldownInput {
  coolTime: number;
  optionSeconds: number;
  coolReductionPercent: number;
}

/** 스킬 옵션 쿨타임 초 감소 (최고 등급 SS). 옵션 행이 없으면 0 */
export function coolOptionSeconds(coolOptionTable: RawTable | undefined, skillId: string): number {
  if (!coolOptionTable) return 0;
  const row = tableRows(coolOptionTable).find((candidate) => candidate.skillId === skillId);
  return row ? Number(row.gradeSS) || 0 : 0;
}

export function buffSkillCooldownGameSeconds({ coolTime, optionSeconds, coolReductionPercent }: BuffCooldownInput): number {
  return Math.max(coolTime - optionSeconds, 0) * (1 - coolReductionPercent / PERCENT_DIVISOR);
}
