/** 종합 탭 (프로필 창 줄마다 계산 값 · 화면 값 비교). CONSTS.summary 로 접근한다 */
export const SUMMARY_CONSTS = {
  /** 탭 id (번역 키 calc.summary, 하위 탭 묶음 id 도 같음) */
  TAB_ID: 'summary',
  /** 줄마다 화면 값을 넣는 칸 이름 = 이 글 + 줄 id (선택, 기본 빈칸) */
  SCREEN_FIELD_PREFIX: 'summaryScreen_',
  /** 공격 대상 칸 이름 (기본 빈칸 = DEFAULT_TARGET) */
  TARGET_FIELD: 'summaryTarget',
  /** 공격 대상 종류 (화면 순서) */
  TARGET_KINDS: ['normal', 'boss', 'hero'],
  /**
   * 대상 칸 처음 값 = 일반 몬스터. 게임 프로필 창의 공격력 증가는 일반 몬스터 기준으로 맞았다
   * (verify-2026-10-07-0248.md 3-1: 일반 −0.09, 보스 +0.98, 히어로 +1.09) → 화면 값 비교는 일반일 때 의미 있다
   */
  DEFAULT_TARGET: 'normal',
  /** 화면 값 소수 자리의 반 단위 (예: 1.6 → 0.05). 계산 값이 이 반올림 범위 안이면 같음 */
  ROUNDING_HALF: 0.5,
  /** 차이 배율을 일반 숫자로 보이는 범위 (log10 절댓값). 넘으면 게임 표기 */
  RATIO_PLAIN_MAX_LOG: 4,
  /** 일반 숫자로 보이는 차이 배율의 유효 숫자 수 */
  RATIO_SIGNIFICANT_DIGITS: 4,
  /** 슈퍼 치명타 초과분: 치명타 확률이 이 % 를 넘은 만큼 (특성 설명문, 저장 데이터 검증 96.37 일치) */
  SUPER_CRITICAL_RATE_THRESHOLD: 100,
  /** 슈퍼 치명타 초과분: 넘은 치명타 확률 이 % 마다 특성 값만큼 증가 */
  SUPER_CRITICAL_RATE_STEP: 10,
  /**
   * 치명타 데미지 화면 % = 합 계열 합 × 곱 계열 배율 ÷ 100 (앱 프로필 표시 식, gap-critdmg-normal.md 1-1).
   * ÷ 100 의 log10. 어디서 나누는지는 확인 못 함 (02:48 화면 105.81B% 와 숫자로 맞춘 값)
   */
  CRITICAL_DAMAGE_DIVISOR_LOG: 2,
  /**
   * 공격력 증가 화면 값 = 곱 누적값 M 그대로 (게임 프로필 창 m13384 가 곱 누적값을 % 값으로 바로 표시, x100 을 더 붙이지 않음).
   * 최종 공격력에는 S = 1 + M/100 으로 들어가므로 log(M) − 2 를 쓴다. 체력은 해당 없음 (체력 증가는 이전 식 그대로).
   * 근거: claude-docs/react-port/gap-atk-increase-provider.md 4-1, 6절
   */
  ATTACK_INCREASE_FINAL_OFFSET_LOG: 2,
  /** 종합 탭 "적 수 5 이상" 칸 이름 (켜짐 'true', 기본 빈칸 = 꺼짐). 켜면 카드 _MonsterCntLong 줄을 일반 스탯으로 합산 */
  ENEMY_COUNT_FIELD: 'summaryEnemyCountReached',
  /** 카드 _MonsterCntLong 효과가 켜지는 적 수 (유력, gap-atk-increase-provider.md 4-5. 화면 문구용) */
  ENEMY_COUNT_THRESHOLD: 5,
  /** 화면 값 칸 너비 (px) */
  SCREEN_INPUT_WIDTH: 130,
  /** 표가 이 폭보다 좁아지면 가로 스크롤 (px) */
  TABLE_MIN_WIDTH: 640,
  SUBTOTAL_TABLE_MIN_WIDTH: 360,

  /** 스탯 이름 (서버 표 그대로). 직업·속성 변형 = `_per_<직업>_<꼬리>` · `_per_<속성>Hero_<꼬리>` */
  STATS: {
    ATTACK_PERCENT: '_per_attackDamage',
    HP_PERCENT: '_per_hp',
    CRITICAL_DAMAGE: '_per_criticalDmg',
    /** 최종 공격력에 공격력 증가와 따로 곱하는 배수 (줄 값 5 = ×5, 버프 탭 줄) */
    FINAL_ATTACK_MULTIPLY: '_multiply_AttackDamage',
    /** 치명타 데미지 합 계열 (훈련·유물 등 더하는 줄, 기본값 줄 포함) */
    CRITICAL_DAMAGE_SUM: 'criticalDmg',
    /** 내 체력 70% 이상일 때 치명타 데미지 % (카드). 프로필은 체력 가득이라 늘 곱한다 (추정, gap-critdmg-normal.md 1-2) */
    CRITICAL_DAMAGE_MY_HP_70: '_per_criticalDmg_MyHp70Long',
    CRITICAL_RATE: 'criticalRate',
    SUPER_CRITICAL: 'superCritical',
    SUPER_CRITICAL_ADD: 'superCriticalAddPer',
    SUPER_CRITICAL_OVER: 'superCriticalOverPer',
    SPEAR_ATTACK: 'spearAttack',
    SPEAR_ATTACK_ADD: 'spearAttackAddPer',
    SWITCHING_BOOST: 'switchingBoost',
    SWITCHING_BOOST_ADD: 'switchingBoostAddPer',
    SKILL_COMBO: 'skillCombo',
    SKILL_COMBO_ADD: 'skillComboAddPer',
    SMITE: 'smite',
    SMITE_ADD: 'smiteAddPer',
    BARRIER: 'barrier',
    BARRIER_ADD: 'barrierAddVal',
  },
  /**
   * 성별 공격력 % (히어로 성별에 맞는 것만 공격력 증가에 들어감): Character 표 gender 1 = 남 → 0x1c2 `_per_Male_AttackDamage`,
   * 2 = 여 → 0x1c3 `_per_Female_AttackDamage` (묶음 A m2708 이 대상 유닛 성별이 1 / 2 일 때만 수용, 분기 확정 · 이름 대응 유력 —
   * atk-gap-remaining-scope.md 2절). 값은 영혼 단조 표의 두 이름 (SoulForge statType) 으로 들어옴
   */
  GENDER_ATTACK_STATS: {
    '1': '_per_Male_AttackDamage',
    '2': '_per_Female_AttackDamage',
  } as Record<string, string>,
  /** 직업·속성 변형 꼬리말 */
  VARIANT_SUFFIXES: {
    ATTACK: 'AttackDamage',
    CRITICAL_DAMAGE: 'CriticalDmg',
    CRITICAL_RATE: 'Critical',
  },
  /**
   * 공격 대상마다 갈리는 스탯 (서버 표 이름 그대로, 설명문 statDescriptions.json).
   * MONSTER_DAMAGE = "X 몬스터에게 주는 데미지 증가" (A 묶음 곱, damage-formula.md 2-2: 대상 종류 2 / 3 / 1 일 때),
   * MONSTER_DAMAGE_VARIANT_SUFFIX = 그 직업·속성 변형 꼬리말,
   * ON_ATTACK_* = "X 몬스터 공격시 5초간 ~" (카드 고유 효과·스티커 세트). 표에 없는 조합은 빈 목록.
   * 게임은 이 줄을 전투 버프로만 넣으므로 종합 줄 계산은 읽지 않고, 버프 탭 줄이 읽어 일반 스탯으로 바꿔 넣는다
   * (일반 몬스터 공격시 치명타 데미지 줄은 표에 없음)
   */
  TARGET_STATS: {
    normal: {
      MONSTER_DAMAGE: '_per_NormalMonsterDamage',
      MONSTER_DAMAGE_VARIANT_SUFFIX: 'NormalMonsterDamage',
      ON_ATTACK_ATTACK_PERCENT: ['_per_attackDamage_NormalAtk'],
      ON_ATTACK_CRITICAL_DAMAGE: [],
      ON_ATTACK_CRITICAL_RATE: ['criticalRate_normalMonsterAtk'],
      ON_ATTACK_ATTACK_SPEED: ['attackSpeed_normalMonsterAtk'],
    },
    boss: {
      MONSTER_DAMAGE: '_per_BossMonsterDamage',
      MONSTER_DAMAGE_VARIANT_SUFFIX: 'BossMonsterDamage',
      ON_ATTACK_ATTACK_PERCENT: ['_per_attackDamage_BossAtk'],
      ON_ATTACK_CRITICAL_DAMAGE: ['_per_criticalDmg_BossAtk'],
      ON_ATTACK_CRITICAL_RATE: ['criticalRate_BossAtk'],
      ON_ATTACK_ATTACK_SPEED: ['attackSpeed_BossAtk'],
    },
    hero: {
      MONSTER_DAMAGE: '_per_HeroMonsterDamage',
      MONSTER_DAMAGE_VARIANT_SUFFIX: 'HeroMonsterDamage',
      ON_ATTACK_ATTACK_PERCENT: ['_per_attackDamage_HeroAtk'],
      ON_ATTACK_CRITICAL_DAMAGE: ['_per_criticalDmg_HeroAtk'],
      ON_ATTACK_CRITICAL_RATE: ['criticalRate_HeroAtk'],
      ON_ATTACK_ATTACK_SPEED: ['attackSpeed_HeroAtk'],
    },
  },
  /** 속성 변형 이름 = 속성 + 이 글 (예: WaterHero) */
  ATTRIBUTE_HERO_SUFFIX: 'Hero',
  PER_PREFIX: '_per_',
} as const;
