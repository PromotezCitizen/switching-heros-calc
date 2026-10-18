/** 훈련·유물 탭에 쓰는 숫자. CONSTS.trainingRelic 로 접근한다 */
export const TRAINING_RELIC_CONSTS = {
  training: {
    /** 현재 단계 항목 레벨 칸 수 (trainingLevel1 ~ 4) */
    ITEM_COUNT: 4,
    /** 항목 칸 번호의 시작 (trainingLevel1) */
    FIRST_ITEM_NUMBER: 1,
    /** 게임 화면 단계 = 수치표 단계 (grade) + 1 (화면 177단계 = 표 176) */
    SCREEN_STAGE_OFFSET: 1,
    /** gradeUpMultiply 가 비었을 때 쓰는 배율 */
    DEFAULT_GRADE_UP_MULTIPLY: 1,
    /** 현재 단계 행에 곱하는 배율 (끝낸 단계만 gradeUpMultiply) */
    CURRENT_STAGE_MULTIPLY: 1,
  },
  relic: {
    /**
     * 직업 일반 무기 합산 레벨 유물: 합산 레벨 ÷ 100 (내림) 을 곱한다.
     * 서버 문구는 "10당" 이지만 게임 코드 m2690 이 100 으로 나눈다 (gap-atk-increase-provider.md 4-4, 코드를 따름)
     */
    WEAPON_LEVEL_DIVISOR: 100,
    /** 유물 "SS 등급 이상 / SSS 등급 이상 히어로 수" 의 기준 등급 (히어로 표의 지금 등급으로 셈) */
    SS_GRADE: 'SS',
    SSS_GRADE: 'SSS',
    /** 룬 연동 유물 번호 (_relic_rune_dmg_1 의 1) → 룬 칸 번호 (rune_0) 차이 */
    RUNE_NUMBER_OFFSET: 1,
    /** 유물의 축복 = Σ (레벨 − 1) × 등급별 강화 1번당 축복 */
    BLESSING_LEVEL_OFFSET: 1,
    /** 최대 등급을 고르면 낮은 등급 유물 중 레벨 0 을 이 레벨로 채운다 */
    FILL_LOWER_GRADE_LEVEL: 1,
    /** 화면: 미보유 유물 카드 흐림, 아이콘 크기 (px) */
    UNOWNED_OPACITY: 0.5,
    OWNED_OPACITY: 1,
    ICON_SIZE: 48,
    /**
     * 등급별 유물 강화 1번당 유물의 축복. 출처: 서버 수치표 캐시에서 만든 statMeta.json 의 labels.relicExpPerEnh
     * (기존 htmls 의 STAT_DATA.labels.relicExpPerEnh 와 같은 값)
     */
    BLESSING_PER_ENHANCE: {
      D: 1,
      C: 1,
      B: 2,
      A: 10,
      S: 80,
      SS: 500,
      SSS: 5000,
      R: 25000,
      SR: 125000,
      SSR: 625000,
      UR: 3125000,
      URP: 15625000,
      UUR: 78125000,
      XR: 390625000,
      XRP: 1953125000,
      LR: 9765625000,
      LRP: 48828000000,
      IR: 244140000000,
      IRP: 1220700000000,
      CR: 6103500000000,
      CRP: 30518000000000,
      VR: 152590000000000,
      VRP: 762940000000000,
      GR: 3814700000000000,
    } as Record<string, number>,
  },
} as const;
