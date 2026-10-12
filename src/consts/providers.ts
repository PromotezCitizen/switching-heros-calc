/** 코어 특성 · 피규어 탭 (뒤늦게 계산에 넣은 능력치 제공자). CONSTS.providers 로 접근한다 */
export const PROVIDER_CONSTS = {
  /** 표에서 "스탯 없음" 을 뜻하는 글 */
  EMPTY_STATS: ['', 'None'] as readonly string[],

  /**
   * 코어 특성 (제공자 T1271 m6818 @306a8c8, stat-provider-formulas.md 10-4절 — 구조 확정 · 필드 이름 대응 유력):
   * 코어 특성 레벨 (저장 coreMasteryLv, 1 이상이어야 진행) 로 표 CoreMastery 의 그 레벨 행을 얻고, 선택 목록의 항목 k (1 ~ 13) 마다
   * 행의 k 번째 스탯 · 값을 한 번씩 넣는다. 선택은 칸 (처음 꺼짐) 으로 받고 콘텐츠 조건은 이 제공자 안에 없다
   */
  coreMastery: {
    TABLE: 'CoreMastery',
    LEVEL_FIELD: 'coreMasteryLevel',
    SELECT_FIELD_PREFIX: 'coreMasterySelect_',
    SLOT_COUNT: 13,
    LEVEL_COLUMN: 'lv',
    STAT_COLUMN_PREFIX: 'statType',
    VALUE_COLUMN_PREFIX: 'statValue',
    /** 레벨 입력 칸 폭 (px) · 선택 칸 격자 최소 폭 (px) */
    LEVEL_INPUT_WIDTH: 120,
    SELECT_MIN_WIDTH: 260,
  },

  /**
   * 피규어 (제공자 T1276 m6838 @306bd38, 10-5절 — 구조 확정): 저장 figureDic (피규어 번호 → 레벨) 의 레벨 1 이상 항목마다
   * 표 FigureStat 의 (피규어 번호, 레벨) 행 슬롯 3개의 스탯 · 값을 한 번씩 넣는다 (스탯 없음이거나 값 0 이면 건너뜀).
   * 값 이름이 `_per_targetHero<히어로 번호>_hp|attackDamage` 쌍이면 1슬롯 히어로 번호가 같을 때만 체력 % · 공격력 % 로 넣는다
   * (합산기 T461 m2730 @340ff78, 이름 연결 유력). 카드 세트 점수 이름 (`_per_attackDamage_CardSetPoint`) 은 개수 수집기 m2684 가
   * 1 + (v − 1) x 세트 점수 로 0x61 에 곱한다 (N = 카드 탭 세트 보너스 합계). 그 밖 개수 이름 (피규어 레벨 합 · 신화 피규어 수 · 무기 초월 합 ·
   * 각성 레벨 합 · 스티커 점수 합) 과 문턱 초과 이름 (…Over200) 은 N 의 정의를 읽은 문서가 없어 넣지 않는다
   */
  figure: {
    TABLE: 'FigureStat',
    LEVEL_FIELD_PREFIX: 'figureLevel_',
    ID_COLUMN: 'figureid',
    GRADE_COLUMN: 'grade',
    LEVEL_COLUMN: 'level',
    SLOT_COUNT: 3,
    STAT_COLUMN_PREFIX: 'statType',
    VALUE_COLUMN_PREFIX: 'statValue',
    TARGET_HERO_PATTERN: /^_per_targetHero(\d+)_(hp|attackDamage)$/i,
    TARGET_HERO_STATS: { hp: '_per_hp', attackdamage: '_per_attackDamage' } as Record<string, string>,
    CARD_SET_POINT_STAT: '_per_attackDamage_CardSetPoint',
    CARD_SET_POINT_TARGET_STAT: '_per_attackDamage',
    CARD_SET_POINT_FIELD: 'relicLink_cardSetBonus',
    /** 레벨 입력 칸 격자 최소 폭 (px) */
    INPUT_MIN_WIDTH: 150,
  },
} as const;
