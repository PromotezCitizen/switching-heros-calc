/** 스킬 탭 상수 */
export const SKILL_CONSTS = {
  /** 직업 스킬 표 (stat-calc/scripts/export_skill.py 로 내보냄) */
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
   * 능력치를 올리는 스킬 옵션 (스킬 옵션 표 SkillRune, catalog-skill-option.md): 입력 칸 없이 최고 등급 (SS) 값 × 최대 중첩으로 계산
   * (사용자 결정 2026-10-08 "스킬은 항상 최대 단계 최대 옵션"), 그 스킬을 장착 칸에 꼈을 때만.
   * 다발 화살 252 는 게임 코드로 식 확정 (T772 m4670 @2f9ee10, 값 × 중첩 선형). 나머지는 같은 식으로 넣은 것 (게임 코드 T866 m5008 ·
   * T878 m5073 · T794 m4724 에 효과가 있는 것만 확인, 중첩 식은 미확인). 얼음창 355 (값 × 작은 얼음창 소환 수) 는 소환 수를 못 정해 뺐다
   */
  OPTION_BUFFS: [
    { SKILL_ID: '252', STAT: '_per_attackDamage', MAX_PERCENT: 25, MAX_STACKS: 5 },
    { SKILL_ID: '153', STAT: '_per_attackDamage', MAX_PERCENT: 10, MAX_STACKS: 6 },
    { SKILL_ID: '155', STAT: '_per_attackDamage', MAX_PERCENT: 15, MAX_STACKS: 5 },
    { SKILL_ID: '255', STAT: '_per_attackDamage', MAX_PERCENT: 100, MAX_STACKS: 1 },
    // 용의 가호가 지속되는 동안 공격속도 증가
    { SKILL_ID: '104', STAT: 'attackSpeed', MAX_PERCENT: 50, MAX_STACKS: 1 },
  ],
  /** 스킬 아이콘 (public/icons/Atlas_Skill_Lobby/Skill_Icon_<번호>). 게임 그림 이름이 소문자 icon 인 번호 3개는 따로 */
  ICON_PREFIX: 'Atlas_Skill_Lobby/Skill_Icon_',
  LOWER_CASE_ICON_PREFIX: 'Atlas_Skill_Lobby/Skill_icon_',
  LOWER_CASE_ICON_IDS: ['1', '101', '301'],
  /** 화면 크기 (px): 레벨 숫자 칸, 장착 칸 하나 폭, 보유 스킬 표의 아이콘, 직업 카드 최소 폭 */
  LEVEL_INPUT_WIDTH: 56,
  EQUIP_SLOT_WIDTH: 80,
  ROW_ICON_SIZE: 24,
  JOB_CARD_MIN_WIDTH: 300,
} as const;
