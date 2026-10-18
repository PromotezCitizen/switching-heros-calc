/** 일반 공격 주기 (게임 코드 확정, claude-docs/react-port/attack-cycle.md 6절): 애니메이션이 0.02초 틱 단위라 주기가 틱 수로 올림된다 */
import { CONSTS } from '@/CONSTS';

const { TICK_SECONDS, ATTACK_SPEED_LIMIT, DOUBLE_ATTACK_SPEED_FACTOR, ATTACK_ANIMATION_SECONDS, PERCENT_DIVISOR } = CONSTS.dpm;

export interface AttackCycleInput {
  attackSpeedPercent: number;
  doubleAttackPercent: number;
  animationSeconds: number;
}

/** 히어로 charId → 공격 애니메이션 길이 (게임초) */
export function attackAnimationSeconds(charId: string): number {
  return ATTACK_ANIMATION_SECONDS[charId] ?? ATTACK_ANIMATION_SECONDS.default;
}

/** 배속 v 로 애니메이션 한 번이 걸리는 틱 수 */
function animationTicks(animationSeconds: number, speed: number): number {
  return Math.ceil(animationSeconds / (TICK_SECONDS * speed) - 1e-9);
}

/**
 * 일반 공격 1번 평균 게임 시간 = 0.02 × [p × n(2S) + (1 − p) × n(S)].
 * S = min(공격속도, 350) / 100, p = min(연타, 100) / 100. 연타는 attack1 을 2S 배속으로 다시 재생 (적중 1번 = 일반 공격 1번)
 */
export function normalAttackGameSeconds({ attackSpeedPercent, doubleAttackPercent, animationSeconds }: AttackCycleInput): number {
  const speed = Math.min(attackSpeedPercent, ATTACK_SPEED_LIMIT) / PERCENT_DIVISOR;
  const chance = Math.min(Math.max(doubleAttackPercent, 0), PERCENT_DIVISOR) / PERCENT_DIVISOR;
  const doubleTicks = animationTicks(animationSeconds, speed * DOUBLE_ATTACK_SPEED_FACTOR);
  const normalTicks = animationTicks(animationSeconds, speed);
  return TICK_SECONDS * (chance * doubleTicks + (1 - chance) * normalTicks);
}
