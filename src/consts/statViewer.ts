/** 스탯 모아 보기 페이지 상수 */
export const STAT_VIEWER_CONSTS = {
  /** 계산 방식 칩 순서 (statMeta.json stats[].kind) */
  KIND_ORDER: ['percent', 'multiply', 'plain', 'down', 'base', 'pow'] as readonly string[],
  /** 조건 칩 순서 (statMeta.json stats[].tags 의 갈래 이름) */
  TAG_TYPES: ['기본', '직업', '속성', '성별', '대상', '스킬', '발동', '수량 비례', '기타 조건'] as readonly string[],
  /** 낮은 등급 → 높은 등급 (각성 MAX1 ~ MAX100 까지). "S ~ SSS" 같은 범위는 앞 등급으로 정렬 */
  GRADE_ORDER: [
    'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'R', 'SR', 'SSR', 'UR', 'URP', 'UUR', 'XR', 'XRP', 'LR', 'LRP',
    'IR', 'IRP', 'CR', 'CRP', 'VR', 'VRP', 'GR', 'GRP', 'ZR', 'ZRP',
    ...Array.from({ length: 100 }, (_, index) => `MAX${index + 1}`),
  ] as readonly string[],
  GRADE_RANGE_SEPARATOR: ' ~ ',
  /** 낮은 등급부터 보여 주는 표 (나머지는 높은 등급부터) */
  ASCENDING_TABLES: ['Awaken', 'Relic'] as readonly string[],
  /** 출처가 statMeta 에 없고 원본만 보여 주는 해석 미확인 표 (지금은 없음) */
  UNRESOLVED_TABLES: [] as readonly string[],
  /** 원본 표 폴더 (public/data 아래, scripts/export_stat_viewer.py 가 만듦) */
  TABLE_DIR: 'statViewerTables',
  /** 특성 표는 묶음 제목에 특성 이름을 붙인다 */
  MASTERY_TABLE: 'Mastery',
  /** 이 값부터 게임 단위 (a, b, …) 로 쓴다 */
  UNIT_FROM: 1e4,
  PLAIN_MAX_DECIMALS: 4,
  /** 표에 레벨 표기가 없을 때 ({} = 레벨) */
  DEFAULT_LEVEL_FORMAT: 'Lv{}',
  LEVEL_PLACEHOLDER: '{}',
  VALUE_PLACEHOLDER: '{0}',
  VALUE_PLACEHOLDER_TEXT: 'N',
  FAMILY_LIST_MAX_HEIGHT: '70vh',
  RAW_TABLE_MAX_HEIGHT: 320,
  ENTITY_MIN_WIDTH: '12rem',
  ENTITY_MAX_WIDTH: '28rem',
} as const;
