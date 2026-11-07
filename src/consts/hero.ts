/** 히어로 선택·각성 단계 화면의 상수. CONSTS.hero 로 접근한다 */
export const HERO_CONSTS = {
  /** 입력 칸 이름 (기존 stat-calc.html 의 data-key 그대로, 저장소에는 calc. 접두사) */
  FIELDS: {
    /** 1슬롯 히어로 이름 (계산은 1슬롯만) */
    HERO_1: 'charName',
    /** 2슬롯 히어로 이름 (성별·속성 확인용) */
    HERO_2: 'charName2',
    /** 1슬롯 히어로 등급 (Character 표 grade) */
    HERO_GRADE: 'charGrade',
    /** 1슬롯 히어로 성 (Character 표 star) */
    HERO_STAR: 'charStar',
    /** 베르 각성 등급 (Awaken 표 grade) */
    AWAKEN_GRADE: 'awakenGrade',
    /** 베르 각성 별 (Awaken 표 star) */
    AWAKEN_STAR: 'awakenStar',
    /** 베르 각성 누적 능력치 화면의 최종 배율 (베르 각성 세부 탭 칸, 여기서는 확인 문구에만 읽음) */
    AWAKEN_FINAL_ATK: 'awakenTotalFinalAtk',
    AWAKEN_FINAL_HP: 'awakenTotalFinalHp',
  },

  TABLES: {
    CHARACTER: 'Character',
    AWAKEN: 'Awaken',
    /** 캐릭터 (히어로) 각성 표 */
    HERO_AWAKEN: 'CharacterAwaken',
  },

  /** 히어로 표 · 전용 무기 표 */
  roster: {
    /** 유물 "★10 전용 무기 수" 의 ★ 기준 */
    STAR10_WEAPON_STAR: 10,
    /** 표 칸 폭 (px): 그림 · 등급·성 드롭다운 · 숫자 칸 */
    ICON_SIZE: 28,
    SELECT_WIDTH: 84,
    NUMBER_WIDTH: 60,
    /** 히어로 표 칸 폭 (px): 등급 드롭다운 ("SSS" + 화살표) · 성 드롭다운 (한 자리) · 각성 숫자 칸 */
    HERO_GRADE_WIDTH: 68,
    HERO_STAR_WIDTH: 52,
    HERO_AWAKEN_WIDTH: 48,
    /** 표가 이 폭보다 좁아지면 가로 스크롤 */
    TABLE_MIN_WIDTH: 410,
    /** 히어로 · 전용 무기 표 최대 높이: 넘으면 표 안에서 스크롤, 머리줄은 맨 위 고정 (사용자 지시 2026-11-07 "히어로 입력하는것도 스크롤 생기게 해라", 특성 패널 TREE_MAX_HEIGHT 와 같은 값) */
    TABLE_MAX_HEIGHT: '70vh',
    /** 호감도 최대 레벨 (서버 표 CharacterAffinity lv 0~15, 히어로 31명 모두 같음) */
    AFFINITY_MAX_LEVEL: 15,
  },
  /** 기본 공격속도 % = 1슬롯 히어로의 Character 표 이 열 (예: 에이카 150), 공격속도 스탯 줄로 넣는다 */
  BASE_ATTACK_SPEED_COLUMN: 'atkSpd',
  ATTACK_SPEED_STAT: 'attackSpeed',
  /**
   * 기본 치명타 확률 %: 표·저장 데이터에는 없고 게임 코드에 상수로 들어 있다 (합산기 T1282 m6859 의 스탯 0x13 기본 1.0, combat0113.py 50줄 · 기계어 확인).
   * 02:06·02:13·02:48 프로필이 줄 합보다 늘 1.0 컸던 몫이 이것 (gap-atk-critrate.md 3절), 2026-10-12 01:54 화면 611.1895 와 소수 넷째 자리까지 일치
   */
  BASE_CRITICAL_RATE: 1,
  CRITICAL_RATE_STAT: 'criticalRate',
  /**
   * 기본 치명타 데미지 합 계열: 표에 없고 게임 코드에 상수로 들어 있다 (합산기 T1282 m6859 의 기본 120, crit_check.py 33줄 · crit-dmg-atkspeed-gamecode.md 기계어 확인).
   * 02:48 프로필 105.81B% 의 합 계열 차 (gap-critdmg-normal.md 1-2) 가 이 120 이고, 2026-10-12 01:54 화면 2.19C% 와 일치
   */
  BASE_CRITICAL_DAMAGE: 120,
  CRITICAL_DAMAGE_SUM_STAT: 'criticalDmg',
  /** 히어로 호감도 표 (히어로마다 레벨별 누적 공격력·체력 %) */
  AFFINITY_TABLE: 'CharacterAffinity',

  /** 베르 각성 세부 스탯: 표 Awaken 의 type1~6 / val1~6 열 번호 */
  awakenDetail: {
    STAT_COLUMN_NUMBERS: [1, 2, 3, 4, 5, 6],
  },

  /** 기본값 확인: 수치표 기본값과 화면 값의 log10 차이가 이보다 작으면 같음 (기존 html 609) */
  BASE_CHECK_TOLERANCE_LOG: 0.002,
  /** 각성 최종 배율: 화면 값과 수치표 단계 배율의 log10 차이가 이보다 작으면 같음 (기존 html 699) */
  AWAKEN_FINAL_TOLERANCE_LOG: 0.004,

  /** 히어로 그림 = public/icons/Atlas_cotume/char_thum_<charId>_cos_<코스튬 번호>.png, 기본 코스튬 0 (기존 src 89~92) */
  HERO_ICON_PREFIX: 'Atlas_cotume/char_thum_',
  HERO_ICON_COSTUME_PART: '_cos_',
  HERO_DEFAULT_COSTUME: 0,

  /** 속성 순서와 아이콘 (던전 속성 아이콘 D1 불·D2 물·D3 땅, 기존 src 705) */
  ATTRIBUTES: ['Fire', 'Water', 'Earth'],
  ATTRIBUTE_ICONS: {
    Fire: 'Atlas_DungeonAttCode/ICON_att_D1',
    Water: 'Atlas_DungeonAttCode/ICON_att_D2',
    Earth: 'Atlas_DungeonAttCode/ICON_att_D3',
  } as Record<string, string>,
  /** 직업 순서와 아이콘 (기존 src 706) */
  JOBS: ['Swordsman', 'Fighter', 'Archer', 'Mage'],
  JOB_ICONS: {
    Swordsman: 'job/change_job_1',
    Fighter: 'job/change_job_2',
    Archer: 'job/change_job_3',
    Mage: 'job/change_job_4',
  } as Record<string, string>,

  /** 화면 크기 (px) */
  ui: {
    PICKER_BUTTON_IMAGE_SIZE: 44,
    PICKER_OPTION_IMAGE_SIZE: 44,
    TYPE_ICON_SIZE: 16,
    FILTER_ICON_SIZE: 20,
    PICKER_GRID_COLUMNS: { base: 4, sm: 6 },
    /** 한 줄 배치에서 왼쪽 이름 칸 너비 */
    INLINE_LABEL_WIDTH: 40,
    /** 베르 각성 세부 스탯 레벨 칸 너비 (두 자리 숫자) */
    DETAIL_LEVEL_INPUT_WIDTH: 56,
    /** 등급·별 드롭다운 너비 */
    CHOICE_SELECT_WIDTH: 110,
    /** 고른 칸 테두리 두께 */
    PICKED_OUTLINE_WIDTH: 2,
  },
} as const;
