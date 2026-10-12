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

  /** 히어로 각성: 서버 표 CharacterAwaken 의 statType3 / statVal3 (columnLabels "공격력 % (누적)") 을 한 줄로 넣는다 */
  HERO_AWAKEN_STAT_COLUMN: 'statType3',
  HERO_AWAKEN_VALUE_COLUMN: 'statVal3',

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
