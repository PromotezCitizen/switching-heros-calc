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
    /** 스탯 꼬리말: 전투 조건 효과 (처치 중첩·주위 적 수) — 합산에서 뺌 */
    BATTLE_CONDITION_SUFFIXES: ['_Kill', '_MonsterCntLong'],
    /** 스탯 꼬리말: 주위 적 수 조건 효과. 종합 탭 "적 수 5 이상" 을 켜면 이 꼬리말을 뗀 일반 스탯으로 합산 (유력, gap-atk-increase-provider.md 4-5) */
    ENEMY_COUNT_SUFFIX: '_MonsterCntLong',
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
    /** 한 줄로 놓는 편성 칸 하나의 폭 (px). 6칸이 칸 폭을 넘치면 가로 스크롤 */
    CARD_SLOT_WIDTH: 200,
    PET_SLOT_WIDTH: 260,
    /** 웨폰 링크 직업 카드 최소 폭 (넓으면 4개 한 줄) · 레벨 칸 폭 (px) */
    LINK_CARD_MIN_WIDTH: 150,
    LINK_LEVEL_INPUT_WIDTH: 72,
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
  },
} as const;
