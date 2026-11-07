/** 이 파일은 해당 탭 이식 작업이 채운다. CONSTS.masteryRuneBuff 로 접근한다 */
export const MASTERY_RUNE_BUFF_CONSTS = {
  /** 특성 레벨 칸 이름 = 접두사 + 특성 번호 rNo (기존 HTML 은 별도 저장 키 stat-calc-mastery-v2 의 rNo → 레벨) */
  MASTERY_KEY_PREFIX: 'mastery_',
  /** 특성 구분 탭 (기존 HTML MASTERY_GROUPS, 표 Mastery 의 masteryType) */
  MASTERY_GROUPS: ['Stat', 'Skill', 'Battle'],
  /** masteryType 꼬리말: 얼티밋 특성 */
  ULTIMATE_TYPE_SUFFIX: '_odd',
  /** 특성 효과 숫자 표기 소수 자리 (기존 HTML plainNumber) */
  PLAIN_NUMBER_DECIMALS: 2,
  /** 얼티밋 특성 칸을 켰을 때 레벨 (꺼짐 = 0) */
  ULTIMATE_ON_LEVEL: 1,
  MIN_LEVEL: 0,

  /** 룬 칸 이름 = 접두사 + 슬롯 번호 0~5 또는 core */
  RUNE_KEY_PREFIX: 'rune_',
  CORE_RUNE_KEY: 'core',
  /** 속성 룬 레벨 상한 = (코어 룬 레벨 + 1) × 이 값 (게임 화면 규칙, 기존 HTML 550) */
  ATTRIBUTE_RUNE_LEVELS_PER_CORE: 10,
  /**
   * 속성 룬 연구실 (제공자 T1262 m6782 (다), stat-provider-formulas.md 3-3절): 속성 (불 · 물 · 땅) 마다 연구실 레벨 (사전에 없으면 1) 로
   * 표 Lab 의 (속성, 레벨) 행 하나를 찾아 그 행의 보상 스탯 · 값을 한 번 넣는다 (누적 값이라 낮은 레벨 행을 더하지 않음, 레벨 1 행은 보상 없음).
   * 연구실 해금 (ContentsUnlock 82, 조건 RuneMax) 판정은 따라가지 않아 레벨을 넣은 속성만 계산한다 (표 열 대응은 유력).
   * 칸 이름 = 접두사 + 속성 (runeLab_Fire), 비어 있음 = 입력 전 (계산하지 않음)
   */
  LAB: {
    /*
     * 해금 (ContentsUnlock 82행 Reinforce_AttributeRune_Lab, 조건 RuneMax): 속성 룬이 끝까지 오른 상태 = 코어 399 + 마지막 단계 여섯 룬 10
     * = 속성 룬 6개가 모두 표 최대 레벨 (claude-docs/react-port/unlock-relicmax.md 3절). 게임은 해금됐을 때만 연구소 효과를 넣는다 (m5997).
     * 열린 경우만 칸을 보이고 계산한다
     */
    TABLE: 'AttributeRuneLab',
    ATTRIBUTES: ['Fire', 'Water', 'Earth'],
    FIELD_PREFIX: 'runeLab_',
    ATTRIBUTE_COLUMN: 'attType',
    LEVEL_COLUMN: 'lv',
    STAT_COLUMN: 'rwdStat',
    VALUE_COLUMN: 'rwdValue',
    /** 레벨 입력 칸 폭 (px) */
    INPUT_WIDTH: 120,
  },
  /** 룬 아이콘 (public/icons/Atlas_AttributeRune/): 속성 룬 슬롯 n = ICON_rune<n + 1>, 코어 = ICON_center_rune */
  RUNE_ICON_PREFIX: 'ICON_rune',
  RUNE_ICON_SLOT_OFFSET: 1,
  CORE_RUNE_ICON: 'ICON_center_rune',

  /** 광폭화 중첩: 버프 탭 칸에 넣은 수 (스킬 광폭화 특성을 찍었을 때만), 최대 5중첩 (특성 설명문) */
  BERSERK_MAX_STACKS: 5,
  /** 학살자 기본 최종 공격력 % (서버 표 Mastery killer statValue 100 — 기존 HTML 이 숫자로 씀) */
  KILLER_BASE_PERCENT: 100,
  /** 연타가 이 % 를 넘으면 과충전 연타·연타 폭주 (특성 설명문) */
  DOUBLE_ATTACK_THRESHOLD: 100,
  /** 연타 폭주: 넘은 연타 이 % 마다 (특성 설명문) */
  DOUBLE_ATTACK_RUSH_STEP: 10,
  /** 속도 과열 (doubleAttackOverPer): 공격속도가 이 % 를 넘은 만큼 (특성 설명문, 저장 데이터 검증 217% 일치) */
  DOUBLE_ATTACK_SPEED_THRESHOLD: 350,
  /** 속도 과열: 넘은 공격속도 이 % 마다 특성 값만큼 연타 증가 */
  DOUBLE_ATTACK_SPEED_STEP: 10,
  /**
   * 특성 107 초월의 일격: 슈퍼 치명타 확률이 이 % 를 넘으면 치명타 데미지 곱 계열 (_per_criticalDmg) 에 특성 값 % 를 곱함
   * (게임 코드 m2710 @33fc5d8, 유력. 이 계정 Lv20 = 200% → ×3)
   */
  SUPER_CRITICAL_STRIKE_THRESHOLD: 100,
  /**
   * 최종 공격력 ×5: 공격력 증가와 따로 곱하는 _multiply_AttackDamage 자리 (게임 코드 m13385 @327afdc, 구조 확정).
   * 출처는 전용 무기 1021 초월 ★10 "최대 중첩이면 공격력 ×5" (실측 확인: 23:05 최종 공격력 비 − 공격력 증가 비 = log 5).
   * 1슬롯 히어로가 그 무기를 장착하고 ★ 이 이 값 이상일 때만 넣음
   */
  FINAL_ATTACK_MULTIPLIER: {
    WEAPON_ID: '1021',
    MIN_STAR: 10,
    MULTIPLIER: 5,
  },
  /**
   * 전용 무기 1021 초월 ★7 (WeaponTranscend statType 30002): 얼음 유성 적중마다 공격력 % 선형 중첩, 늘 최대 중첩으로 넣음.
   * 값은 표 행에서 읽는다: 중첩당 % = val2 (5), 최대 중첩 = val3 (10), 지속 = val1 (40초) — 기계어 해석.
   * 게임 문구 "40%·5초" 와 다름: 23:05 실측 ★7 몫 ×1.5001 이 기계어 해석 (+5% × 10중첩 = +50%) 과 맞음
   * (exclusive-weapon-transcend.md 9절, 지속은 실측 안 함). 장착 + ★ 도달 필요
   */
  EXCLUSIVE_STACK_BUFF: {
    TABLE: 'WeaponTranscend',
    WEAPON_ID: '1021',
    STAT_TYPE: '30002',
  },
  /**
   * "X 몬스터 공격시 5초간 ~" 줄 (카드·스티커) 은 게임이 전투 버프로만 넣는다 (m2708 · m2042, 확정) →
   * 버프 탭 줄로 옮길 때 CONSTS.summary.TARGET_STATS 의 묶음 이름 → 일반 스탯 이름
   */
  ON_ATTACK_BUFF_STATS: [
    { group: 'ON_ATTACK_ATTACK_PERCENT', stat: '_per_attackDamage' },
    { group: 'ON_ATTACK_SKILL_DAMAGE', stat: '_per_skillDamage' },
    { group: 'ON_ATTACK_CRITICAL_DAMAGE', stat: '_per_criticalDmg' },
    { group: 'ON_ATTACK_CRITICAL_RATE', stat: 'criticalRate' },
    { group: 'ON_ATTACK_ATTACK_SPEED', stat: 'attackSpeed' },
  ],
  /** 배율 → _per_ 줄 % 환산: 배율 log 가 이 값보다 크면 1 을 빼지 않음 */
  LARGE_MULTIPLIER_LOG: 15,
  /** log10(100) */
  PERCENT_LOG: 2,
  /** 학살자 배율 안내 소수 자리 (기존 HTML renderBuffCheck) */
  KILLER_DISPLAY_DECIMALS: 3,
  /**
   * 연타 중첩: 늘 최대로 계산.
   * 최대 10회 = 특성 14 가속 설명 "(최대 10회 중첩)", 특성 104 연타의 분노 "연타 10중첩 달성 시" (서버 표 Mastery desc)
   */
  DOUBLE_ATTACK_MAX_STACKS: 10,
  /** 스킬 콤보 중첩: 늘 최대. 특성 38 스킬 콤보 설명 "4회 중첩시 다음 액티브 스킬의 최종 데미지 8배 증가" */
  SKILL_COMBO_MAX_STACKS: 4,
  SKILL_COMBO_FINAL_MULTIPLIER: 8,
  /** 슈퍼 치명타 초과 규칙: 치명타 확률이 이 % 를 넘은 이 % 마다 superCriticalOverPer (특성 18 설명, 저장 데이터 검증 96.37 일치) */
  SUPER_CRITICAL_RATE_THRESHOLD: 100,
  SUPER_CRITICAL_RATE_STEP: 10,
  /**
   * 확률 (프로필 확률 줄) = 기본 스탯 + 추가 스탯 합 (저장 데이터 검증 verify-2026-10-07-0206 2-1: 관통·스위칭·스킬 콤보·무자비·매직 가드 일치).
   * 연타·슈퍼 치명타는 초과 규칙이 더 붙어 chances.ts 에서 따로 계산
   */
  CHANCE_STATS: {
    spearAttack: ['spearAttack', 'spearAttackAddPer'],
    switchingBoost: ['switchingBoost', 'switchingBoostAddPer'],
    skillCombo: ['skillCombo', 'skillComboAddPer'],
    smite: ['smite', 'smiteAddPer'],
    barrier: ['barrier', 'barrierAddVal'],
  } as Record<string, readonly string[]>,
  /** 스위칭 부스트 확률: 1·2슬롯 히어로가 같은 속성 / 다른 속성일 때 더하는 특성 (특성 208·209 설명) */
  SWITCHING_SAME_ATTRIBUTE_STAT: 'equipHeroToSwitchingBoostUp1',
  SWITCHING_DIFFERENT_ATTRIBUTE_STAT: 'equipHeroToSwitchingBoostUp2',
  /**
   * 확률 문턱 얼티밋 (statName → 확률 이름, 문턱 %): 확률이 문턱을 넘으면 공격력 % (서버 표 Mastery + 설명 mastery_desc_<rNo> "150% / 200% 초과한 상태에서").
   * 슈퍼 치명타 쪽 (superCriticalToCriticalDmgUp5·6) 은 치명타 데미지가 _per_criticalDmg / criticalDmg 중 어디에 붙는지 몰라 넣지 않는다
   */
  CHANCE_ULTIMATES: {
    switchingBoostToDmgUp5: { chance: 'switchingBoost', threshold: 150 },
    skillComboToDmgUp5: { chance: 'skillCombo', threshold: 150 },
    spearAttackToDmgUp5: { chance: 'spearAttack', threshold: 150 },
    doubleAttackToDmgUp5: { chance: 'doubleAttack', threshold: 150 },
    smiteToDmgUp5: { chance: 'smite', threshold: 150 },
    barrierToDmgUp5: { chance: 'barrier', threshold: 150 },
    switchingBoostToDmgUp6: { chance: 'switchingBoost', threshold: 200 },
    skillComboToDmgUp6: { chance: 'skillCombo', threshold: 200 },
    spearAttackToDmgUp6: { chance: 'spearAttack', threshold: 200 },
    doubleAttackToDmgUp6: { chance: 'doubleAttack', threshold: 200 },
    smiteToDmgUp6: { chance: 'smite', threshold: 200 },
    barrierToDmgUp6: { chance: 'barrier', threshold: 200 },
  } as Record<string, { chance: string; threshold: number }>,
  /**
   * 확률 초과 개수 얼티밋 (3001 잠재력 해방 80, 3007 한계 돌파 120; 설명은 "아티팩트의 유니크 옵션" 이지만
   * 게임은 히어로 최종 확률 7종을 문턱과 비교한다, claude-docs/react-port/artifact-unique-over-2026-11-05.md).
   * 문턱을 넘은 (> , 같으면 안 셈) 확률 종류 수 k → 공격력 증가에 × 값^k (값 = 표 값 2.5 / 5, 레벨 무관). 전투 버프는 확률에 안 들어가 늘 같은 k
   */
  CHANCE_COUNT_ULTIMATES: {
    _pow_attackDamage_ArtifactUniqueOptionOver80: 80,
    _pow_attackDamage_ArtifactUniqueOptionOver120: 120,
  } as Record<string, number>,
  /** 확률 초과 개수 얼티밋이 세는 확률 7종 (chancesFromLines 이름) */
  CHANCE_COUNT_NAMES: ['doubleAttack', 'superCritical', 'spearAttack', 'switchingBoost', 'skillCombo', 'smite', 'barrier'] as readonly string[],
  /** 교체가 있을 때만 발동하는 확률 (교체 켜짐 비율 칸이 0 이면 그 확률의 문턱 얼티밋 줄을 만들지 않는다) */
  SWAP_ONLY_CHANCE: 'switchingBoost',
  /**
   * 스위칭 부스트 발동 (게임 코드 T410 m2274, claude-docs/react-port/battle-missing-effects-2026-11-01.md 2-1절, 확정):
   * 교체 등장 때 확률 P 로 발동 → 공격력 % 버프 BUFF_PERCENT (× 공명 있으면 (1 + 공명/100)^floor(P/10)), 지속 BASE_SECONDS + 흐름 유지.
   * P > 100 이고 과잉 전환 (206) 을 배웠으면 공격력 % 그 값, 9999초 (그 히어로가 필드에 있는 동안).
   * 확률은 "100 미만이면 0" 규칙을 따른다. 교체 등장 때만이라 교체 켜짐 비율 (swapUptimePercent) 을 곱한다
   */
  /**
   * 피규어 조건형 효과 (figure-special-effects-2026-11-07.md, 게임 코드 원문 대조):
   * - 확률 200% 초과 7종 (m2099 @32e384c): 그 확률 (전투 중 값) 이 OVER_THRESHOLD 를 넘으면 첫 발동 때 9999초 ×(1 + 값/100) → 상시.
   *   스위칭 부스트는 교체가 있을 때만, 매직 가드는 보호막이 있을 때만 (등장 · 피격 때 보호막 > 0)
   * - 교체 등장 때 10초 (m2273 @33cf574): ×(1 + 값/100) 을 교체 켜짐 비율 × (10초 / 교체 간격) 만큼
   * - 기본 공격 20% 로 체력 100% 면 10초 공격력 (m2042 @32df95c): 체력이 깎일 일 없음 → 상시 ×(1 + 값/100)
   * - 사망 방어 뒤 공격력 (deathGuardDmgUp, m2042 @32dfac8): 넣지 않는다 — 죽을 일이 없으므로
   * 값: `_per_` 이름은 피규어마다 곱으로 쌓인 (곱 − 1) × 100, 그 밖 이름은 합
   */
  FIGURE_BATTLE: {
    OVER_THRESHOLD: 200,
    OVER_STATS: {
      doubleAttack: '_per_attackDamage_DoubleAttackOver200',
      superCritical: '_per_attackDamage_SuperCriticalOver200',
      spearAttack: '_per_attackDamage_SpearAttackOver200',
      smite: '_per_attackDamage_SmiteOver200',
      skillCombo: '_per_attackDamage_SkillComboOver200',
      switchingBoost: '_per_attackDamage_SwitchingBoostOver200',
      barrier: '_per_attackDamage_BarrierOver200',
    } as Record<string, string>,
    SWAP_ONLY: 'switchingBoost',
    BARRIER: 'barrier',
    CHANGE_SKILL_CAST_STAT: '_per_attackDamage_ChangeSkillCast',
    CHANGE_SKILL_CAST_SECONDS: 10,
    NORMAL_ATTACK_UP_STAT: 'normalAtkHealOrDmgUp',
    /** 넣지 않는 효과 (죽을 일이 없으므로) */
    DEATH_GUARD_STAT: 'deathGuardDmgUp',
  },
  SWITCHING_BOOST: {
    BUFF_PERCENT: 300,
    BASE_SECONDS: 6,
    POWER_STEP: 10,
    ADD_DAMAGE_STAT: 'switchingBoostAddDmg',
    ADD_DURATION_STAT: 'switchingBoostAddDuration',
    OVER_STAT: 'switchingBoostToDmgUp1',
  },
  /**
   * 에이카 전용 무기 (1021) 전투 효과 (WeaponTranscend 표 행, 게임 코드 확정 — battle-missing-effects-2026-11-01.md 2-2절, current-hp-damage-2026-11-01.md):
   * - ★12 (statType 30005): 보스 몬스터에 맞으면 공격력 % val2 (400), val1 (5) 초 — 교체 스킬이 1초마다 맞혀 필드에 있는 동안 유지 (유력). 보스 대상만
   * - ★1 (statType 30001): 교체 스킬 첫 틱 · 마지막 화살이 보스에 맞으면 val2 (15) 초 동안 받는 피해 val3 (100) %. 게임이 무한 체력 보스는 빼므로
   *   스테이지 보스 · 속성 던전 보스 대상만 (AEIKA_WEAPON.CURRENT_HP_TARGETS). 받는 피해는 따로 곱해지는 항이라 보스 몬스터 피해 % 줄로 넣는다 (같은 크기의 곱)
   * ★15 (30006, 보스 몬스터 피해 400) 는 상시라 무기 탭 TRANSCEND_STATS 에서 넣는다
   */
  EXCLUSIVE_BATTLE: {
    WEAPON_ID: '1021',
    BOSS_HIT_STAT_TYPE: '30005',
    BOSS_HIT_STAR: 12,
    TAKEN_DAMAGE_STAT_TYPE: '30001',
    TAKEN_DAMAGE_STAR: 1,
    BOSS_DAMAGE_STAT: '_per_BossMonsterDamage',
  },
  /**
   * 확률 묶음 이름 (일반 특성의 statName 에 들어 있는 확률 이름). 확률은 100% 미만이면 효과 0 이라,
   * 확률을 100% 로 올리는 특성과 그 문턱 효과 특성을 따로 올리면 효율이 안 오른다 → 추천이 같은 묶음의 특성 둘을 동시에 올려 본다
   * (예: 무자비 306 + 307, 슈퍼 치명타 17 + 108, 매직 가드 전환율 61 · 311 + 312). 스위칭 부스트는 효과 식이 따로라 넣지 않음
   */
  COMBO_FAMILIES: ['superCritical', 'spearAttack', 'doubleAttack', 'skillCombo', 'smite', 'barrier'] as readonly string[],
  /**
   * 매직 가드 (게임 m2137 @32e1ae8, claude-docs/react-port/barrier-and-atk-gap.md 1절):
   * - 기본 항 BASE_STAT (0x105, 특성 60 · 연성 · 주사위) 이 0 이면 보호막 0 으로 두고 함수가 끝난다 (32e1cd8~32e1d5c 직접 확인)
   *   → 흘러넘치는 체력 63, 312 · 313 · 314, 전환율 150 · 200% 초과 얼티밋 (3018 · 3027) 모두 꺼짐
   * - 전환율 S = barrier + barrierAddVal (확률 묶음 barrier). 312: S > 100 이면 값 %, 313: floor((S − 100) / 10) 단계 × 값 %
   * - 314 마력 발산: 보호막이 생길 때 (히어로 등장 · 교체) 5초간 값 % → 교체 켜짐 비율 × (5초 / 필드에 서는 시간).
   *   교체가 없으면 전투 시작 한 번뿐이라 넣지 않는다. 긴급 재생 64 (맞을 때 확률로 다시 생성) 는 맞는 횟수를 몰라 넣지 않는다
   * - 실드 배쉬 62 (보호막 × % 를 한 방마다 고정값으로 더함) 는 크기가 대미지보다 10^100 배 이상 작아 넣지 않는다
   */
  MAGIC_GUARD: {
    BASE_STAT: 'barrier',
    CHANCE: 'barrier',
    OVER_THRESHOLD: 100,
    OVER_STEP: 10,
    OVER_DAMAGE_STAT: 'barrierToDmgUp1',
    OVER_STEP_DAMAGE_STAT: 'barrierToDmgUp2',
    BURST_DAMAGE_STAT: 'barrierToDmgUp3',
    BURST_SECONDS: 5,
  },

  /** 특성 스탯 이름 (서버 표 Mastery statName) */
  STATS: {
    BERSERK: 'berserk',
    BERSERK_SKILL: 'berserkSkillUse',
    KILLER_ADD: 'killerAddDmg',
    OVERCHARGE: 'doubleAttackToDmgUp1',
    DOUBLE_ATTACK_RUSH: 'doubleAttackToDmgUp2',
    ATTACK_PERCENT: '_per_attackDamage',
    /** 연타 확률 = 기본 + 추가 + 속도 과열 (프로필 연타 줄, 저장 데이터 검증) */
    DOUBLE_ATTACK: 'doubleAttack',
    DOUBLE_ATTACK_ADD: 'doubleAttackAddPer',
    DOUBLE_ATTACK_SPEED_OVER: 'doubleAttackOverPer',
    ATTACK_SPEED: 'attackSpeed',
    /** 특성 42 초월적 기량: 장착 스킬에 액티브가 없으면 공격속도에 더함 (게임 코드 m2695 @33f4bdc, enum 0x3) */
    NOT_ACTIVE_ATTACK_SPEED: 'notActiveAttackSpeed',
    /** 특성 107 초월의 일격: 슈퍼 치명타 확률이 문턱을 넘으면 치명타 데미지 % (enum 0xde) */
    SUPER_CRITICAL_TO_CRITICAL_DAMAGE: 'superCriticalToCriticalDmgUp',
    /** 치명타 데미지 곱 계열 (enum 0x16) */
    CRITICAL_DAMAGE_PERCENT: '_per_criticalDmg',
    /** 공격력 증가와 따로 곱하는 최종 공격력 곱 (enum 0x1f). 줄 값은 배수 그대로 (5 = ×5) */
    FINAL_ATTACK_MULTIPLY: '_multiply_AttackDamage',
    /** 가속: 연타 연속 발동마다 공격력 % (최대 10회 중첩) */
    DOUBLE_ATTACK_STACK: 'doubleAttackDmgUp',
    /** 연타의 분노: 연타 10중첩 달성 시 공격력 % */
    DOUBLE_ATTACK_FULL_STACK: 'doubleAttackToDmgUp3',
    SUPER_CRITICAL: 'superCritical',
    SUPER_CRITICAL_ADD: 'superCriticalAddPer',
    SUPER_CRITICAL_RATE_OVER: 'superCriticalOverPer',
    CRITICAL_RATE: 'criticalRate',
    /** 스킬 콤보 4중첩 "다음 액티브 스킬의 최종 데미지" 를 넣는 스탯 (액티브 스킬 데미지 특성 23 과 같은 이름, 붙는 자리 추정) */
    ACTIVE_SKILL_PERCENT: '_per_ActiveSkillDamage',
    /** 치명타 데미지 합 계열 (스탯 0x15, 기본 120 에 더함) */
    CRITICAL_DAMAGE_SUM: 'criticalDmg',
    /** 특성 204 관통의 맹공: 관통 발동 시 3초간 공격속도 % (복리 10중첩) */
    SPEAR_ATTACK_SPEED_UP: 'spearAttackToAtkSpdUp',
    /** 특성 13 추진력: 값은 발동 확률이고 공격속도에는 고정 +50 이 반영된다 */
    DOUBLE_ATTACK_SPEED_UP: 'doubleAttackSpdUp',
    /** 특성 9 야성 강화: 광폭화 중 공격속도 % */
    BERSERK_ADD_SPEED: 'berserkAddSpd',
    /** 특성 58 우격다짐: 무자비 발동 시 3초간 공격속도 % */
    SMITE_ADD_SPEED: 'smiteAddSpd',
    /** 특성 309 약점 사냥: 무자비 발동 시 3초간 치명타 확률 % (복리 10중첩) */
    SMITE_CRITICAL_RATE_UP: 'smiteToCriticalRateUp',
    /** 특성 109 연쇄 작렬: 슈퍼 치명타 발동 시 치명타 데미지 % (복리 10중첩, 치명타 데미지 합 C 에 더함) */
    SUPER_CRITICAL_CHAIN: 'superCriticalToDmgUp2',
    /** 특성 63 흘러넘치는 체력: 체력이 가득이면 공격력 % */
    BARRIER_FULL_DAMAGE: 'barrierAddDmgFull',
    /** 특성 108 한계 돌파: 슈퍼 치명타 100% 초과 후 10% 마다 공격력 % */
    SUPER_CRITICAL_OVER_DAMAGE: 'superCriticalToDmgUp1',
    /** 특성 202 초과된 힘: 관통 100% 초과 시 공격력 % */
    SPEAR_ATTACK_OVER_DAMAGE: 'spearAttackToDmgUp1',
    /** 특성 307 무자비 폭주: 무자비 100% 초과 시 공격력 % (대상 상태이상 조건은 넣지 않음) */
    SMITE_OVER_DAMAGE: 'smiteToDmgUp1',
  },
  /**
   * 전투 중 최대 상태 몫 (: 중첩·켜짐은 최대 상태, 입력 칸 없음).
   * 식 근거: combat0113.py 44~149 (기계어 정리 x10101-1057-gamecode.md 2절, crit-dmg-atkspeed-gamecode.md), 화면 4시점 일치 확인
   */
  BATTLE: {
    /** 복리 중첩 수: 204 (공격속도)·309 (치명타 확률)·109 (치명타 데미지) 모두 최대 10중첩 (특성 설명문) */
    COMPOUND_STACKS: 10,
    /** 추진력 13 이 올리는 공격속도 % (설명문 "공격속도 +50%". 표 값 100 은 발동 확률. 식 코드는 못 읽었고 화면 일치로 정함) */
    DOUBLE_ATTACK_SPEED_UP_PERCENT: 50,
    /** 관통이 이 % 를 넘으면 초과된 힘 202 */
    SPEAR_ATTACK_THRESHOLD: 100,
    /** 무자비가 이 % 를 넘으면 무자비 폭주 307 */
    SMITE_THRESHOLD: 100,
    /** 슈퍼 치명타가 이 % 를 넘은 만큼, 넘은 이 % 마다 한계 돌파 108 한 단계 */
    SUPER_CRITICAL_OVER_THRESHOLD: 100,
    SUPER_CRITICAL_OVER_STEP: 10,
  },
  /** 직업·속성 공격속도 스탯 = 직업 + 이 글, 속성 + 이 글 (예: Archer_AttackSpeed, WaterHero_AttackSpeed) */
  JOB_ATTACK_SPEED_SUFFIX: '_AttackSpeed',
  ATTRIBUTE_ATTACK_SPEED_SUFFIX: 'Hero_AttackSpeed',
  /** 직업·속성 치명타 확률 스탯 (예: Archer_Critical, WaterHero_Critical) */
  JOB_CRITICAL_SUFFIX: '_Critical',
  ATTRIBUTE_CRITICAL_SUFFIX: 'Hero_Critical',
  KILLER_ACTIVE_FIELD: 'killerActive',
  /**
   * 학살자 (특성 51 "몬스터 40마리를 2초 안에 처치할 경우, 3초 간 최종 공격력 {0}% 증가") 가 켜지는 대미지 대상
   *: 일반 몬스터를 실제로 처치하는 곳만 = 스테이지 · 속성 던전 일반 층.
   * 보스 · 히어로 (1마리) 와 글로벌 레이드 일반 주 (5기 · 체력 무한, 처치 없음) 는 끈다. 2초 안 40마리를 실제로 잡는지 (처치 속도) 는 보지 않는다
   */
  KILLER_TARGETS: ['stage', 'attributeNormal'] as readonly string[],
  /** 대미지 대상을 모르는 계산 (계산식 확인기 종합) 에서 학살자가 켜지는 공격 대상 종류 */
  KILLER_SUMMARY_TARGET: 'normal',
  /** 버프 탭 일반 몬스터 피해 음식 칸 (값 = FOODS 의 id, 빈칸 = 없음) */
  NORMAL_MONSTER_FOOD_FIELD: 'normalMonsterFood',
  /** 음식 효과 스탯 (서버 표 Item string1) */
  NORMAL_MONSTER_FOOD_STAT: '_per_NormalMonsterDamage',
  /**
   * 일반 몬스터 피해 음식 (서버 표 Item itemId 25·26·27 = food_10·11·12, double1 = %, double2 = 60분.
   * 이름 = Localized item_name_food10·11·12). React 데이터에 Item 표가 없어 값을 여기에 둔다
   */
  NORMAL_MONSTER_FOODS: [
    { id: 'strawberryJam', itemId: 25, stat: '_per_NormalMonsterDamage', percent: 100 },
    { id: 'strawberryJuice', itemId: 26, stat: '_per_NormalMonsterDamage', percent: 250 },
    { id: 'strawberryTart', itemId: 27, stat: '_per_NormalMonsterDamage', percent: 600 },
  ],
  /** 음식 효과 지속 시간 (분, 서버 표 Item double2 = 60). 저장은 먹은 시각 (_foodUseList) 만 남겨서 이 시간으로 켜져 있는지 가른다 */
  NORMAL_MONSTER_FOOD_MINUTES: 60,
  /** 버프 탭 공격력 이벤트 버프 칸 (켬/끔, 처음 = 꺼짐) */
  ATTACK_EVENT_BUFF_FIELD: 'attackEventBuff',
  /**
   * 공격력 이벤트 버프 (서버 표 Item itemId 15 = ItemBuffStageAtk, double1 = 200 %, double2 = 60분, 이름 "공격력 버프").
   * 음식이 아니라 이벤트 구매 버프라 음식과 같이 켜진다. 표 string1 이 비어 있어 붙는 스탯은 표에 없음:
   * 공격력 % 로 넣는 것은 02:48 저장 ×3 (gap-atk-increase-provider.md 5절) 과 2026-10-12 01:54 공격력 증가 화면 일치로 확인
   */
  ATTACK_EVENT_BUFF: { itemId: 15, stat: '_per_attackDamage', percent: 200 },

  /** 얼티밋 특성 "_pow_/_per_ 공격력·체력 _개수" 의 개수 이름 → 장착 펫 속성 (서버 표 Pet attribute) */
  ULTIMATE_PET_COUNT_KEYS: { EqFirePetCnt: 'Fire', EqWaterPetCnt: 'Water', EqEarthPetCnt: 'Earth' } as Record<string, string>,
  /** 얼티밋 "_pow_스탯_편성 히어로 속성 수" 의 개수 이름 → 1·2슬롯 히어로 속성 (Character 표 attribute) */
  ULTIMATE_HERO_ATTRIBUTE_COUNT_KEYS: { EqFireHeroCnt: 'Fire', EqWaterHeroCnt: 'Water', EqEarthHeroCnt: 'Earth' } as Record<
    string,
    string
  >,
  /** 이름에 개수 꼬리말이 없지만 개수를 곱하는 얼티밋 (설명문 "활성화된 스킬 문양 개수 x") — 개수를 몰라 줄을 만들지 않는다 */
  ULTIMATE_HIDDEN_COUNT_STATS: ['_per_jobSkillRuneDamage', '_per_charSkillRuneDamage', '_per_swapSkillRuneDamage'] as readonly string[],
  /** 얼티밋 "_pow_스탯_장착 스킬 종류 수" 의 개수 이름 → 스킬 탭 장착 5칸의 Skill 표 skillType (특성 2010·2011) */
  ULTIMATE_SKILL_COUNT_KEYS: { EqActiveSkillCnt: 'ActiveSkill', EqBuffSkillCnt: 'BuffSkill' } as Record<string, string>,
  /** 얼티밋 "_per_스탯_던전 기록" 의 이름 → 유물 연동 칸 (relicLink_<이름>, 특성 2015~2017). 속성 던전 (2018~2020) 은 칸이 없다 */
  ULTIMATE_DUNGEON_RECORD_KEYS: {
    DungeonGoldRecord: 'dungeonGold',
    DungeonEquipRecord: 'dungeonEquip',
    DungeonRelicRecord: 'dungeonRelic',
    DungeonFireRecord: 'dungeonFire',
    DungeonWaterRecord: 'dungeonWater',
    DungeonEarthRecord: 'dungeonEarth',
  } as Record<string, string>,
  /** 얼티밋 "_per_스탯_전투 특화" 의 이름 → Character 표 targetUnit (특성 1012~1017, 1033~1035) */
  ULTIMATE_TARGET_UNIT_KEYS: { TargetUnitBoss: 'Boss', TargetUnitNormal: 'Normal', TargetUnitHero: 'Hero' } as Record<
    string,
    string
  >,
  /**
   * 얼티밋 "_per_스탯_EqOver<N>Sum" (특성 3002 · 3008): 두 히어로가 장착한 전용 무기의 초월 ★ 합이 N 이상일 때만 (조건 확정, 값 출처는
   * stat-provider-formulas.md 수집기 m2694 · 이름은 유력). 1 · 2슬롯 히어로가 전용 무기를 꼈는지는 아래 장착 칸
   */
  ULTIMATE_WEAPON_STAR_SUM_THRESHOLDS: { EqOver20Sum: 20, EqOver30Sum: 30 } as Record<string, number>,
  HERO_EQUIPPED_FIELDS: ['exclusiveEquipped', 'exclusiveEquipped2'] as readonly string[],
  /**
   * 얼티밋 "_per_스탯_EqSameGradeAlchemy<N>" (특성 3000 균형의 완성 · 3006 완전한 세트): 장착 연성장비 중 같은 등급 (rarity 숫자 그대로,
   * GR · GR+ 는 따로) 이 가장 많은 등급의 개수가 N 이상일 때만 (게임 코드 m2687 확정, claude-docs/react-port/alchemy-same-grade-2026-11-01.md).
   * 개수는 입력칸 ALCHEMY_SAME_GRADE_FIELD (저장 가져오기가 채움)
   */
  ULTIMATE_SAME_GRADE_ALCHEMY_THRESHOLDS: { EqSameGradeAlchemy5: 5, EqSameGradeAlchemy8: 8 } as Record<string, number>,
  ALCHEMY_SAME_GRADE_FIELD: 'alchemySameGradeMax',
  /**
   * 얼티밋 "_per_스탯_<개수 이름>" 중 개수 × 값 % 인 것 → 개수 입력칸 (claude-docs/react-port/sss-grade-count-2026-11-01.md, 게임 코드 확정):
   * - EquipSSSOptionCnt (1020 · 1021): 히어로가 낀 **전용 무기** 옵션 중 SSS 이상 (등급 > SS) 개수. 직업 무기는 0. 1슬롯 칸 (2슬롯은 SWAP.SSS_OPTION_COUNT_FIELDS)
   * - EqSSS_StickerCnt (3019 · 3020): 편성 카드 6장에 붙인 SSS 이상 배지 수 (최대 24). 저장에 예시가 없어 직접 입력
   */
  ULTIMATE_COUNT_FIELDS: { EquipSSSOptionCnt: 'weaponSssOptionCount', EqSSS_StickerCnt: 'sssStickerCount' } as Record<string, string>,
  /** 연성장비 장착 칸 수 (저장 equipItemDic 0~9) */
  ALCHEMY_SLOTS: 10,
  /**
   * 얼티밋 "_per_스탯_HeroSwap" (특성 25~28 · 3009~3011 · 3037~3039): 교체해 등장한 뒤 20초간만 (battle-entry-atk.md, 확률 없음).
   * 그 효과가 켜진 시간 비율 (%) 은 이 입력칸 (교체 계산 swapDamage.ts 가 채움). 칸이 없으면 교체가 없는 것으로 보고 적용하지 않는다
   */
  ULTIMATE_HERO_SWAP_KEY: 'HeroSwap',
  SWAP_UPTIME_FIELD: 'swapUptimePercent',
  COSTUME_COUNT_KEY: 'HaveCostumeCnt',
  /** 코스튬 탭의 보유 코스튬 수 칸 */
  COSTUME_COUNT_FIELD: 'costumeCount',
  /** 펫 탭의 장착 펫 칸 이름 = 이 글 + 칸 번호 (petSlot1 ~) */
  PET_SLOT_FIELD_PREFIX: 'petSlot',
  /** 계산 탭의 1·2슬롯 히어로 칸 (얼티밋 개수 안내용) */
  HERO_FIELDS: ['charName', 'charName2'],

  /** 특성·룬 카드 화면 */
  PANEL: {
    ICON_SIZE: 40,
    LEVEL_INPUT_WIDTH: 80,
    /** 꺼진 얼티밋 아이콘 흐리게 (기존 HTML css) */
    INACTIVE_ICON_STYLE: { opacity: 0.35, filter: 'grayscale(0.6)' },
    ACTIVE_ULTIMATE_BORDER_WIDTH: 2,
    /** 룬 카드 하나의 폭 (px) */
    RUNE_CARD_WIDTH: 200,
    /** 룬 카드 높이 (육각형 배치에서 위치 계산용, px) */
    RUNE_CARD_HEIGHT: 150,
    /** 육각형 배치: 가운데 코어 룬에서 속성 룬 카드 가운데까지 거리 (px). 영역이 육각형 폭보다 좁으면 2열 격자 */
    RUNE_HEX_RADIUS: 260,
    /** 좁은 화면의 룬 카드 열 수 (영역 폭 기준) */
    RUNE_GRID_COLUMNS: { base: 1, '416px': 2 },
    /** 특성 카드 한 장의 너비 (px). 열 수는 화면 폭이 정하고 넘치면 줄바꿈 (기존 HTML 은 9.5rem = 152px) */
    CARD_WIDTH: 152,
    /** 게임 특성 화면처럼 단계마다 한 줄에 아이콘과 레벨 칸만 놓는다 (이름·설명은 아이콘 위에 올렸을 때만) */
    NODE_WIDTH: 84,
    NODE_ICON_SIZE: 44,
    NODE_LEVEL_INPUT_WIDTH: 40,
    /** 특성 레벨 칸 좌우 안쪽 여백 (px). 기본 10px 이면 폭 40 에 최대 레벨 네 자리 (5000) 가 잘린다 */
    NODE_LEVEL_INPUT_PADDING: 4,
    NODE_GAP: 12,
    /** 한 단계 줄 안 특성 칸 사이 간격 (줄 가운데 정렬) */
    TRAIT_ROW_GAP: 16,
    STAGE_LABEL_WIDTH: 56,
    /** 아이콘 아래 이름 (가운데 정렬) */
    NODE_NAME_TEXT_SIZE: '11px',
    NODE_NAME_MAX_LINES: 2,
    /** 세 종류(스탯·스킬·히어로) 열 하나의 너비: 단계 글자 + 아이콘 4개 + 간격 (px) */
    COLUMN_WIDTH: 420,
    /** 특성 나무 영역의 최대 높이. 넘으면 이 영역 안에서 스크롤 (열 제목은 맨 위 고정) */
    TREE_MAX_HEIGHT: '70vh',
    COLUMN_HEADER_PADDING: 4,
    COLUMN_HEADER_Z_INDEX: 1,
    COLUMN_GAP: 24,
    /** 단계 글자를 아이콘 가운데 높이에 맞추는 위쪽 여백 (px) */
    STAGE_LABEL_TOP_OFFSET: 16,
    STAGE_ROW_GAP: 8,
    NODE_SMALL_TEXT_SIZE: '10px',
    TOOLTIP_MAX_WIDTH: 260,
  },
} as const;
