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
  /** 스킬 옵션 표 (stat-calc/scripts/export_skill.py, 스킬마다 후보 12행. rNo = 저장 데이터 diceOptions[].rNo) */
  RUNE_TABLE: 'SkillRune',
  /** 옵션 값은 최고 등급 (SS) 열 (사용자 결정 2026-10-08 "스킬은 항상 최대 단계 최대 옵션 수치로 가정한다") */
  RUNE_VALUE_COLUMN: 'gradeSS',
  /** 옵션 문구에서 값이 들어가는 자리 */
  RUNE_VALUE_PLACEHOLDER: '{0}',
  /** 옵션 칸 수: Option 표 skill_rune_slot_condition_<n> 의 valueInt1 = 스킬 레벨 조건, valueInt2 = 열리는 칸 수 (catalog-skill-option.md 4-2) */
  SLOT_CONDITION_TABLE: 'Option',
  SLOT_CONDITION_KEY_PREFIX: 'skill_rune_slot_condition_',
  SLOT_CONDITION_LEVEL_COLUMN: 'valueInt1',
  SLOT_CONDITION_COUNT_COLUMN: 'valueInt2',
  /** "스킬 쿨타임 {0}초 감소" 옵션 종류 (SkillRune type) */
  COOL_OPTION_TYPE: '9',
  /** "버프 지속 시간 {0}초 증가" (SkillRune type 12) · "스킬 발동 확률 {0}% 증가" (type 2, 발동 판정 천분율에 × 10) — job-skills-buff-2026-11-05.md 1-2 */
  BUFF_DURATION_OPTION_TYPE: '12',
  PROC_CHANCE_OPTION_TYPE: '2',
  /** 스킬 문양 표 (stat-calc/scripts/export_skill.py): 스킬마다 해금 레벨 (targetLv 60 ~ 120) 별 후보 2개 중 하나 (catalog-skill-option.md 7-1) */
  PERK_TABLE: 'SkillPerk',
  PERK_LEVEL_COLUMN: 'targetLv',
  /** 문양 쿨타임: "{skillName} 쿨타임 {0}초 감소" 는 빼고, "쿨타임이 {0}초 늘어나는 대신 …" 은 더한다 (val1 초) */
  PERK_COOL_DOWN_TYPE: 'CoolTimeDown',
  PERK_COOL_UP_TYPE: 'CoolTimeUpAndSkillDmg',
  PERK_COOL_VALUE_COLUMN: 'val1',
  /** 문양 칸 앞에 붙이는 해금 레벨 글자 폭 (px) */
  PERK_LEVEL_LABEL_WIDTH: 44,
  /**
   * 능력치를 올리는 스킬 옵션 (SkillRune type, catalog-skill-option.md 0-3): 그 옵션을 고르고 스킬을 장착 칸에 꼈을 때 최고 등급 (SS) 값 × 최대 중첩.
   * 다발 화살 252 는 게임 코드로 식 확정 (T772 m4670 @2f9ee10, 값 × 중첩 선형). 나머지는 같은 식으로 넣은 것 (게임 코드 T866 m5008 ·
   * T878 m5073 · T794 m4724 에 효과가 있는 것만 확인, 중첩 식은 미확인). 얼음창 355 (값 × 작은 얼음창 소환 수) 는 소환 수를 못 정해 뺐다
   */
  OPTION_BUFFS: [
    { SKILL_ID: '252', TYPE: '2701', STAT: '_per_attackDamage', MAX_STACKS: 5 },
    { SKILL_ID: '153', TYPE: '1801', STAT: '_per_attackDamage', MAX_STACKS: 6 },
    { SKILL_ID: '155', TYPE: '2003', STAT: '_per_attackDamage', MAX_STACKS: 5 },
    { SKILL_ID: '255', TYPE: '3001', STAT: '_per_attackDamage', MAX_STACKS: 1 },
    // 용의 가호가 지속되는 동안 공격속도 증가
    { SKILL_ID: '104', TYPE: '1403', STAT: 'attackSpeed', MAX_STACKS: 1 },
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
  /** 옵션 고르기 칸 (드롭다운) 펼친 목록 최대 높이 (px) */
  OPTION_DROPDOWN_MAX_HEIGHT: 320,
} as const;
