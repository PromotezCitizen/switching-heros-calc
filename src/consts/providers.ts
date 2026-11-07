/** 피규어 개수형 효과의 N 종류 */
export type FigureCountKind = 'figureLevelDC' | 'figureLevelDCB' | 'mythicFigures' | 'stickerPoints' | 'weaponTranscend' | 'heroAwaken';

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
    /**
     * 개수형 효과 (게임 m2684, 1 + (v − 1) × N = 값 × N %): 효과 이름 → 넣는 스탯과 N 의 종류
     * (claude-docs/react-port/stat-provider-formulas.md 453~454줄, 사용자 지시 2026-11-07 "다 계산해라").
     * 등급 글자 ↔ 이름 (D 고급 · C 희귀 · B 영웅 · A 전설 · S 신화) 은 번역 표 이름과 등급별 피규어 수로 맞춘 것 (유력)
     */
    COUNT_STATS: {
      _per_attackDamage_FigureLvSumDC: { target: '_per_attackDamage', count: 'figureLevelDC' },
      _per_hp_FigureLvSumDC: { target: '_per_hp', count: 'figureLevelDC' },
      _per_attackDamage_FigureLvSumDCB: { target: '_per_attackDamage', count: 'figureLevelDCB' },
      _per_hp_FigureLvSumDCB: { target: '_per_hp', count: 'figureLevelDCB' },
      _per_attackDamage_MythicFigureCnt: { target: '_per_attackDamage', count: 'mythicFigures' },
      _per_attackDamage_StickerPointSum: { target: '_per_attackDamage', count: 'stickerPoints' },
      _per_attackDamage_WeaponTrLvSum: { target: '_per_attackDamage', count: 'weaponTranscend' },
      _per_attackDamage_AwakenLvSum: { target: '_per_attackDamage', count: 'heroAwaken' },
    } as Record<string, { target: string; count: FigureCountKind }>,
    /** 레벨 합에 넣는 등급 (DC = 고급·희귀, DCB = 고급·희귀·영웅), 신화 = S */
    LEVEL_SUM_GRADES: { figureLevelDC: ['D', 'C'], figureLevelDCB: ['D', 'C', 'B'] } as Record<string, string[]>,
    MYTHIC_GRADE: 'S',
    /** 피규어 카드 격자 최소 폭 (px) */
    CARD_MIN_WIDTH: 260,
    /** 피규어 그림: public/icons/Atlas_FigureIMG/figure_<그림 번호, 두 자리 이상>.png (그림 번호는 아이템 표 imgName, figureImages.json) */
    ICON_FOLDER: 'Atlas_FigureIMG',
    ICON_PREFIX: 'figure_',
    ICON_DIGITS: 2,
    ICON_SIZE: 64,
    /** 레벨 입력 칸 폭 (px) */
    LEVEL_INPUT_WIDTH: 96,
  },

  /**
   * 프로필 테두리 보유 효과 (5.70 에서 새로 생긴 합산기 T1282 의 31번째 제공자, 채움 함수 새 @30d69f0 — claude-docs/react-port/attack-formula-5.70.md,
   * 함수 구조 확정 · 이름이 테두리라는 것은 유력). 보유한 테두리 번호 (저장 Relic.frameIdList) 마다 표 Frame 의 (스탯, 값) 을 한 번씩 넣는다.
   * 장착한 테두리가 아니라 보유한 테두리 전부이고 (사용자 확인), `_per_` 스탯이라 한 줄마다 곱해진다. 표는 5.70 앱 내장 표 (서버 값과 같다는 것은 유력)
   */
  frame: {
    TABLE: 'Frame',
    OWNED_FIELD_PREFIX: 'frameOwned_',
    ID_COLUMN: 'frameId',
    STAT_COLUMN: 'statType',
    VALUE_COLUMN: 'statValue',
    /** 보유 칸 격자 최소 폭 (px) */
    FLAG_MIN_WIDTH: 260,
  },

  /**
   * 별자리 유물 (유물 화면의 "별자리 유물", 표 AncientRelic 5.70 앱 내장 값 · 저장 Dispatch.ancientRelicData).
   * 칸 하나 = (별자리, 단계, 칸 번호) 의 줄 하나: 값 = 기본 + 강화당 × 레벨 (`_per_` 스탯이라 줄마다 곱해진다).
   * 달성한 별자리 (_masteredList) 는 모든 칸이 최대 레벨 · 모든 단계 켜짐, 진행 중인 별자리는 저장 레벨 그대로이고 단계가 켜졌을 때만
   * 단계 보너스 칸 (번호 1000, 최대 레벨 1) 이 들어간다. 이 규칙으로 별자리 효과 화면 9개 값 (검사 공격력 3,806% · 공격력 1,500% · 체력 12.4A% …)
   * 이 정확히 재현됨 (2026-10-31 화면). 화면의 % 는 줄을 곱한 값 − 1
   */
  ancientRelic: {
    TABLE: 'AncientRelic',
    /** 입력 칸: 달성한 별자리 번호 목록 (쉼표), 진행 중 별자리 */
    MASTERED_FIELD: 'ancientMastered',
    PROGRESS_FIELD: 'ancientProgress',
    CONST_COLUMN: 'constId',
    STEP_COLUMN: 'step',
    NODE_COLUMN: 'idx',
    MAX_LEVEL_COLUMN: 'maxLv',
    BASE_COLUMN: 'baseVal',
    ENHANCE_COLUMN: 'enhVal',
    STAT_COLUMN: 'statType',
    /** 진행 글: 항목 구분 ';', 항목 = 별자리:단계:켜짐(0/1):칸=레벨,칸=레벨 */
    ENTRY_SEPARATOR: ';',
    FIELD_SEPARATOR: ':',
    NODE_SEPARATOR: ',',
    LEVEL_SEPARATOR: '=',
    LIST_SEPARATOR: ',',
    /** 단계 보너스 칸 번호 */
    STEP_BONUS_NODE: '1000',
    /** 진행 글 입력 칸 높이 (줄) */
    PROGRESS_ROWS: 4,
  },
} as const;
