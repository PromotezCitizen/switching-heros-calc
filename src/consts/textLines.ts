/** 글자 칸 → 줄 탭 (일기장·코스튬·도감·칭호·기타·프로필 창 값) 의 상수. CONSTS.textLines 로 접근한다 */
export const TEXT_LINES_CONSTS = {
  /** 레벨 칸을 읽을 때의 최소값 (기존 HTML numberValue: 소수는 버리고 0 미만은 0) */
  MIN_LEVEL: 0,

  /** 이 탭들이 쓰는 서버 수치표 이름 */
  TABLE_NAMES: {
    /** 별자리 요정의 축복 (레벨 행) */
    FAIRY_BLESSING: 'AdsBuff',
    /** 히어로 이름 → charId */
    CHARACTER: 'Character',
    /** 히어로 각성 (charId·레벨 행) */
    HERO_AWAKEN: 'CharacterAwaken',
  },

  /** 별자리 요정의 축복 공격력·체력 % = 서버 표 AdsBuff 의 레벨 행 (buff1 = 공격력, buff2 = 체력, 표 columnLabels 확인) */
  FAIRY_BLESSING_STATS: [
    { stat: '_per_attackDamage', column: 'buff1' },
    { stat: '_per_hp', column: 'buff2' },
  ],
  /** 화면에 보여 주는 요정의 축복 값 열 (공격력 %, 체력 % 와 같은 값) */
  FAIRY_BLESSING_SHOWN_COLUMN: 'buff1',

  /**
   * 히어로 각성: 서버 표 CharacterAwaken 의 지금 레벨 행 스탯 세 쌍을 모두 줄로 넣는다 (게임 각성 제공자 T1278 m6844 가 세 쌍 모두 넣음,
   * claude-docs/react-port/meteor-gap-2026-11-01.md). 예: 에이카 Lv15 = 교체 스킬 대미지 · 전용 스킬 대미지 1.00E+25 %, 공격력 200 % (누적).
   * 예전에는 statType3 한 쌍만 읽어 전용 · 교체 스킬 대미지가 빠졌다 (2026-11-01 고침)
   */
  HERO_AWAKEN_STAT_COLUMNS: [
    ['statType1', 'statVal1'],
    ['statType2', 'statVal2'],
    ['statType3', 'statVal3'],
  ] as readonly (readonly [string, string])[],

  /** 다른 탭(계산 탭)의 1슬롯 히어로 이름 칸 */
  HERO_NAME_FIELD: 'charName',

  /** 체크 칸이 켜졌을 때 저장되는 글 (store/storedValues readFlag 와 같음) */
  CHECKED_TEXT: 'true',
  UNCHECKED_TEXT: 'false',

  /** 일기장 슬롯 수와 첫 책 번호 (서버 표 DiaryStat: 책마다 슬롯 12개) */
  SLOT_COUNT: 12,
  MIN_BOOK: 1,

  /** 일기장 아이콘 크기 (px) */
  DIARY_ICON_SIZE: 32,
} as const;
