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
  /** 화면 칸 폭 (px): 레벨 숫자 칸 · 장착 칸 드롭다운 */
  LEVEL_INPUT_WIDTH: 56,
  EQUIP_SELECT_WIDTH: 150,
  /** 보유 스킬 표가 이 폭보다 좁아지면 가로 스크롤 */
  TABLE_MIN_WIDTH: 410,
} as const;
