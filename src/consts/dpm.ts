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
  PERCENT_DIVISOR: 100,
  /**
   * 교체 스킬 판정 구조 상수 (changeSkillHits.ts, 근거 문서는 그 파일 머리). ESTIMATE_CODE 는 추정한 몫 표시 (missing `<코드>:<행 번호>`)
   */
  CHANGE_SKILL: {
    ESTIMATE_CODE: 'estimate:changeSkillHits',
    UNSUPPORTED_CODE: 'unsupportedChangeSkill',
    FLOAT_EPSILON: 1e-9,
    LUNA_DASH: 1,
    LUNA_MOON_HITS: 4,
    LIN_AWAKEN_DRAGONS: 10,
    KAEL_HITS: 3,
    SHEN_MOVE_HITS: 3,
    MARI_BEAM_HITS: 10,
    ROCHA_HITS: 3,
    BONNIE_HITS_PER_TARGET: 2,
    ISAAC_JUMPS: 2,
    DAISY_SMALL_SPIDERS: 12,
    DAISY_BIG_SPIDERS: [3, 5] as readonly number[],
  },
  /** 일괄 계산 (batchRecommend.ts): 특성 추천은 2개씩, 카드 추천은 3개씩 동시에 (사용자 지시 2026-11-06) */
  BATCH: { MASTERY_LANES: 2, CARD_LANES: 3 },
  /** 버프 스킬 발동 판정 (m5433): 0 ~ 999 난수 (1000가지), 확률 c 는 천분율, 옵션 % 는 × 10 */
  BUFF_PROC: { ROLL_RANGE: 1000, ROLL_MAX: 999, OPTION_PERCENT_TO_PERMILLE: 10 },
  /** 공격 종류 (대미지 정보 info[0], damage-formula.md 1절) */
  ATTACK_KIND: { NORMAL: 0, BUFF: 1, ACTIVE: 2, CHAR: 4 },
  /** 대상별로 최종 대미지에 따로 곱하는 배수 (묶음 F, damage-formula.md 2-2). 일반 몬스터는 없음 */
  TARGET_MULTIPLY_STATS: {
    normal: [],
    boss: ['_multiply_BossMonsterDamage'],
    hero: ['_multiply_HeroMonsterDamage'],
  } as Record<string, readonly string[]>,
  /** 치명타 배수 = (C / 100) × D × S (1 + C/100 이 아님, damage-formula.md 2-4) */
  CRITICAL_DAMAGE_DIVISOR: 100,
  /** 확률 % 상한 (100 이상이면 늘 성공) */
  PROBABILITY_MAX: 100,
  /** 슈퍼 치명타 (super-critical-fields.md 3·4절): 성공 배수 10, 확률 10마다 거듭제곱, 치명 확률 100 초과분 10마다 */
  SUPER_CRITICAL: {
    BASE: 10,
    STEP: 10,
    RATE_THRESHOLD: 100,
    STATS: { BASE: 'superCritical', ADD: 'superCriticalAddPer', OVER: 'superCriticalOverPer', DAMAGE: '_per_superCriticalAddDmg' },
    /** 2단계 (슈프림 치명타): 성공 배수 10 × T (칸 대응 유력) */
    SUPREME: { BASE: 10, CHANCE: 'supremeCritical', DAMAGE: '_per_supremeCriticalDmgUp', OVER_TO_DAMAGE: 'supremeCriticalOverToDmg' },
  },
  /** 관통 (m2711): 성공 ×2 × (1 + addDmg/100)^floor(P/10) */
  SPEAR: { BASE: 2, STEP: 10, STATS: { BASE: 'spearAttack', ADD: 'spearAttackAddPer', DAMAGE: 'spearAttackAddDmg' } },
  /** 무자비 (m2712): 상태이상 ≥ 1 일 때만, 성공 ×(3 + addDmg/100), 상태이상 ≥ 2 이면 ×(1 + CC/100)^상태이상 수 */
  SMITE: { BASE: 3, CC_FROM_COUNT: 2, STATS: { BASE: 'smite', ADD: 'smiteAddPer', DAMAGE: 'smiteAddDmg', CC: 'smiteAddDmgCC' } },
  /**
   * 공격 종류별로 평타 기준 위에 더 곱하는 묶음 A 이름과 치명 C (합) · D (곱) 추가 (damage-formula.md 2-2: 조건 확정, 이름 유력).
   * JOB_VARIANT_SUFFIXES · ATTRIBUTE_VARIANT_SUFFIXES 는 _per_<직업>_<꼬리> · _per_<속성>Hero_<꼬리> 로 붙이는 꼬리 (어느 종류에 붙는지는 이름 뜻으로 넣은 추정)
   */
  /**
   * 공격 종류별로 묶음 A 에 더 곱하는 스탯 이름. `_per_skillDamage` 는 스킬 공격 전체 (묶음 A enum 0x8, damage-formula.md 2-2) 에 걸리는
   * 조건부 스킬 데미지: 계산기가 얼티밋 `_pow_skillDamage_Eq<속성>HeroCnt` (편성 속성 수 거듭제곱), `_per_skillDamage_EqSame/DiffAttHero` · 성별 쌍,
   * `_per_skillDamage_Dungeon*Record` 를 이 이름의 줄로 만든다 (stat-provider-formulas.md: 모두 0x8 로 들어감)
   */
  KIND_STATS: {
    buff: {
      ATTACK: ['_per_allSkillDamage', '_per_skillDamage', '_per_buffAndActiveDmg', '_per_BuffSkillDamage'],
      JOB_VARIANT_SUFFIXES: ['SkillDamage'],
      ATTRIBUTE_VARIANT_SUFFIXES: ['AllSkillDamage', 'JobSkillDamage'],
      CRITICAL_DAMAGE_SUM: ['criticalDmg_BuffAndActiveSkill'],
      CRITICAL_DAMAGE_MULTIPLY: ['_per_BuffSkillCriDmg'],
    },
    active: {
      ATTACK: ['_per_allSkillDamage', '_per_skillDamage', '_per_buffAndActiveDmg', '_per_ActiveSkillDamage'],
      JOB_VARIANT_SUFFIXES: ['SkillDamage'],
      ATTRIBUTE_VARIANT_SUFFIXES: ['AllSkillDamage', 'JobSkillDamage'],
      CRITICAL_DAMAGE_SUM: ['criticalDmg_BuffAndActiveSkill'],
      CRITICAL_DAMAGE_MULTIPLY: ['_per_ActiveSkillCriDmg'],
    },
    // 교체 스킬 (종류 3): 0x8 모든 스킬 · 0x5a 교체 스킬 데미지 · 직업 블록 끝 칸 (종류 ≠ 평타) · 속성 교체 스킬 데미지 · 0xc9 치명타 (damage-formula.md 2-2). 0x60 (이름 미상, 종류 3 · 4) 은 전용과 같이 빠짐
    swap: {
      ATTACK: ['_per_allSkillDamage', '_per_skillDamage', '_per_ChangeSkillDamage'],
      JOB_VARIANT_SUFFIXES: ['SkillDamage'],
      ATTRIBUTE_VARIANT_SUFFIXES: ['AllSkillDamage', 'ChangeSkillDamage'],
      CRITICAL_DAMAGE_SUM: ['criticalDmg_ChangeSkill'],
      CRITICAL_DAMAGE_MULTIPLY: [],
    },
    char: {
      ATTACK: ['_per_allSkillDamage', '_per_skillDamage', '_per_CharSkillDamage'],
      // 직업 스킬 데미지 (`_per_<직업>_SkillDamage`) 도 전용 스킬에 붙는다: 게임은 직업 블록 끝 칸을 "직업 일치 + 공격 종류 ≠ 평타" 면 곱한다
      // (battle-missing-effects-2026-11-01.md 1절, 조건은 기계어 · 이름은 길이로 붙인 유력. 예전에는 [] 라 에이카 유성에서 +2.004 빠짐)
      JOB_VARIANT_SUFFIXES: ['SkillDamage'],
      ATTRIBUTE_VARIANT_SUFFIXES: ['AllSkillDamage', 'CharSkillDamage'],
      CRITICAL_DAMAGE_SUM: ['criticalDmg_CharSkill'],
      CRITICAL_DAMAGE_MULTIPLY: [],
    },
  } as Record<string, { ATTACK: string[]; JOB_VARIANT_SUFFIXES: string[]; ATTRIBUTE_VARIANT_SUFFIXES: string[]; CRITICAL_DAMAGE_SUM: string[]; CRITICAL_DAMAGE_MULTIPLY: string[] }>,
  /**
   * 직업 스킬 한 발 계수 (damage-pipeline.md 3-3, catalog-skill-option.md): 옵션 종류 (SkillRune type) · 문양 종류 (SkillPerk perkType)
   */
  SKILL_COEFFICIENT: {
    /** 옵션 "스킬 데미지 {0}% 증가" */
    OPTION_SKILL_DAMAGE: '1',
    /** 옵션 "<속성> 속성 히어로가 스킬 사용 시 데미지 {0}% 증가": 1슬롯 히어로 속성 (Character.attribute) 과 같을 때만 */
    OPTION_ATTRIBUTE_DAMAGE: { '3': 'Fire', '4': 'Water', '5': 'Earth' } as Record<string, string>,
    /** 옵션 "일반 / 보스 몬스터에게 주는 데미지 {0}% 증가": 그 대상일 때만 */
    OPTION_TARGET_DAMAGE: { '6': 'normal', '7': 'boss' } as Record<string, string>,
    /** 옵션 "적중 대상이 1명일 경우, 데미지 {0}배 증가" */
    OPTION_SINGLE_TARGET: '8',
    SINGLE_TARGET_COUNT: 1,
    /** SS 세트 배수 (Skill 표 all_ss_stats_value, '_' 로 나눔): SS 옵션 n ≥ 이 수부터 값[n − 이 수] (m6580, 유력). 칸이 모자라면 마지막 값 (추정) */
    SS_SET_FROM_COUNT: 2,
    SS_SET_SEPARATOR: '_',
    /** 문양: 스킬 레벨 +val1 */
    PERK_SKILL_LEVEL: 'SkillLv',
    /** 문양: SS 세트 효과 val1 % 증가 */
    PERK_SET_VALUE: 'SetValue',
    /** 문양 대미지 × (1 + val1 / 100) */
    PERK_DAMAGE_VAL1: ['SkillDmg', 'SkillDmg2'],
    /** 문양 대미지 × (1 + val2 / 100) (앞 값은 확률 · 쿨타임 변화) */
    PERK_DAMAGE_VAL2: ['BuffPerUpAndSkillDmg', 'BuffPerDownAndSkillDmg', 'CoolTimeUpAndSkillDmg'],
    /** 문양 대미지 × (1 + 스킬 레벨 × val1 / 100) */
    PERK_DAMAGE_PER_LEVEL: ['SkillLvAndSkillDmg', 'SkillLvAndSkillDmg2'],
    /** 문양 대미지 × (1 + SS 옵션 수 × val1 / 100) */
    PERK_DAMAGE_PER_SS_OPTION: 'SsRuneAndSkillDmg',
  },
  /**
   * 궁수 스킬 적중 구조 (스킬 · 옵션 · 문양 문구 기준, 유력. damage-pipeline.md 부록, catalog-skill-option.md 3절).
   * 옵션 종류 = SkillRune type, 문양 = SkillPerk perkType. 값은 최고 등급 / 문양 val1~3
   */
  ARCHER_SKILLS: {
    MULTI_SHOT: '201',
    GUIDED_SHOT: '202',
    ARROW_RAIN: '203',
    LASER_SHOT: '204',
    SUMMON_ARROWS: '252',
    /**
     * 화살 폭격 (arrow-barrage-255.md 결론, skill-gaps-2026-11-05.md 2절): 묶음 value1 번 × 묶음마다 화살 9발 (문양 FocusShooting1 이면 5발, 계수 × (1 + val2/100))
     * × 화살 한 발이 맞히는 적 min(T, 10). 옵션 3000 피닉스 샷 추가 발동 (253 계수) 은 넣지 않음
     */
    ARROW_BARRAGE: '255',
    ARROW_BARRAGE_ARROWS: 9,
    ARROW_BARRAGE_FOCUS_ARROWS: 5,
    ARROW_BARRAGE_PERK: 'FocusShooting1',
    ARROW_BARRAGE_MAX_TARGETS: 10,
    /** 멀티샷: {0}% 확률로 2회 발사 · {0}% 확률로 화살 2개 추가 · 화살 50% 감소 대신 데미지 · 관통 안 함 대신 데미지 */
    MULTI_SHOT_TWICE: '2100',
    MULTI_SHOT_EXTRA_ARROWS: '2101',
    MULTI_SHOT_EXTRA_ARROW_COUNT: 2,
    MULTI_SHOT_HALF_ARROWS: '2102',
    HALF_ARROWS_FACTOR: 0.5,
    MULTI_SHOT_NO_PIERCE: '2103',
    /** 문양 MultiShot1: 스킬 발동마다 val2 초간 데미지 val1 % (최대 val3 중첩) → 전투 상태 최대 기준으로 val1 × val3 */
    MULTI_SHOT_PERK: 'MultiShot1',
    /** 유도 샷: 관통 안 함 대신 데미지 · {0}% 확률로 데미지 2배 */
    GUIDED_SHOT_NO_PIERCE: '2200',
    GUIDED_SHOT_DOUBLE: '2201',
    GUIDED_SHOT_PERK: 'GuideShot1',
    /** 화살비 문양 ArrowRain1: 데미지 val1 %, 횟수 + val2 */
    ARROW_RAIN_PERK: 'ArrowRain1',
    /** 레이저 샷: {0}% 확률로 작은 레이저 5개 추가 */
    LASER_SHOT_EXTRA: '2400',
    LASER_SHOT_EXTRA_COUNT: 5,
    /** 다발 화살: 화살 {0}개 추가 · 관통 안 함 대신 데미지, 문양 SummonShot1: 화살 val1 % 증가, 데미지 val2 % */
    SUMMON_ARROWS_EXTRA: '2700',
    SUMMON_ARROWS_NO_PIERCE: '2702',
    SUMMON_ARROWS_PERK: 'SummonShot1',
    /** 확률 옵션의 "2배" */
    DOUBLE_FACTOR: 2,
  },
  /**
   * 자동 교체 (2026-10-28 결정: 자동교체를 켠다): 1슬롯 · 2슬롯 히어로가 번갈아 필드에 선다.
   * 교체 간격과 상관없이 두 히어로가 필드에 서는 시간이 같으면 DPM 은 두 히어로 DPM 의 평균이다 (각 TIME_SHARE).
   * 교체 스킬 (Character 표 changeSkillId, 각성 11004 등) 은 ChangeSkill 표 (export_dpm_tables.py) 와 changeSkillHits.ts 로 계산한다
   */
  SWAP: {
    HERO_FIELDS: ['charName', 'charName2'],
    /** 1슬롯 · 2슬롯을 서로 바꾼 입력값임을 알리는 칸 (swapDamage.ts swappedHeroValues). 바뀐 입력값에서는 2슬롯 히어로가 전투를 먼저 시작한 히어로다 */
    SWAPPED_FIELD: 'swappedHeroSlots',
    /** 1슬롯 · 2슬롯 히어로 전용 무기의 SSS 옵션 수 (얼티밋 1020 · 1021, 교체 계산에서 서로 바꾼다) */
    SSS_OPTION_COUNT_FIELDS: ['weaponSssOptionCount', 'weaponSssOptionCount2'] as readonly string[],
    /** 2슬롯 히어로의 장착 스킬 칸 이름 앞부분 (저장 가져오기가 `skillEquip2_<칸>` 으로 채움) */
    SECOND_SKILL_EQUIP_PREFIX: 'skillEquip2_',
    EQUIPPED_FIELDS: ['exclusiveEquipped', 'exclusiveEquipped2'],
    /** 전용 무기 옵션 칸 (1슬롯 히어로: weaponOptionStat<n> · weaponOptionValue<n>) 의 2슬롯 히어로 몫 이름 (저장 가져오기가 채움) */
    OPTION_FIELD_PAIRS: [
      ['weaponOptionStat', 'weaponOption2Stat'],
      ['weaponOptionValue', 'weaponOption2Value'],
    ],
    OPTION_ROWS: 8,
    TIME_SHARE: 0.5,
    /**
     * 교체 게이지 (damage-pipeline.md 3절, T410 m2302): 최대 = Option hero_swap_cool (게임초), 시작 = Option hero_swap_init_cool % × 최대.
     * 게이지는 매 프레임 dt × (1 + 충전 속도 스탯 0xc7 / 100) 만큼 찬다 (0xc7 은 이름 미상이라 입력 · 기본 0). 키 문자열은 값이 맞는 것으로 짐작 (유력)
     */
    COOL_KEY: 'hero_swap_cool',
    INIT_COOL_KEY: 'hero_swap_init_cool',
    /**
     * 교체 등장 후 지속 효과 (얼티밋 `_per_스탯_HeroSwap`, "교체해 등장 시 20초간") 가 선행 조건이 만족된 뒤 켜진 시간 비율 (%).
     * 사용자 결정 (2026-10-28): "일정 시간 이후" · "다른 효과가 N초 적용된 이후" 같은 선행 조건을 뺀 나머지는 꼈을 때 100% 로 계산한다.
     * 이 효과의 선행 조건은 "교체 이후" (swapDamage.ts swapEffectUptimes 가 그 앞 구간을 뺀다)
     */
    HERO_SWAP_EFFECT_UPTIME_PERCENT: 100,
  },
  /**
   * 검사 스킬 10개의 시전 1번 적중 구조 (claude-docs/react-port/catalog-skill-hits.md 3절). 옵션 · 문양 번호는 그 문서 표기.
   * 판정 한 번 = 타격 상자가 겹친 적 모두에게 같은 계수 1번씩 (1-1절)
   */
  SWORDSMAN_SKILLS: {
    DASH: '1',
    TORNADO: '2',
    HORIZONTAL_SLASH: '3',
    VERTICAL_SLASH: '4',
    PHANTOM_SWORD: '5',
    MULTI_SLASH: '51',
    WHEEL_SLASH: '52',
    CROSS_SLASH: '53',
    CRESCENT: '54',
    LETHAL_SLASH: '55',
    /** 회오리 베기 옵션 202: 확률로 0.25초 뒤 회오리 1개 더 (m5703, skill-gaps-2026-11-05.md · job-skills-active-2026-11-05.md). 회오리 하나는 한 적 1번 */
    TORNADO_EXTRA_OPTION: '202',
    /** 가로 · 세로 베기: 서로를 장착했을 때 확률로 다른 쪽을 한 번 더 시전 (301 · 401), 문양 TakeDownSlash1 은 두 스킬 동시 장착이면 계수 val1 % 증가 */
    HORIZONTAL_EXTRA_OPTION: '301',
    VERTICAL_EXTRA_OPTION: '401',
    COMBO_PERK: 'TakeDownSlash1',
    /** 환영검: 관통 안 함 대신 데미지 (500), 확률로 데미지 2배 (501) */
    PHANTOM_NO_PIERCE_OPTION: '500',
    PHANTOM_DOUBLE_OPTION: '501',
    DOUBLE_FACTOR: 2,
    /** 연속 베기: 확률로 4번 더 (600), 문양 MultiSlash1: 횟수 절반 + 데미지 val1 %. 검기 (601 · 602) 는 겹침을 못 찾아 넣지 않음 */
    MULTI_SLASH_EXTRA_OPTION: '600',
    MULTI_SLASH_EXTRA_COUNT: 4,
    MULTI_SLASH_PERK: 'MultiSlash1',
    MULTI_SLASH_AURA_OPTIONS: ['601', '602'],
    /** 회전 베기: 지속 + N초 (700), 지속 절반 + 간격 N% 감소 (701), 문양 WheelWind1: 지속 val1 % 감소 + 데미지 val2 % */
    WHEEL_DURATION_OPTION: '700',
    WHEEL_HALF_OPTION: '701',
    WHEEL_PERK: 'WheelWind1',
    WHEEL_FIRST_TICK_SECONDS: 0.02,
    HALF_FACTOR: 0.5,
    /** 초승달 검기: 관통 + N (900), 확률로 2개 더 (901) */
    CRESCENT_PIERCE_OPTION: '900',
    CRESCENT_EXTRA_OPTION: '901',
    CRESCENT_EXTRA_COUNT: 2,
    /** 필살 난무: 횟수 + N (1000), 범위 절반 + 데미지 (1003, 식 보정 × 1.45), 문양 LethalSlash1: 횟수 절반 + 데미지 val1 %. 검기 (1001) 는 넣지 않음 */
    LETHAL_COUNT_OPTION: '1000',
    LETHAL_DAMAGE_OPTION: '1003',
    LETHAL_DAMAGE_BONUS: 1.45,
    LETHAL_PERK: 'LethalSlash1',
    LETHAL_AURA_OPTION: '1001',
    /** 추정한 값 · 넣지 못한 몫의 표시 (결과 missing 에 `<코드>:<스킬 번호>` 로 남음) */
    ESTIMATE_AURA_NOT_COUNTED: 'estimate:swordAuraNotCounted',
  },
  /**
   * 액티브 스킬 쿨타임 (damage-pipeline.md 7절, skill-gauge-accel-names.md): 작업량 W = (coolTime − 옵션 · 문양 초) × (1 − skillCoolReduction / 100),
   * 게이지 속도 = 1 + (스탯 0x42 + 0x43) / 100. 0x42 · 0x43 은 계산기 줄 이름이 없어 출처 행을 직접 읽는다
   */
  ACTIVE_COOL: {
    COOL_REDUCTION_STAT: 'skillCoolReduction',
    /** 카드 세트 "창공" (CardSet setId 2): 액티브 시전 뒤 3초간 0x42 + 줄 값 % (최대 5중첩). 액티브 스킬 하나면 1중첩 */
    CARD_SET_STAT: 'skillCoolSpeed_ActiveUse',
    CARD_SET_SECONDS: 3,
    CARD_SET_STACKS: 1,
    /**
     * 전용 무기 초월 (WeaponTranscend weaponType · star 행): 1슬롯 히어로 무기이고 그 별 이상일 때, 켜지는 대상에서만 최대 중첩 값.
     * 1007 ★10 "토네이도 최대 개수 시 30%" (모든 대상, 0x42), 1008 ★7 "히어로 몬스터 적중 시 5% 최대 4" (0x42), 1019 ★1 "나비가 보스에게 1% 최대 25" (0x43 액티브)
     */
    WEAPON_ROWS: [
      { WEAPON_ID: '1007', STAR: 10, VALUE: 'val1', STACKS: '', TARGETS: ['normal', 'boss', 'hero'] },
      { WEAPON_ID: '1008', STAR: 7, VALUE: 'val2', STACKS: 'val3', TARGETS: ['hero'] },
      { WEAPON_ID: '1019', STAR: 1, VALUE: 'val2', STACKS: 'val3', TARGETS: ['boss'] },
    ],
  },
  /**
   * 전용 스킬 (meteor-hit-area.md 11~12절, damage-pipeline.md 3-4): 한 발 = 스탯 6 × 행 damage / 100 × 영웅 옵션 곱.
   * 에이카 (charId 205) 만: 유성 = 행 value1 (0 이면 8) + 전용 무기 1021 ★4 이상이면 초월 행 val3 → 유성마다 맞는 적 수만큼,
   * 행 coolTime (단계) ≥ 5 이고 value3 > 0 이면 보주 파편 1개 = 한 발 × value3 / 100 (맞는 수는 입력)
   */
  CHAR_SKILL: {
    EIKA_CHAR_ID: '205',
    DEFAULT_METEORS: 8,
    METEOR_WEAPON: { WEAPON_ID: '1021', STAR: 4, VALUE: 'val3' },
    ORB_FROM_STAGE: 5,
    /** 영웅 옵션 (1슬롯 히어로에 장착한 직업 스킬의 문양, 문구 기준): 전용/교체 스킬 데미지 */
    PERK_DAMAGE_VAL1: ['ChangeCharSkillDmg', 'ChangeCharSkillDmg2'],
    PERK_DAMAGE_PER_LEVEL: ['SkillLvAndChangeCharSkillDmg', 'SkillLvAndChangeCharSkillDmg2'],
    /** 스킬 발동마다 val1 초간 val2 % (최대 val3 중첩) → 최대 중첩 val2 × val3 */
    PERK_DAMAGE_STACK: 'UseAndChangeCharSkillDmg',
    /**
     * 린 (charId 0) 전용 스킬 12004 "용의 파동": 파동 value1 개를 날려 각각 데미지 (catalog-skill-hits.md 7절, 유력).
     * 관통 99 (m994 @301dde8 → m2553, hero-skills-swordsman-2026-11-05.md, 직접 확인). 각성 12005 이후 용의 기운 (10초 지속) 은 넣지 않음
     */
    LIN_CHAR_ID: '0',
    LIN_DRAGON_WAVE_SKILL: '12004',
    LIN_WAVE_PIERCE: 99,
  },
  /**
   * 대상 체력 조건 피해 (묶음 A 0x40 / 0x41, 스킬 옵션 종류 10 / 11): 맞는 순간 남은 체력 비율이 70% 이상 / 30% 이하일 때.
   * 몬스터 체력 = public/data/monsterHp.json (scripts/export_monster_hp.py)
   */
  HP_CONDITION: {
    HIGH_FROM: 0.7,
    LOW_UNTIL: 0.3,
    HIGH_STAT: '_per_hp70UpDamage',
    LOW_STAT: '_per_hp30DownDamage',
    HIGH_OPTION_TYPE: '10',
    LOW_OPTION_TYPE: '11',
    /** 한 마리 체력이 한 대 대미지의 이 배수를 넘으면 적중 비율을 극한값 (0.3 · 0.3) 으로 */
    CONTINUOUS_FROM_HITS: 1e9,
    /** 경계 비교 여유 (0.1 을 여러 번 더한 부동소수 오차로 70% 가 69.99…% 가 되는 것 방지) */
    BOUNDARY_EPSILON: 1e-9,
    DATA_FILE: 'monsterHp.json',
    /** 속성 던전 층 종류 (DungeonReward dungeonVal3): 3 = 히어로 층 */
    ATTRIBUTE_HERO_KIND: 3,
    /** 속성 던전 일반 층 · 보스 층 (dungeonVal3) */
    ATTRIBUTE_NORMAL_KIND: 1,
    ATTRIBUTE_BOSS_KIND: 2,
  },
  /**
   * 대상 넷 (claude-docs/plans/2026-10-19-hit-damage.md 목표 표): 대미지 식의 대상 종류 (종합 탭 대상 칸) 와 시간.
   * 스테이지 = DPM, 나머지 = 정해진 시간 동안 누적 (보스 = Option stage_clear_boss_timer + VIP bossTimeUp 합, 각성 = DungeonAwaken_Time, 속성 = 코드 상수 60)
   */
  TARGETS: {
    stage: { UNIT: 'normal' },
    stageBoss: { UNIT: 'boss' },
    awaken: { UNIT: 'boss' },
    attributeHero: { UNIT: 'hero' },
    // 악몽 던전 (콘텐츠 17): 적 히어로 1기 (사용자 결정 2026-11-01 히어로 묶음), 55초 (DungeonNightmare_Time), 체력 = Stage 최대 행 monHp × double 최댓값 → 무한으로 본다 (추정)
    nightmare: { UNIT: 'hero' },
    // 대전 PvP (콘텐츠 12): 적 히어로, 35초 (pve_battle_time, 키 이름만 근거라 추정), 상대 체력은 상대 스탯이라 모른다
    pvp: { UNIT: 'hero' },
    // 속성 던전 일반 층 (80마리, 한 무리 4마리) · 보스 층 (1마리): 60초, 체력 = Stage[val1] monHp (보스 × bossHp) × val2 (hero-dungeon-monster.md 확정)
    attributeNormal: { UNIT: 'normal' },
    attributeBoss: { UNIT: 'boss' },
    // 길드 레이드 (콘텐츠 13): 보스 1기, 40초 (guild_boss_timer), 체력 MaxValue → 무한. 길드 레벨 시간 효과는 안 넣음
    guildRaid: { UNIT: 'boss' },
    // 글로벌 길드 레이드 (콘텐츠 18): 40초 (guild_boss_global_timer), 체력 MaxValue, 상대 종류가 주마다 일반 (5기) → 보스 → 히어로 로 바뀐다 (보고)
    globalRaidNormal: { UNIT: 'normal' },
    globalRaidBoss: { UNIT: 'boss' },
    globalRaidHero: { UNIT: 'hero' },
  } as Record<string, { UNIT: 'normal' | 'boss' | 'hero' }>,
  OPTION_TABLE: 'Option',
  BOSS_TIMER_KEY: 'stage_clear_boss_timer',
  AWAKEN_TIME_KEY: 'DungeonAwaken_Time',
  NIGHTMARE_TIME_KEY: 'DungeonNightmare_Time',
  PVP_TIME_KEY: 'pve_battle_time',
  GUILD_RAID_TIME_KEY: 'guild_boss_timer',
  GLOBAL_RAID_TIME_KEY: 'guild_boss_global_timer',
  /**
   * 한 번에 맞을 수 있는 적 수 상한: 글로벌 길드 레이드 일반 주 5기 (동시 생성, dungeon-spawn-2026-11-01.md).
   * 속성 던전 일반 층은 80마리가 한꺼번에 나와 (같은 문서) 상한을 두지 않는다 (입력 그대로)
   */
  MAX_TARGETS: { globalRaidNormal: 5 } as Record<string, number>,
  /**
   * 특성 · 카드 효과가 같은 대상 묶음 (사용자 지시 2026-11-05 "묶을 수 있는거 다 묶어라", task-log 같은 종류 안 특성 차이 확인).
   * 같은 묶음은 추천을 한 번만 계산한다 (앞에 있는 대상으로 계산 · 저장, 입력값은 그 대상의 프리셋). 프리셋은 보지 않는다
   * (사람마다 지금 고른 구성일 뿐이라 묶음 기준이 아님, 사용자 지적 2026-11-05).
   * 나눈 기준 = 처치 목표 (사용자 결정 2026-11-05 "처치 목표 기준"): 시간 안에 처치해야 하는 콘텐츠 (체력이 정해짐) / 처치 없이 대미지만 넣는 콘텐츠 (체력 무한, DPM).
   * 일반은 처치가 있는 대상 / 글로벌 일반 (체력 무한 · 최대 5마리) 따로.
   * 남는 차이 (전투 시간에 따른 교체 효과 비율 · 상태이상 수) 는 작아서 무시한다
   */
  /**
   * 특성 추천만 더 크게 묶는 대상 (사용자 지시 2026-11-05 "보스 2개 특성은 하나 계산하면 다른쪽에도 적용되게 해라", "히어로도 특성 합쳐라").
   * 근거: 22:26 계산 결과 보스 2개 · 히어로 2개의 추천 특성 85개가 모두 같았다. 카드 추천은 TARGET_BUNDLES 그대로
   */
  MASTERY_BUNDLES: [
    ['stage', 'attributeNormal'],
    ['stageBoss', 'attributeBoss', 'awaken', 'guildRaid', 'globalRaidBoss'],
    ['attributeHero', 'pvp', 'nightmare', 'globalRaidHero'],
  ] as readonly (readonly string[])[],
  TARGET_BUNDLES: [
    ['stage', 'attributeNormal'],
    ['stageBoss', 'attributeBoss'],
    ['awaken', 'guildRaid', 'globalRaidBoss'],
    ['attributeHero', 'pvp'],
    ['nightmare', 'globalRaidHero'],
  ] as readonly (readonly string[])[],
  /** 체력이 무한 (BigDouble.MaxValue 등) 인 대상 */
  INFINITE_HP_TARGETS: ['awaken', 'nightmare', 'guildRaid', 'globalRaidNormal', 'globalRaidBoss', 'globalRaidHero'] as readonly string[],
  ATTRIBUTE_DUNGEON_SECONDS: 60,
  SECONDS_PER_MINUTE: 60,
  /** 스테이지 보스 남은 시간 50% 이하 (시간의 뒤쪽 절반) 에만 붙는 줄 (묶음 A 0x2e · 0x30) */
  BOSS_TIME_SHORT: { SHARE: 0.5, ATTACK_STAT: '_per_attackDamage_BossTimeShort', SKILL_STAT: '_per_allSkillDamage_BossTimeShort', CRITICAL_RATE_STAT: 'criticalRate_BossTimeShort' },
  /**
   * 어디서도 읽지 않는 카드 · 세트 스탯 (표의 이름 그대로). 이 줄이 있으면 그 몫이 0 으로 빠지므로 빠진 몫으로 알린다.
   * 읽게 고친 스탯은 이 목록에서 뺀다 (전투 조건 꼬리말 · 몬스터 공격시 스킬 데미지 · 스킬 시전 시 스킬 데미지는 읽는다)
   */
  UNCOUNTED_CONDITION_STATS: ['_per_attackSpeed'] as readonly string[],
  /**
   * 대상 상태이상 수 (무자비 · 굳센 정신 · 후벼파기 · 약점 사냥이 반응): 게임은 대상에 걸린 상태이상 "종류 수" 를 센다 (후벼파기 문구 "상태이상 1종당",
   * damage-formula.md 2-5). 입력으로 안 받고 계산한다 (사용자 결정 2026-11-01):
   * - 스테이지 (일반몹) = 3중첩으로 가정
   * - 그 밖 (스테이지 보스 · 각성 · 속성 던전 히어로) = 장착 스킬의 상태이상 옵션이 시전 간격 · 확률 · 지속시간으로 걸려 있을 확률 (종류별) 을 구해
   *   더한 뒤 반올림한 "일반적인" 수 (statusEffects.ts). 같은 종류가 다시 걸리면 갱신, 한 시전에 적 하나에 한 번 판정, 적중 수는 안 본다 (추정).
   *   확률 100% 미만 = 0 규칙은 여기에 적용하지 않는다 (사용자 지적)
   */
  STAGE_STATUS_COUNT: 3,
  /**
   * 티르 전용 무기 (1030) 가 거는 상태이상 (Localized weapon_trsc_desc_1030_1 · _7, catalog-skill-hits.md 550~551):
   * ★1 티르의 공격에 적중한 적에게 출혈 (티르가 필드에 있을 때). ★7 공격 시 출혈 지속시간 증가, 출혈이 10초 지속되면 빈혈 (지속 6초).
   * 사용자 설명 2026-11-01: 출혈에 의한 추가 디버프 (빈혈) 는 티르가 필드에 없어도 (스위칭해도) 적용된다 → 자동 교체에서 2슬롯이 티르여도 센다
   */
  TYR_WEAPON: {
    WEAPON_ID: '1030',
    BLEED_STAR: 1,
    ANEMIA_STAR: 7,
    /** WeaponTranscend statType: ★1 출혈 (val2 = 출혈 지속 초), ★7 (val2 = 출혈이 이만큼 (초) 지속되면 빈혈) */
    BLEED_STAT_TYPE: '39001',
    ANEMIA_STAT_TYPE: '39003',
    /** ★4 흉터 (val1 받는 피해 %, val2 지속 초): 교체 스킬 (발할라 게이트) 을 쓸 때 건다 */
    SCAR_STAR: 4,
    SCAR_STAT_TYPE: '39002',
    /**
     * 표 값이 없을 때 쓰는 값. ★7 (39003): val1 = 연장 초 (연장 출혈 = 출혈 지속 + val1), val2 = 빈혈 시작 (건 시각 + 초), val3 = 빈혈 지속 (게임 코드 8초, 문구 6초).
     * 근거: status-effect-rules-2026-11-05.md 6.6 (★7 은 출혈을 지우고 연장 출혈로 바꿈, 연장 출혈이 있는 동안 다시 안 걸림)
     */
    DEFAULT_BLEED_SECONDS: 6,
    DEFAULT_EXTEND_SECONDS: 10,
    DEFAULT_ANEMIA_AFTER_SECONDS: 10,
    DEFAULT_ANEMIA_SECONDS: 8,
    DEFAULT_SCAR_SECONDS: 10,
    /** 교체 주기를 몇 번 돌려 걸려 있는 시간 비율을 구하는지 (앞 SETTLE 번은 버림) */
    SIMULATE_PERIODS: 40,
    SETTLE_PERIODS: 10,
  },
  /**
   * 교체 스킬이 거는 빙결 (서버 Skill 표 claude-docs/server_tables/Skill261313.txt 의 ChangeSkill 행, 문구 skill_desc_<번호>):
   * 화살형 (1216 · 1217 · 1218): value1 개의 빙결 화살을 ARROW_INTERVAL 간격으로 쏘고, 맞은 적 value2 초 빙결.
   * 각성형 (11216 · 11217): value1 초 동안 value3 초마다 모든 적에게, value2 초 빙결. 교체해 들어올 때 발동 (전투 시작 때는 안 나감).
   * 어느 스킬인가: Character.changeSkillId, 각성 레벨이 되면 CharacterAwaken.changeSkillId (에이카 Lv5~9 = 11216, Lv10~15 = 11217).
   * 이 표는 계산기 내장 표 (public/data/tables) 에 없어 값을 여기에 적는다
   */
  SWAP_SKILL_FREEZE: {
    '1216': { shots: 6, activeSeconds: 0, intervalSeconds: 0, freezeSeconds: 3 },
    '1217': { shots: 12, activeSeconds: 0, intervalSeconds: 0, freezeSeconds: 3 },
    '1218': { shots: 18, activeSeconds: 0, intervalSeconds: 0, freezeSeconds: 3 },
    '11216': { shots: 0, activeSeconds: 10, intervalSeconds: 1, freezeSeconds: 6 },
    '11217': { shots: 0, activeSeconds: 15, intervalSeconds: 1, freezeSeconds: 6 },
  } as Record<string, { shots: number; activeSeconds: number; intervalSeconds: number; freezeSeconds: number }>,
  /** 화살형 교체 스킬의 화살 발사 간격 (게임초, damage-pipeline.md 80 "0.12초 간격") */
  SWAP_ARROW_INTERVAL: 0.12,
  /**
   * 피규어 데빌윙크 (charSkillDevilWink, figure-special-effects-2026-11-07.md 6절, 게임 m2042 @32df7a0 · m2709 원문 대조):
   * 전용 스킬 적중 (정보 종류 4) 마다 10% 확률로 대상에 6초 상태 0x4e34 (최대 1, 갱신) → 대상이 받는 피해 ×(1 + 값/100) (공격 종류 제한 없음),
   * 상태이상 수에도 센다. 한 시전에 대상 하나가 맞는 수 h 로 시전마다 걸릴 확률 1 − 0.9^h, 시전 간격 · 6초로 걸려 있는 비율 p 를 구해 1 + p × 값/100 을 곱한다
   * (사용자 지시 2026-11-07 "다 계산해라", 넣기 결정)
   */
  DEVIL_WINK: { STAT: 'charSkillDevilWink', KIND: 'devilWink', HIT_CHANCE: 0.1, SECONDS: 6 },
  /**
   * 에이카 전용 무기 (1021) ★4 (WeaponTranscend statType 30004, val1 50 · val2 6): 얼음 유성에 적중한 적 val1 % 확률로 val2 초간 빙결
   * (catalog-skill-hits.md 540 · 646). 얼음 유성은 에이카 전용 스킬 (시전 간격 charSkill) 이 만든다. 한 시전의 판정은 한 번으로 센다 (유성 10개 중 하나만, 추정)
   */
  AEIKA_WEAPON: {
    WEAPON_ID: '1021',
    FREEZE_STAR: 4,
    STAT_TYPE: '30004',
    /**
     * ★1 (statType 30001, val1 = 15 %): 교체 스킬 빙결 화살이 보스에 맞을 때 대상 현재 체력 × val1 % 추가 피해 (claude-docs/react-port/current-hp-damage-2026-11-01.md).
     * 화살형은 마지막 화살, 각성형 (11216 · 11217) 은 첫 틱 (교체 + 1틱 간격) 에 한 번. 치명타 · 데미지 증가 같은 공통 곱은 안 붙는다.
     * 각성 · 길드 레이드 · 글로벌 · 악몽 보스는 게임이 이 피해를 빼므로 (m891) 체력이 유한한 보스 대상만
     */
    CURRENT_HP_STAR: 1,
    CURRENT_HP_STAT_TYPE: '30001',
    CURRENT_HP_TARGETS: ['stageBoss', 'attributeBoss'] as readonly string[],
  },
  /**
   * 리더 펫의 상태이상 효과 (Pet 표 leaderStatType `pet_hero_attack_<종류>` · `pet_hero_skill_<종류>`, 문구 "히어로가 일반공격 (스킬 시전) 을 {0}회 할 때마다
   * 주위의 적을 {1}초간 <상태이상>", leaderStatValue1 = 횟수, leaderStatValue2 = 지속 초): 횟수마다 확정으로 건다. 종류 이름 → 상태이상 종류.
   * 누비 (펫 105, SSS) = 평타 30회마다 5초 감전 (claude-docs/react-port/status-effects-2026-11-01.md 4절)
   */
  PET_LEADER_STATUS: {
    PATTERN: /^pet_hero_(attack|skill)_(.+)$/,
    KINDS: { shock: 'shock', stun: 'stun', blind: 'blind', slow: 'slow' } as Record<string, string>,
  },
  /**
   * 스킬 옵션 종류 (type) → 거는 상태이상 (claude-docs/react-port/catalog-skill-option.md 0-4절, 17종).
   * chancePercent: 옵션 값이 걸릴 확률 (%) 인가 (아니면 항상 건다). durationSeconds: 지속시간 (초), null 이면 옵션 값이 지속시간 ("{0}초간")
   */
  STATUS_OPTIONS: {
    '100': { kind: 'stun', chancePercent: true, durationSeconds: 2 },
    '200': { kind: 'airborne', chancePercent: true, durationSeconds: 2 },
    '803': { kind: 'stun', chancePercent: true, durationSeconds: 2 },
    '903': { kind: 'airborne', chancePercent: true, durationSeconds: 2 },
    '1100': { kind: 'airborne', chancePercent: true, durationSeconds: 2 },
    '1301': { kind: 'stun', chancePercent: true, durationSeconds: 2 },
    '1602': { kind: 'stun', chancePercent: true, durationSeconds: 2 },
    '1802': { kind: 'airborne', chancePercent: false, durationSeconds: null },
    '2401': { kind: 'burn', chancePercent: false, durationSeconds: 3 },
    '2500': { kind: 'blind', chancePercent: true, durationSeconds: 3 },
    '2801': { kind: 'burn', chancePercent: false, durationSeconds: 3 },
    '2902': { kind: 'blind', chancePercent: false, durationSeconds: null },
    '3002': { kind: 'blind', chancePercent: false, durationSeconds: null },
    '3200': { kind: 'freeze', chancePercent: true, durationSeconds: 2 },
    '3300': { kind: 'shock', chancePercent: true, durationSeconds: 2 },
    '3800': { kind: 'shock', chancePercent: true, durationSeconds: 2 },
    '3900': { kind: 'freeze', chancePercent: false, durationSeconds: null },
  } as Record<string, { kind: string; chancePercent: boolean; durationSeconds: number | null }>,
  /** 대미지 계산이 카드 전투 조건 판정용으로 값 칸에 넣는 것: 대미지 대상 (DamageTarget) 과 스킬 한 번에 맞는 적 수 */
  DAMAGE_TARGET_FIELD: 'dpmTarget',
  TARGETS_PER_SKILL_FIELD: 'dpmTargetsPerSkill',
  /** 지속 피해 옵션 (레이저 샷 2401, 피닉스 샷 2801): 계산에 안 넣고 빠진 몫으로 */
  /**
   * 화상 옵션: 2801 은 조사하지 않아 "못 넣음" 표시. 2401 (레이저 샷) 은 틱 = 레이저 기본값 (스탯 6 기본 공격력 × 계수) × v / 100 으로
   * 공통 대미지 식 (공격력 증가 · 치명타) 을 거치지 않아 (skill-gaps-2026-11-05.md 3절) 한 방 대미지보다 수백 자릿수 작다 → 0 으로 보고 표시하지 않는다
   */
  BURN_OPTION_TYPES: ['2801'],
  BUFF_SKILL_TYPE: 'BuffSkill',
  /** 관통 횟수 N → 맞는 적 N + 이 값 (추정: 코드 미확인, N + 1 일 수도 있음) */
  PIERCE_EXTRA_TARGETS: 0,
} as const;
