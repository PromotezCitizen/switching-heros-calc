/** 계산·화면에 쓰는 숫자를 한 곳에 모은다 (코드 안에 숫자를 직접 쓰지 않는다) */
import { HERO_CONSTS } from './consts/hero';
import { HERO_WEAPON_CARD_PET_CONSTS } from './consts/heroWeaponCardPet';
import { MASTERY_RUNE_BUFF_CONSTS } from './consts/masteryRuneBuff';
import { SKILL_CONSTS } from './consts/skill';
import { SUMMARY_CONSTS } from './consts/summary';
import { TEXT_LINES_CONSTS } from './consts/textLines';
import { TRAINING_RELIC_CONSTS } from './consts/trainingRelic';

export const CONSTS = {
  /** 탭 묶음별 상수 (파일은 src/consts/) */
  hero: HERO_CONSTS,
  textLines: TEXT_LINES_CONSTS,
  trainingRelic: TRAINING_RELIC_CONSTS,
  masteryRuneBuff: MASTERY_RUNE_BUFF_CONSTS,
  heroWeaponCardPet: HERO_WEAPON_CARD_PET_CONSTS,
  skill: SKILL_CONSTS,
  summary: SUMMARY_CONSTS,

  common: {
    PERCENT_DIVISOR: 100,
    SECONDS_PER_MINUTE: 60,
    /** 계산식에서 빼는 스탯 (사용자 지시: "계산식에서 명중은 뺀다", 대소문자 구분 없음) */
    EXCLUDED_STATS: ['_per_hit', 'hit'],
  },

  /** 오프라인 보상: 기본 200마리 / 60초, 광고 보상 기본 +20% */
  offline: {
    BASE_KILLS: 200,
    BASE_TIME_SECONDS: 60,
    AD_BASE_PERCENT: 20,
    PACKAGE: { kills: 20, timeSeconds: 10, adPercent: 20 },
    /** VIP 전투 시간 감소 — 서버 표 Vip (레벨 큰 것부터) */
    VIP_TIME_DOWN: [
      { level: 17, seconds: 14 },
      { level: 5, seconds: 4 },
    ],
    /** VIP 광고 보상 증가 — 서버 표 Vip (레벨 큰 것부터) */
    VIP_AD_UP: [
      { level: 11, percent: 40 },
      { level: 6, percent: 10 },
    ],
  },

  /** VIP 사냥 보너스 [처음 레벨, 처음 값, 두 번째 레벨, 두 번째 값] — 서버 표 Vip (누적) */
  vipOnline: {
    exp: [12, 15, 20, 50],
    gold: [13, 15, 21, 50],
    ess: [14, 15, 22, 50],
  },

  /** 요정의 축복 EXP·골드 % = min(최대, 기본 + 레벨당 × (레벨 − 1)) — 서버 표 AdsBuff buff3·buff4 */
  fairy: {
    BASE_PERCENT: 25,
    PER_LEVEL_PERCENT: 0.1,
    MAX_PERCENT: 50,
  },

  /** 길드 스킬 "스테이지 경험치·골드·정수 1~5": 스킬 n 은 레벨당 +2n%, 열리는 길드 레벨 unlock */
  guild: {
    SKILLS: [
      { unlock: 23, perLevel: 2 },
      { unlock: 32, perLevel: 4 },
      { unlock: 44, perLevel: 6 },
      { unlock: 58, perLevel: 8 },
      { unlock: 60, perLevel: 10 },
    ],
    SKILL_MAX_LEVEL: 5,
  },

  /** 직접 사냥 전용 보너스 % */
  onlineBonus: {
    FOOD_PERCENTS: [25, 60, 125],
    EVENT_PERCENT: 100,
    PACKAGE_PERCENT: 100,
  },

  /** 사냥 계산기 입력 기본값 */
  huntingDefaults: {
    otherAlways: 50,
    offlineFloor: 7632,
    scanStep: 1,
    myKills: 0,
  } as Record<string, number>,

  hunting: {
    /** 가장 낮은 층 */
    MIN_FLOOR: 1,
    /** 오프라인 받는 층에서 몇 층 아래까지 볼지 (사용자 지시 "-50층까지만") */
    SCAN_DEPTH: 50,
    /** 층별 결과 표: 넓은 화면 2열, 좁은 화면 1열 */
    RESULT_COLUMNS: { base: 1, lg: 2 },
  },

  /** 게임 큰 수 표기: 단위 문자 A=1e3, B=1e6 … Z, AA … (대소문자 구분 없이 읽고 대문자로 표기) */
  gameNumber: {
    LOG_PER_UNIT: 3,
    /** 이 값(log10) 미만은 단위 없이 일반 숫자로 표기 */
    UNIT_FROM_LOG: 4,
    LETTER_COUNT: 26,
    /** 두 글자 단위(AA…)의 시작 번호 */
    TWO_LETTER_UNIT_START: 27,
    UPPER_A_CODE: 65,
    LOWER_A_CODE: 97,
    /** 'a' 의 코드 − 1 (a → 1 번) */
    LOWER_BEFORE_A_CODE: 96,
    /** 가수가 이 값 이상이면 다음 단위로 올림 */
    CARRY_MANTISSA: 999.995,
    MANTISSA_DECIMALS: 2,
    PLAIN_DECIMALS: 2,
    /** log10(1 + 10^x) 에서 x 가 이 값보다 크면 1 을 무시 */
    ONE_PLUS_IGNORE_FROM: 15,
  },

  /** 출처 줄 합산 (앱 코드 규칙) */
  combine: {
    /** 화면 값 줄의 log 상한 (10^300) */
    MAX_LOG: 300,
    /** % 는 100 으로 나누므로 log 에서 빼는 값 */
    PERCENT_LOG_OFFSET: 2,
    MIN_POSITIVE: 1e-300,
  },

  /** 입력이 비어 있을 때의 시작값 */
  emptyInput: {
    LEVEL: 0,
    PERCENT: 0,
    OFFLINE_FLOOR: 1,
  },

  /** 화면 표시 */
  display: {
    MAX_TABLE_ROWS: 500,
    EXPONENT_FORM_FROM: 1e15,
    SMALL_VALUE_BELOW: 10,
    SMALL_VALUE_DECIMALS: 2,
    GUILD_SELECT_WIDTH: 72,
    /** 선택지가 이 개수 이하이면 버튼으로 다 보여 주고, 넘으면 드롭다운 (사용자 결정 "dropdown", 경계 개수는 제안값) */
    CHOICE_BUTTONS_MAX_OPTIONS: 10,
    /** 콘텐츠 칸 폭 종류별 최소 폭 (px). 화면 폭이 남으면 칸들이 나란히 놓이고 늘어나 한 줄을 채운다 */
    TAB_MIN_WIDTH: { narrow: 450, wide: 720 },
    /** 화면 폭이 이보다 크면 TAB_STACKS 의 칸들을 한 칸 폭 안에 위아래로 쌓는다 (사용자 지시 "1400보다 크면 캐릭터, 베르 위아래로") */
    TAB_STACK_MIN_SCREEN_WIDTH: 1400,
    /** 칸 안 카드 격자: 열 수를 정하지 않고 카드 최소 폭만 정한다 (화면에 들어가는 만큼 가로로) */
    CARD_MIN_WIDTH: { small: 120, medium: 180, large: 260 },
    /** 위쪽에 고정한 메인 탭 줄의 실제 높이를 담는 CSS 변수 이름. 그 아래에 하위 탭 줄을 붙여 고정할 때 위치로 쓴다 */
    STICKY_HEADER_HEIGHT_VAR: '--sticky-header-height',
    /** 메인 탭 줄 아래에 고정한 하위 탭 줄의 실제 높이 CSS 변수. 그 아래에 붙여 고정하는 제목 줄 (특성 열 제목 등) 이 쓴다 */
    STICKY_SUB_TAB_HEIGHT_VAR: '--sticky-sub-tab-height',
    /** 하위 탭 줄 아래에 고정한 콘텐츠 칸 제목 줄 (특성·룬 등) 의 실제 높이 CSS 변수. 칸 안 고정 줄 (특성 열 제목) 이 그 아래에 붙는다 */
    STICKY_CONTENT_TITLE_HEIGHT_VAR: '--sticky-content-title-height',
    /** 콘텐츠 칸 테두리 두께 (px, Mantine 접이식 separated 모양) */
    CONTENT_BORDER_WIDTH: 1,
    /** 위쪽에 고정하는 탭 줄이 다른 화면 위에 보이게 하는 겹침 순서 */
    STICKY_HEADER_Z_INDEX: 100,
    /** 게임 목록처럼 한 줄씩 늘어놓는 입력 칸의 너비 (px) */
    LIST_INPUT_WIDTH: 180,
    TABLE_MIN_WIDTH: 420,
  },
} as const;
