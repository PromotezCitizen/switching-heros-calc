/** 계산·화면에 쓰는 숫자를 한 곳에 모은다 (코드 안에 숫자를 직접 쓰지 않는다) */
import { HERO_CONSTS } from '@/consts/hero';
import { HERO_WEAPON_CARD_PET_CONSTS } from '@/consts/heroWeaponCardPet';
import { MASTERY_RUNE_BUFF_CONSTS } from '@/consts/masteryRuneBuff';
import { PROVIDER_CONSTS } from '@/consts/providers';
import { SKILL_CONSTS } from '@/consts/skill';
import { SUMMARY_CONSTS } from '@/consts/summary';
import { TEXT_LINES_CONSTS } from '@/consts/textLines';
import { TRAINING_RELIC_CONSTS } from '@/consts/trainingRelic';
import { USB_CONSTS } from '@/consts/usb';
import { LOAD_CONSTS } from '@/consts/load';
import { DPM_CONSTS } from '@/consts/dpm';
import { STAT_VIEWER_CONSTS } from '@/consts/statViewer';

export const CONSTS = {
  /** 탭 묶음별 상수 (파일은 src/consts/) */
  hero: HERO_CONSTS,
  textLines: TEXT_LINES_CONSTS,
  trainingRelic: TRAINING_RELIC_CONSTS,
  masteryRuneBuff: MASTERY_RUNE_BUFF_CONSTS,
  heroWeaponCardPet: HERO_WEAPON_CARD_PET_CONSTS,
  skill: SKILL_CONSTS,
  summary: SUMMARY_CONSTS,
  providers: PROVIDER_CONSTS,
  usb: USB_CONSTS,
  load: LOAD_CONSTS,
  dpm: DPM_CONSTS,
  statViewer: STAT_VIEWER_CONSTS,

  common: {
    PERCENT_DIVISOR: 100,
    SECONDS_PER_MINUTE: 60,
    /** 계산식에서 빼는 스탯 (: "계산식에서 명중은 뺀다", 대소문자 구분 없음) */
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

  /**
   * 요정의 축복 EXP·골드 % = min(최대, 기본 + 레벨당 × (레벨 − 1)) — 서버 표 AdsBuff buff3·buff4.
   * 사냥 보상에는 이 값이 TIMES 번 들어간다 (게임 보상 배율 함수가 제공자 컨테이너와 최종 컨테이너에서 두 번 읽음, hunting-always-bonus.md)
   */
  fairy: {
    BASE_PERCENT: 25,
    PER_LEVEL_PERCENT: 0.1,
    MAX_PERCENT: 50,
    TIMES: 2,
  },

  /** 길드 스킬 "스테이지 경험치·골드·정수 1~5": 스킬 n 은 레벨당 +2n%, 열리는 길드 레벨 unlock */
  guild: {
    SKILLS: [
      { unlock: 23, perLevel: 2 },
      { unlock: 32, perLevel: 4 },
      { unlock: 44, perLevel: 6 },
      // 4번째 (스킬 order 8) 는 길드 Lv56 (서버 Option guild_lv_56 add_guild_skill_order 8, 예전 HTML 58 은 틀림 — html-verify-B-2026-11-07.md G07, 2026-11-07 확인)
      { unlock: 56, perLevel: 8 },
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
    offlineFloor: 7632,
    /** 온라인 분당 처치 수를 비우면 쓰는 값 (온라인 효율 계산기 floor-calc DEFAULT_KILLS) */
    myKills: 800,
  } as Record<string, number>,

  /**
   * 사냥 계산기 (온라인 효율 계산기 floor-calc 를 옮김).
   * 예전 "간격으로 훑기 · -50층까지만" 은 floor-calc 의 25층 벽 목록으로 바뀌었다.
   */
  hunting: {
    /** 가장 낮은 층 */
    MIN_FLOOR: 1,
    /** 25층마다 벽: 25n 층에서 몬스터가 세지고 25n+1 층부터 보상이 오른다 */
    WALL_STEP: 25,
    /** 목록을 자르는 손익분기 처치 수 (한 방에 잡으면 분당 1000마리 안팎). 분당 처치 수를 더 크게 넣으면 그 수 */
    CUT_KILLS: 1000,
    /** 목록 최대 줄 수 */
    MAX_ROWS: 300,
    /** 걸리는 시간 · 도시락 표시 상한 (넘으면 "999일+" · "99,999개+") */
    MAX_SHOWN_DAYS: 999,
    MAX_SHOWN_LUNCHBOXES: 99999,
    MINUTES_PER_HOUR: 60,
    HOURS_PER_DAY: 24,
    /** 시간을 일로 함께 적을 때 소수 자리 */
    DAY_DECIMALS: 1,
    /** 배수 소수 자리 */
    RATIO_DECIMALS: 2,
    /** 도시락 (먹으면 오프라인 보상을 그 시간만큼 바로 받음, 최고 층 기준): 중급 1시간 */
    LUNCHBOX_MINUTES: 60,
    /** 넓은 화면 표로 바꾸는 너비 (Mantine 중단점). 좁으면 층마다 카드 */
    WIDE_FROM: 'md',
    /** 제보 링크 (floor-calc 와 같은 구글 폼) */
    REPORT_URL:
      'https://docs.google.com/forms/d/e/1FAIpQLSfmcH7NM7QumUckh_tdUuuk_VmXXNBT5JLEygmdB1jTY1A0RQ/viewform?usp=pp_url&entry.1594761751=0%25(%EC%97%86%EC%9D%8C)&entry.506801763=0%25(%EC%97%86%EC%9D%8C)&entry.1270816294=0%25(%EC%97%86%EC%9D%8C)&entry.1020448729=X&entry.135084558=X&entry.1144504272=X',
    /**
     * 계정 레벨 L → L+1 필요 경험치 (레벨 구간별 식, floor-calc LEVEL_EXP 그대로). 1e308 을 넘는 구간이 있어 log10 으로 다룬다.
     * early: [시작, 끝, 필요 경험치], 149~7799 묶음 바탕값 d_1 = midFirst, d_(j+1) = (d_j + midStep × j²) × midGrowth
     */
    LEVEL_EXP: {
      EARLY: [
        [1, 1, 20000],
        [2, 15, 1000],
        [16, 30, 3000],
        [31, 148, 8000],
      ] as [number, number, number][],
      MID_END: 7799,
      MID_FIRST: 3122.93,
      MID_STEP: 9900,
      MID_GROWTH: 1.57,
      MID_PER_LEVEL: 100,
      HIGH_END: 140499,
      HIGH_BASE_LOG: Math.log10(4.1495685767029427) + 20,
      HIGH_BUNDLE_BASE: 78,
      BUNDLE_GROWTH_LOG: Math.log10(1.647715),
      PER_LEVEL_RATE: 0.0005,
      ROUND_FROM: 60000,
      ROUND_DIGITS: 1000,
      HIGHER_END: 299999,
      HIGHER_BASE_LOG: Math.log10(2.63289) + 308,
      HIGHER_BUNDLE_BASE: 1405,
      TOP_END: 315000,
      TOP_BASE_LOG: Math.log10(2.225) + 654,
      TOP_BUNDLE_BASE: 3000,
      TOP_BUNDLE_GROWTH_LOG: Math.log10(1.6485),
      TOP_IN_BUNDLE_LOG: Math.log10(1.05),
      LAST_BASE_LOG: Math.log10(8.141) + 686,
      LAST_PER_LEVEL_LOG: Math.log10(1.0004880206850599),
      LAST_BUNDLE_LOG: Math.log10(1.5700708684432332),
      BUNDLE: 100,
      /** 이보다 먼 목표는 계산하지 않음 */
      MAX_SPAN: 1000000,
    },
  },

  /**
   * 게임 큰 수 표기: 단위 문자 A=1e3, B=1e6 … Z, AA … ZZ, AAA … (대소문자 구분 없이 읽고 대문자로 표기).
   * 게임 단위 함수 m850 과 같은 엑셀 열 이름 방식 (1=a … 26=z, 27=aa, 53=ba …), 최대 8글자
   * (claude-docs/app_dump/il2cpp_analysis/full/library-calc-relevant.md 81줄. 예전 HTML 은 2글자까지만 읽었음)
   */
  gameNumber: {
    LOG_PER_UNIT: 3,
    /** 이 값(log10) 미만은 단위 없이 일반 숫자로 표기 */
    UNIT_FROM_LOG: 4,
    LETTER_COUNT: 26,
    /** 단위 글자 최대 수 (게임 m850 버퍼 8칸) */
    MAX_UNIT_LETTERS: 8,
    UPPER_A_CODE: 65,
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
    /** 선택지가 이 개수 이하이면 버튼으로 다 보여 주고, 넘으면 드롭다운 (경계 개수는 제안값) */
    CHOICE_BUTTONS_MAX_OPTIONS: 10,
    /** 콘텐츠 칸 폭 종류별 최소 폭 (px). 화면 폭이 남으면 칸들이 나란히 놓이고 늘어나 한 줄을 채운다 */
    TAB_MIN_WIDTH: { narrow: 450, wide: 720 },
    /** 화면 폭이 이보다 크면 TAB_STACKS 의 칸들을 한 칸 폭 안에 위아래로 쌓는다 */
    TAB_STACK_MIN_SCREEN_WIDTH: 1400,
    /**
     * 화면 폭이 이 이상이면 계정 페이지를 왼쪽 목록 + 오른쪽 칸 하나로 그린다 (좁으면 묶음 탭 + 접이식 칸).
     * 600 = 안드로이드 화면 크기 구분에서 폰 (600 미만) 과 펼친 폴더블 · 태블릿 (600 이상) 의 경계
     */
    SIDE_NAV_MIN_SCREEN_WIDTH: 600,
    /** 왼쪽 목록 폭 (px) */
    SIDE_NAV_WIDTH: 220,
    /** 칸 안 카드 격자: 열 수를 정하지 않고 카드 최소 폭만 정한다 (화면에 들어가는 만큼 가로로) */
    CARD_MIN_WIDTH: { small: 120, medium: 180, large: 260 },
    /** 일기장 슬롯 12개는 화면 폭과 상관없이 늘 4행 × 3열 */
    DIARY_SLOT_COLUMNS: 3,
    /** 위쪽에 고정한 메인 탭 줄의 실제 높이를 담는 CSS 변수 이름. 그 아래에 하위 탭 줄을 붙여 고정할 때 위치로 쓴다 */
    STICKY_HEADER_HEIGHT_VAR: '--sticky-header-height',
    /** 메인 탭 줄 아래에 고정한 하위 탭 줄의 실제 높이 CSS 변수. 그 아래에 붙여 고정하는 제목 줄 (특성 열 제목 등) 이 쓴다 */
    STICKY_SUB_TAB_HEIGHT_VAR: '--sticky-sub-tab-height',
    /** 하위 탭 줄 아래에 고정한 콘텐츠 칸 제목 줄 (특성·룬 등) 의 실제 높이 CSS 변수. 칸 안 고정 줄 (특성 열 제목) 이 그 아래에 붙는다 */
    STICKY_CONTENT_TITLE_HEIGHT_VAR: '--sticky-content-title-height',
    /** 콘텐츠 칸 테두리 두께 (px, Mantine 접이식 separated 모양) */
    CONTENT_BORDER_WIDTH: 1,
    /**
     * 하위 탭 줄과 콘텐츠 칸 사이 간격 (px). 붙어 있으면 화면 배율 125% 등에서 반올림으로 하위 탭 줄 배경이 칸 위쪽 선을 덮는다.
     * 고정된 칸 제목도 이만큼 아래에 멈춘다 (제목 위에 그린 선이 하위 탭 줄에 가리지 않게)
     */
    CONTENT_TOP_GAP: 2,
    /** 위쪽에 고정하는 탭 줄이 다른 화면 위에 보이게 하는 겹침 순서 */
    STICKY_HEADER_Z_INDEX: 100,
    /** 게임 목록처럼 한 줄씩 늘어놓는 입력 칸의 너비 (px) */
    LIST_INPUT_WIDTH: 180,
    TABLE_MIN_WIDTH: 420,
  },
} as const;
