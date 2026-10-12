/** 스킬 탭 상수 */
export const SKILL_CONSTS = {
  /** 직업 스킬 표 (react/scripts/export_skill.py 로 내보냄) */
  TABLE: 'Skill',
  /** 장착 칸 수 (화면 · 저장 데이터 skillIds 길이 · 서버 표 Option skill_slot_unlock_01~05) */
  EQUIP_SLOTS: 5,
  /** Skill 표 skillType 의 액티브 스킬 값 (버프 스킬은 BuffSkill) */
  ACTIVE_SKILL_TYPE: 'ActiveSkill',
  /** 스킬 레벨 시작값 (데미지 % 식의 기준 레벨) */
  FIRST_LEVEL: 1,
  /** 스킬 레벨 최대 (서버 표 SkillLevelUp lv 1~120) */
  MAX_LEVEL: 120,
  /**
   * 스킬 252 다발 화살의 옵션 (스킬 옵션 SkillRune 320: "다발 화살이 적중할 때마다, 5초간 공격력 {0}% 증가 (최대 5중첩)"):
   * 옵션 등급마다 값이 5 / 10 / 15 / 20 / 25 (catalog-skill-option.md 830행). 공격력 % 에 최대 5중첩 선형으로 넣는다
   * (T772 m4670 @2f9ee10, 식 확정 · 등급 번호 6 = 25 대응은 추정 — combat0113.py 116~122, 사용자 결정: 최대 상태).
   * 칸 값은 고른 옵션 값 % (비어 있음 = 옵션 없음)
   */
  ARROW_BARRAGE_OPTION: {
    SKILL_ID: '252',
    FIELD: 'skillOption252',
    PERCENTS: [5, 10, 15, 20, 25],
    MAX_STACKS: 5,
  },
  /** 화면 칸 폭 (px): 레벨 숫자 칸 · 장착 칸 드롭다운 */
  LEVEL_INPUT_WIDTH: 56,
  EQUIP_SELECT_WIDTH: 150,
  /** 보유 스킬 표가 이 폭보다 좁아지면 가로 스크롤 */
  TABLE_MIN_WIDTH: 410,
} as const;
