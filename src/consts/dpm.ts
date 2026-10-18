/** DPM 시간 모델 상수 (claude-docs/react-port/attack-cycle.md, mastery-optimizer-design.md 4-1) */
export const DPM_CONSTS = {
  /** 고정 틱 (Time.fixedDeltaTime, 게임초). 공격 애니메이션은 틱 수로 올림 */
  TICK_SECONDS: 0.02,
  /** 공격 애니메이션 배속 상한 % (Option AttackSpeed_Limit) */
  ATTACK_SPEED_LIMIT: 350,
  /** 연타는 attack1 을 이 배수의 배속으로 다시 재생 */
  DOUBLE_ATTACK_SPEED_FACTOR: 2,
  /** 공격 애니메이션 (attack1·attack2) 길이, 게임초. 히어로 표 charId 별 (sprite-animation.md 2-3), 없으면 기본 */
  ATTACK_ANIMATION_SECONDS: { default: 0.866667, '100': 0.833333, '102': 0.8 } as Record<string, number>,
  /** 전용 스킬 발동 조건 종류 (스킬 표 buffDuration). 1 = 일반 공격 buffPer 번마다 */
  CHAR_SKILL_TRIGGER_NORMAL_ATTACK: '1',
  /** 스킬 옵션은 늘 최고 등급 (사용자 결정 2026-10-08) → 쿨타임 초 감소는 gradeSS */
  PERCENT_DIVISOR: 100,
} as const;
