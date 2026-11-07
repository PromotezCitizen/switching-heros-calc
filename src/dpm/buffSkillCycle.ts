/**
 * 버프 스킬 (claude-docs/react-port/job-skills-buff-2026-11-05.md 1절, 게임 코드 확정):
 * - 쿨타임마다 "켜짐" 만 된다 (대미지 없음, m5431). 쿨타임 = (표 coolTime − 고른 스킬 옵션 "스킬 쿨타임 {0}초 감소" 최고 등급 값) × (1 − skillCoolReduction / 100).
 *   10-18 의 4.94초는 이 쿨타임 (게임 속도 1.3 으로 실제 초) 이다 (사용자 확인 2026-11-05: "쿨타임 감소 + 1.3배 -> 4.94").
 * - 켜져 있는 동안 (지속 = buffDuration + 옵션 "버프 지속 시간 {0}초 증가") 평타 적중마다 발동을 굴린다 (m5433 @2fe5bec):
 *   0~999 난수 r, c = buffPer (천분율) + 10 × 옵션 "스킬 발동 확률 {0}% 증가", c ≥ r 이면 발동 → 확률 (min(floor(c), 999) + 1) / 1000.
 * - 발동 확률은 확률 능력치가 아니라 기댓값으로 센다 (사용자 지적 2026-11-05 "내가 스킬까지 적용하라고 했나?").
 * 넣지 못한 것: 문양 · 스탯 0x22 의 확률 보정, 스탯 0xb 의 지속 보정, 스탯 0x42 의 게이지 가속 (버프에도 붙음, 유력), 공격 잠금 · castRange 밖이면 발동 없음
 */
import { CONSTS } from '@/CONSTS';

const { PERCENT_DIVISOR, BUFF_PROC } = CONSTS.dpm;

export interface BuffCooldownInput {
  coolTime: number;
  /** 고른 쿨타임 감소 옵션의 합 (초, skillCoolOptionSeconds) */
  optionSeconds: number;
  coolReductionPercent: number;
}

export function buffSkillCooldownGameSeconds({ coolTime, optionSeconds, coolReductionPercent }: BuffCooldownInput): number {
  return Math.max(coolTime - optionSeconds, 0) * (1 - coolReductionPercent / PERCENT_DIVISOR);
}

export interface BuffProcInput {
  /** 켜짐 주기 (게임초, buffSkillCooldownGameSeconds) */
  cooldownGameSeconds: number;
  /** 켜짐 지속 (게임초) = buffDuration + 지속 증가 옵션 */
  durationGameSeconds: number;
  /** 발동 판정 확률 c (천분율) = buffPer + 10 × 발동 확률 증가 옵션 */
  chancePermille: number;
  /** 평타 한 번의 간격 (게임초) = 발동을 굴리는 간격 */
  normalAttackGameSeconds: number;
}

/** 판정 한 번의 발동 확률 (0 ~ 1) */
export function buffProcChance(chancePermille: number): number {
  if (!(chancePermille >= 0)) return 0;
  return (Math.min(Math.floor(chancePermille), BUFF_PROC.ROLL_MAX) + 1) / BUFF_PROC.ROLL_RANGE;
}

/** 켜져 있는 시간 비율: 쿨타임이 지속보다 짧으면 늘 켜짐, 아니면 지속 / 쿨타임 */
export function buffActiveShare(cooldownGameSeconds: number, durationGameSeconds: number): number {
  if (!(durationGameSeconds > 0)) return 0;
  if (!(cooldownGameSeconds > durationGameSeconds)) return 1;
  return durationGameSeconds / cooldownGameSeconds;
}

/** 발동 사이 평균 간격 (게임초). 발동하지 않으면 null */
export function buffProcGameSeconds({ cooldownGameSeconds, durationGameSeconds, chancePermille, normalAttackGameSeconds }: BuffProcInput): number | null {
  if (!(normalAttackGameSeconds > 0)) return null;
  const procsPerGameSecond = (buffActiveShare(cooldownGameSeconds, durationGameSeconds) * buffProcChance(chancePermille)) / normalAttackGameSeconds;
  return procsPerGameSecond > 0 ? 1 / procsPerGameSecond : null;
}
