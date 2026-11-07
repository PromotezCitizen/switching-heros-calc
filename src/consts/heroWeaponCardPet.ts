/** 히어로의 기록·무기·몬스터 카드·펫·광산 탭의 숫자·고정 이름. CONSTS.heroWeaponCardPet 로 접근한다 */
export const HERO_WEAPON_CARD_PET_CONSTS = {
  /** 직업 순서 (게임 화면 순서: 검사, 격투가, 궁수, 마법사) */
  JOBS: ['Swordsman', 'Fighter', 'Archer', 'Mage'],
  /** 수치표에서 "스탯 없음" 을 뜻하는 글 */
  EMPTY_STAT: 'None',
  /** 선택 칸 값 "등급_성" 의 구분 글자 */
  GRADE_STAR_SEPARATOR: '_',
  /** 숫자 칸의 가장 작은 값 (음수·빈칸은 0 으로 읽음) */
  MIN_NUMBER: 0,

  library: {
    /** 서버 표 Library 에서 기록 보관소 행의 job */
    ARCHIVE_JOB: 'None',
    /** 기록 보관소 레벨 = floor(가장 낮은 책 레벨 ÷ 10) (사용자 식) */
    ARCHIVE_LEVEL_DIVISOR: 10,
    /** 전승된 능력 칸 수 */
    INHERIT_ROWS: 8,
    /** 전승된 능력 칸 n번은 기록 보관소 Lv(2n) 에서 열림 */
    ARCHIVE_LEVELS_PER_INHERIT_SLOT: 2,
    /** 책 레벨 0 = 효과 없음, 표의 lv 0 행은 넣지 않음 */
    FIRST_LEVEL: 1,
    /** 직업 책 아이콘 (public/icons/Atlas_Library/<이름>.png) */
    BOOK_ICONS: {
      Swordsman: 'Atlas_Library/Icon_book_sword',
      Fighter: 'Atlas_Library/icon_Green_Book_fighter',
      Archer: 'Atlas_Library/Icon_book_Bow',
      Mage: 'Atlas_Library/Icon_book_Magic',
    },
  },

  weapon: {
    /** 무기 옵션 칸 수 */
    OPTION_ROWS: 8,
    /** 무기 옵션 칸 1~8 이 열리는 전용 무기 강화 레벨 (앱 상수 weapon_dice_slot_lock) */
    OPTION_UNLOCK_LEVELS: [10, 20, 50, 200, 800, 1200, 2500, 7500],
    /** 웨폰 링크 별 칸 최대 */
    LINK_STAR_MAX: 5,
    /** 전용 무기 강화 레벨 최소 (빈칸이면 1 로 읽음) */
    MIN_EXCLUSIVE_LEVEL: 1,
    /** % 를 100 으로 나누므로 log 에 더하는 값 (log10(100)) */
    PERCENT_LOG_OFFSET: 2,
    /**
     * 전용 무기 장착 효과에 곱하는 유물 (유물 45): 스탯 이름 = 앞 + 직업 + 뒤 (예: _per_Archer_EquipWeapon).
     * 게임 m2680 이 유물 스탯 통에서 읽고 없으면 1 (gap-atk-increase-provider.md 4-3)
     */
    EQUIP_WEAPON_RELIC_STAT_PREFIX: '_per_',
    EQUIP_WEAPON_RELIC_STAT_SUFFIX: '_EquipWeapon',
    /** 전용 무기 초월 공통 효과 statType → 스탯 (서버 표 WeaponTranscend, 문구 weapon_trsc_desc). 10000 이상은 무기마다 다른 전투 효과라 넣지 않음 */
    TRANSCEND_STATS: {
      '1': '_per_ChangeSkillDamage',
      '2': '_per_CharSkillDamage',
      '3': '_per_attackDamage',
      '4': '_per_allSkillDamage',
      // 에이카 1021 ★15 "모든 공격은 보스에게 400% 추가 피해" (표에서 30006 은 1021 에만 있음, battle-missing-effects-2026-11-01.md 2-2절 확정)
      '30006': '_per_BossMonsterDamage',
    } as Record<string, string>,
    /** 무기 누적 능력치 = 전용 무기 초월 미션 보상 (서버 표 ContentMission 의 missionType WeaponChar_Trans 중 공격력 보상 줄) */
    TRANSCEND_MISSION: {
      TABLE: 'ContentMission',
      MISSION_TYPE: 'WeaponChar_Trans',
      REWARD_STAT: '_per_attackDamage',
    },
    /** 웨폰 링크 직업 카드 아이콘 (Atlas_SoulWeapon/ICON_job_<번호>_100, 직업 순서대로 1~4) */
    LINK_ICONS: {
      Swordsman: 'Atlas_SoulWeapon/ICON_job_1_100',
      Fighter: 'Atlas_SoulWeapon/ICON_job_2_100',
      Archer: 'Atlas_SoulWeapon/ICON_job_3_100',
      Mage: 'Atlas_SoulWeapon/ICON_job_4_100',
    },
  },

  card: {
    /** 편성 카드 칸 수 */
    SLOTS: 6,
    /** 카드 한 장의 세트 마크 칸 수 (Card 표 slotCnt 최대) */
    SET_MARKS: 5,
    /** 고유 효과 열 번호 (uniqAbilType, uniqAbilType2 … uniqAbilType6) */
    UNIQUE_ABILITY_SUFFIXES: ['', '2', '3', '4', '5', '6'],
    /** 세트 아이콘 이름: 이 번호까지 Set<n>, 그 뒤는 set<n> (게임 그림 묶음 그대로) */
    SET_ICON_UPPER_CASE_MAX: 15,
    SET_ICON_UPPER_PREFIX: 'Atlas_monstercardcord/Set',
    SET_ICON_LOWER_PREFIX: 'Atlas_monstercardcord/set',
    CARD_ICON_PREFIX: 'Atlas_monstercardcord/M',
    EMPTY_CARD_ICON: 'Atlas_monstercardcord/IMG_Slot_non',
    /** "SSS 카드 장착 수 × n%" 줄의 등급 */
    SSS_GRADE: 'SSS',
    /** 카드 등급 순서 (표 Card 의 등급 나온 순서, 낮은 등급 먼저). "SSS 이상" 은 SSS 부터 뒤쪽 전부 */
    GRADE_ORDER: ['B', 'A', 'S', 'SS', 'SSS', 'R', 'SR', 'SSR', 'UR', 'URP', 'UUR', 'XR', 'XRP', 'LR', 'LRP', 'IR'] as readonly string[],
    /** 스탯 꼬리말: SSS 카드 장착 수만큼 곱함 */
    SSS_CARD_COUNT_SUFFIX: '_SSSMonsterCardCnt',
    /**
     * 스탯 꼬리말 → 그 등급 이상 카드 장착 수만큼 곱함 (게임 m2688 @33ec108 이 장착 카드의 등급 번호가 > 6 / > 7 / > 10 / > 11 / > 13 / > 15 인 장수를 세어
     * 0x54~ 의 6개 이름에 1 + (v − 1) × 장수 로 곱함: SSS=7, R=8, UR=11, URP=12, XR=14, LR=16. 별 무관.
     * SSS 는 확정, 나머지 5개 등급 번호 대응은 문턱 순서와 이름 순서가 같다는 근거의 유력 — work_collect/README.md 1-1, functions.md m2688, stat-ids.md 548행)
     */
    CARD_COUNT_SUFFIX_GRADES: {
      _SSSMonsterCardCnt: 'SSS',
      _RMonsterCardCnt: 'R',
      _URMonsterCardCnt: 'UR',
      _URPMonsterCardCnt: 'URP',
      _XRMonsterCardCnt: 'XR',
      _LRMonsterCardCnt: 'LR',
    } as Record<string, string>,
    /**
     * 스탯 꼬리말: 전투 조건 효과 — 합산에서 뺌 (처치 중첩 `_per_attackDamage_Kill` 은 아래 KILL_STAT 으로 따로 합산).
     * 그 밖의 조건 이름 (_MonsterCntShort·_BossTimeShort·_NearSingleEnemy·_StageBoss, attackSpeed_Kill·criticalRate_Kill)
     * 은 기계어 정리 문서에 식이 없어 읽지 않은 코드로 남김 (합산에서 뺀 채).
     * _HeroSwap 은 교체 켜짐 비율로 (countExpandedLines), 공격력 · 스킬 데미지의 _MyHp70Long 은 MY_HP_70_STATS 로 바꿔 합산한다
     */
    BATTLE_CONDITION_SUFFIXES: ['_Kill', '_MonsterCntLong'],
    /**
     * 카드 2번 처치 중첩 (T410 m2276 @33d1320): 컨테이너의 `_per_attackDamage_Kill` 값 v 를 최대 5중첩 선형으로 공격력 % 에 넣는다
     * (1 + (v − 1) × 5, 사용자 결정: 최대 상태). 값 140 → ×8
     */
    KILL_STAT: '_per_attackDamage_Kill',
    KILL_MAX_STACKS: 5,
    /**
     * 처치 중첩이 쌓이는 공격 대상: 일반 몬스터뿐이다 (계속 잡으며 나아감).
     * 보스 · 히어로 몬스터는 한 마리를 잡으면 전투가 거기서 끝나서 전투 중에 처치가 일어나지 않고, 각성 던전 보스는 체력이 무한이라 못 잡는다.
     * 속성 던전 히어로 몬스터의 마릿수는 확인하지 못해 같이 쌓이지 않는 것으로 둔다 (추정)
     */
    KILL_STACK_TARGET: 'normal',
    /** 카드 3번 스킬 사용 중첩 (T410 m2308 @33ce078): 합 계열 `attackDamage_useSkill` 값 v % 를 최대 5중첩 선형으로 공격력 % 에 넣는다. 값 160 → ×9 */
    USE_SKILL_STAT: 'attackDamage_useSkill',
    USE_SKILL_MAX_STACKS: 5,
    /**
     * 카드 세트 "혈류" 6세트 (CardSet setId 4): 버프 스킬 발동 시 3초간 `_per_BuffDamage_BuffAttack` 값 v % 의 버프 스킬 데미지 (최대 5중첩).
     * 카드 스킬 사용 중첩과 같은 방식 (사용자 결정: 최대 상태) 으로 v × 5 % 를 버프 스킬 데미지 (`_per_BuffSkillDamage`) 에 넣는다
     */
    BUFF_ATTACK_STAT: '_per_BuffDamage_BuffAttack',
    BUFF_ATTACK_MAX_STACKS: 5,
    BUFF_ATTACK_TARGET_STAT: '_per_BuffSkillDamage',
    /** 최종 공격력 증가에 넣는 스탯 (0x61) */
    ATTACK_PERCENT_STAT: '_per_attackDamage',
    /** 스탯 꼬리말: 주위 적 수 조건 효과. 종합 탭 "적 수 5 이상" 을 켜면 이 꼬리말을 뗀 일반 스탯으로 합산 (유력, gap-atk-increase-provider.md 4-5) */
    ENEMY_COUNT_SUFFIX: '_MonsterCntLong',
    /**
     * 스탯 꼬리말: 내 체력 70% 이상일 때 효과. 치명타 데미지 쪽 (_per_criticalDmg_MyHp70Long, consts/summary.ts) 과 같이
     * 프로필은 체력 가득이라 늘 켜진 것으로 보고 (추정), 공격력 · 스킬 데미지는 꼬리말을 뗀 일반 스탯으로 합산한다
     */
    MY_HP_70_SUFFIX: '_MyHp70Long',
    MY_HP_70_STATS: ['_per_attackDamage', '_per_skillDamage'] as readonly string[],
    /**
     * 전투 조건 꼬리말 (카탈로그 catalog-monster-card.md): 그 전투 상황이면 꼬리말을 뗀 일반 스탯으로 합산하고, 아니면 줄을 그대로 둔다 (효과 0).
     * 전투 상황은 대미지 계산이 값 칸 (CONSTS.dpm DAMAGE_TARGET_FIELD · TARGETS_PER_SKILL_FIELD) 으로 넣고, 칸이 없으면 (계산식 확인기 등) 모두 꺼짐.
     * - enemyShort `_MonsterCntShort` 주위의 적 5마리 이하 · enemyLong `_MonsterCntLong` 5마리 이상: 대상별 ENEMY_COUNT_BY_TARGET
     *   (전투 상황이 없으면 (계산식 확인기 등) 예전처럼 종합 탭 "적 수 5 이상" 칸이 켜졌을 때만 Long)
     * - single `_NearSingleEnemy` 주위의 적 1마리: 스테이지는 한 스킬에 맞는 적 수가 1 일 때, 나머지 대상은 늘 켜짐
     * - stageBoss `_StageBoss` 스테이지 보스전: 스테이지 보스 대상만
     * - nearHero `_NearHero` 주위에 히어로 몬스터가 있을 경우: 속성 던전 히어로 대상만 (`_per_DamageIncrease_Hero` 도 같은 뜻)
     * 대상 이름은 대미지 계산의 DamageTarget 이다. (주위 적 수 · 히어로 몬스터 유무는 이 계산이 대상으로만 가정하는 값이다)
     */
    CONDITION_SUFFIXES: [
      ['_MonsterCntShort', 'enemyShort'],
      ['_MonsterCntLong', 'enemyLong'],
      ['_NearSingleEnemy', 'single'],
      ['_StageBoss', 'stageBoss'],
      ['_NearHero', 'nearHero'],
    ] as readonly (readonly [string, string])[],
    DAMAGE_INCREASE_HERO_STAT: '_per_DamageIncrease_Hero',
    /**
     * 대상별 주위 적 수 조건 (사용자 지시 2026-11-02 "전부 진행", 근거 claude-docs/react-port/nearby-enemy-range-2026-11-02.md):
     * 게임은 상대 진영 전체 수로 Short ≤ 5 · Long ≥ 5 (정확히 5 면 둘 다). 여기 없는 대상 (보스 1마리 · 히어로 0마리) 은 Short 만 켜짐.
     * - stage: 45마리 출현 · 5 이하에서 재소환 → Long 거의 항상, Short 는 재소환 순간만 (끔)
     * - attributeNormal: 80마리 동시 출현, 남은 수 5 이하부터 Short → 대부분 Long (Short 끔)
     * - globalRaidNormal: 5기 (체력 무한이라 줄지 않음) → 둘 다 켜짐 (유력)
     */
    ENEMY_COUNT_BY_TARGET: {
      stage: { long: true, short: false },
      attributeNormal: { long: true, short: false },
      globalRaidNormal: { long: true, short: true },
    } as Record<string, { long: boolean; short: boolean }>,
    STAGE_TARGET: 'stage',
    STAGE_BOSS_TARGET: 'stageBoss',
    /** 적이 히어로 몬스터인 대상 (주위 히어로 몬스터 조건이 켜진다) */
    HERO_TARGETS: ['attributeHero', 'nightmare', 'pvp', 'globalRaidHero'] as readonly string[],
    /** 꼬리말을 뗀 스탯 중 계산에서 다른 이름으로 읽는 것: `_per_DamageIncrease` (설명 "공격력 {0}% 증가") 는 공격력 증가 */
    BASE_STAT_ALIASES: { _per_DamageIncrease: '_per_attackDamage' } as Record<string, string>,
    /** 카드 34 스킬 시전 시 스킬 데미지 (카탈로그: "5초간 스킬 데미지 {0}% 증가 (최대 5중첩)"): 공격력 쪽 USE_SKILL_STAT 과 같이 5중첩 선형 */
    USE_SKILL_SKILL_STAT: 'skillDamage_useSkill',
    USE_SKILL_SKILL_TARGET_STAT: '_per_skillDamage',
  },

  pet: {
    /** 장착 펫 칸 수 (물 펫 6마리 장착 기준) */
    SLOTS: 6,
    /** 펫 하나의 옵션 최대 수 (Pet 표 optionCnt 최대) */
    OPTIONS: 6,
    /** 장착 옵션에서 빼는 스탯 (명중은 계산에 안 씀) */
    EXCLUDED_OPTION_STAT: '_per_hit',
    /** 상태이상 리더 효과의 스탯 앞부분 (스탯이 아니라 문구만) */
    AILMENT_LEADER_PREFIX: 'pet_hero_',
    THUMBNAIL_PREFIX: 'Atlas_Pet/Pet_thum_',
    /**
     * 펫 지역 (제공자 T1286 m6886 @3072ddc, stat-provider-formulas.md 3-16절 · combat-power-petregion-gamecode.md 3절):
     * 마지막 단계 (표에 다음 레벨 행이 없는) 보유 펫이 UNLOCK_PET_COUNT 마리 이상일 때만 열리고, 열리면 지역 3개를 모두 합산한다.
     * 지역 하나 = 공격력 % · 체력 % 에 각각 표 PetRegion 의 지역 레벨 행 traitAtk · traitHp × (1 + f).
     * f = 그 지역 속성의 마지막 단계 펫 수 N 으로 Option 표 PET_PLACEMENT_PER_<N> (N > 6 이면 6) ÷ 100, N = 0 이면 0 (f 의 식은 유력).
     * 지역 번호 ↔ 속성 = 1 불 · 2 물 · 3 땅 (m2692 의 이름 순서, 유력). 오라 슬롯 효과는 장착 오라를 몰라 넣지 않음
     */
    REGION: {
      TABLE: 'PetRegion',
      LEVEL_COLUMN: 'regionLv',
      ATTACK_COLUMN: 'traitAtk',
      HP_COLUMN: 'traitHp',
      ATTRIBUTES: ['Fire', 'Water', 'Earth'],
      UNLOCK_PET_COUNT: 1,
      PLACEMENT_TABLE: 'Option',
      PLACEMENT_KEY_PREFIX: 'PET_PLACEMENT_PER_',
      PLACEMENT_KEY_COLUMN: 'key',
      PLACEMENT_VALUE_COLUMN: 'valueDouble1',
      PLACEMENT_MAX_COUNT: 6,
      ATTACK_STAT: '_per_attackDamage',
      HP_STAT: '_per_hp',
    },
  },

  /** 속성 아이콘 (던전 속성 아이콘 D1 불·D2 물·D3 땅) */
  ATTRIBUTE_ICONS: {
    Fire: 'Atlas_DungeonAttCode/ICON_att_D1',
    Water: 'Atlas_DungeonAttCode/ICON_att_D2',
    Earth: 'Atlas_DungeonAttCode/ICON_att_D3',
  } as Record<string, string>,

  /** 화면 크기 (px) */
  ui: {
    PICKER_BUTTON_IMAGE_SIZE: 56,
    PICKER_OPTION_IMAGE_SIZE: 48,
    TYPE_ICON_SIZE: 18,
    CARD_ICON_SIZE: 40,
    /** 고르기 창 선택지 한 칸의 최소 폭 (px). 열 수는 정하지 않고 창 폭에 들어가는 만큼 놓는다 */
    PICKER_OPTION_MIN_WIDTH: 80,
    /** 고르기 창 항목 힌트 (마우스 올림) 최대 너비 (px) */
    PICKER_HINT_MAX_WIDTH: 260,
    /** 한 줄로 놓는 편성 칸 하나의 폭 (px). 6칸이 칸 폭을 넘치면 가로 스크롤 */
    CARD_SLOT_WIDTH: 200,
    /** 펫 장착 칸 폭 (px): 옵션 이름 "물 속성 히어로의 공격력" 이 잘리지 않게 넓힘 (사용자 지적 2026-11-07 "물속성 뭐 어쩌라고") */
    PET_SLOT_WIDTH: 360,
    /** 펫 지역 레벨 칸 하나의 폭 (px) */
    REGION_INPUT_WIDTH: 150,
    /** 웨폰 링크 직업 카드 최소 폭 (넓으면 4개 한 줄) · 레벨 칸 폭 (px) */
    LINK_CARD_MIN_WIDTH: 150,
    LINK_LEVEL_INPUT_WIDTH: 72,
    /** 일반 무기 강화 레벨 칸 하나의 최소 폭 (px) */
    NORMAL_WEAPON_INPUT_MIN_WIDTH: 90,
    /** 히어로의 기록 책 카드 최소 폭 (사용자 지정 160) */
    BOOK_CARD_MIN_WIDTH: 160,
    /** 쓰지 않는 칸·미보유 카드의 흐림 정도 */
    UNUSED_OPACITY: 0.4,
    STAT_ROW_SELECT_FLEX: 1,
    STAT_ROW_VALUE_WIDTH: 110,
  },

  mine: {
    /** 광산 화면 값 = (M − 1) × 100 %, 합산에는 M × 100 % = 화면 값 + 100 % (log10(100) = 2) */
    PERCENT_LOG: 2,
    /** 축복이 올리는 능력치 (공격력·체력 같은 값) */
    STATS: ['_per_attackDamage', '_per_hp'],
    /** 투자 레벨 1 오를 때마다 배율에 더하는 값 (서버 표 Option MINE_BLESS_STAT_1·2) */
    GROWTH_PER_LEVEL: 1.5,
    /** 광산 투자 레벨 시작값 (이 레벨에서 배율 = 각성 총합 + 1) */
    FIRST_LEVEL: 1,
    /** 투자 레벨 입력 칸 폭 (px) */
    LEVEL_INPUT_WIDTH: 160,
  },
} as const;
