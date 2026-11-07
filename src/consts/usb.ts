/** 휴대폰에서 불러오기: USB (WebUSB + ADB) 로 게임 저장 파일을 읽어 입력 칸을 채운다 */
export const USB_CONSTS = {
  /** 게임이 저장 JSON 을 두는 휴대폰 폴더 */
  GAME_FILES_DIR: '/sdcard/Android/data/com.zilliongames.collectionidle/files',
  /** 저장 JSON 파일 이름 (data_a_<날짜>_Card.json 등 10개) */
  SAVE_FILE_PATTERN: /^data_a_.*\.json$/,
  /** 휴대폰 브라우저 판별 (User-Agent). 아이패드 데스크톱 모드는 platform MacIntel + 터치로 따로 가림 */
  ANDROID_USER_AGENT: /Android/i,
  IOS_USER_AGENT: /iPhone|iPad|iPod/i,
  IPAD_DESKTOP_PLATFORM: 'MacIntel',
  /** 불러오기 창 USB 안내 단계 수 (번역 usb.steps.1 ~) */
  STEP_COUNT: 5,
  /** 앱플레이어 (폴더) 불러오기 안내 단계 수 (번역 usb.folder.steps.1 ~) */
  FOLDER_STEP_COUNT: 4,
  /** 앱플레이어용 저장 받기 실행 파일 (public 아래 경로) 과 내려받을 때 이름 */
  SAVE_TOOL_PATH: 'tools/collectionidle-save.bat',
  SAVE_TOOL_FILE_NAME: '컬렉션아이들-세이브받기.bat',
  /** 저장 데이터에 없어서 불러와도 안 채워지는 항목 (번역 usb.manualItems.<이름>). 저장 가져오기에 새로 넣으면 여기서 뺀다 */
  MANUAL_INPUT_ITEMS: ['coreMasterySelect', 'cardSticker'] as readonly string[],

  /** 저장 데이터로 채우는 입력 글: 소수 자리 (표시용 2자리보다 많이 남겨 계산 오차를 줄임) */
  SAVE_TEXT_DECIMALS: 6,
  /** log10 이 이 값 미만이면 단위 없이 숫자 그대로 (1만 미만) */
  SAVE_TEXT_UNIT_FROM_LOG: 4,
  /** 단위 글자 하나 = 10^3 */
  LOG_PER_UNIT: 3,
  /** 배율 → % 로 바꿀 때 × 100 = log10 + 2 */
  PERCENT_LOG_SHIFT: 2,
  /** 배율 log10 이 이 값을 넘으면 (배율 − 1) 의 − 1 을 무시 */
  MULTIPLIER_LOG_DIRECT_FROM: 15,
  /** 히어로의 기록 옵션: 주사위 표 번호, 옵션 묶음 키 */
  LIBRARY_DICE_ID: '2',
  LIBRARY_OPTION_KEY: 0,
  /** 저장 변환에 쓰는 계산기 표 */
  SAVE_IMPORT_TABLES: [
    'Character',
    'CharacterAffinity',
    'Costume',
    'Icon',
    'DiceOption',
    'WeaponChar',
    'WeaponJob',
    'Pet',
    'ContentMission',
    'Awaken',
    'Training',
    'Relic',
    'Card',
    'AlchemySlot',
    'Collection',
    'Title',
  ],
  /** 펫 지역 attIdx → 속성 이름 (입력 칸 petRegionLevel_<속성>) */
  PET_REGION_ATTRIBUTES: { 1: 'Fire', 2: 'Water', 3: 'Earth' } as Record<number, string>,
  /** 저장 옵션의 등급 번호 (1 부터) → 주사위 표 grade */
  DICE_GRADES: ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'],
  /** 무기 옵션 주사위 표 번호 */
  WEAPON_DICE_ID: '1',
  /** 얼티밋 1020 · 1021 의 SSS 옵션 판정: 무기 번호 ≥ 1000 (전용 무기) 이고 옵션 등급 번호 > 6 (SS 초과 = SSS 이상), 게임 코드 m2690 */
  SSS_OPTION: { EXCLUSIVE_WEAPON_MIN_ID: 1000, GRADE_ABOVE: 6 },
  /** 무기 링크 symbolLvDic 키 (1 부터) → 직업 */
  WEAPON_LINK_JOBS: ['Swordsman', 'Fighter', 'Archer', 'Mage'],
  /** 장착 무기 번호가 이 값보다 크면 전용 무기 */
  EXCLUSIVE_WEAPON_ID_ABOVE: 999,
  /** 전용 무기 초월 보상 미션 (받은 미션의 공격력 % 를 곱함 / 무기마다 받은 가장 높은 ★) */
  WEAPON_TRANSCEND_CONTENT_TYPE: 'WeaponCharTrans',
  WEAPON_TRANSCEND_MISSION_TYPE: 'WeaponChar_Trans',
  ATTACK_PERCENT_STAT: '_per_attackDamage',
  HP_PERCENT_STAT: '_per_hp',

  /** 훈련: 지금 단계에서 화면에 보이는 능력치 칸 수 */
  TRAINING_SHOWN_STATS: 4,
  /** 유물 연동 칸: 던전 번호 (Progress.dungeonDataDic 키) → 칸 이름 relicLink_<이름> */
  RELIC_LINK_DUNGEONS: { 3: 'dungeonGold', 5: 'dungeonEquip', 6: 'dungeonRelic' } as Record<number, string>,
  /** 유물 연동 칸: 보유 수를 세는 카드 등급 */
  CARD_GRADE_R: 'R',
  CARD_GRADE_SSR: 'SSR',
  /** 룬 칸 값 = 코어 레벨 × 10 + 룬 레벨 */
  RUNE_CORE_MULTIPLIER: 10,
  /** 스킬 옵션 세트 번호: 프리셋별 선택 (eqSkillOptionDic) 이 없으면 이 세트 (catalog-skill-option.md 5-1) */
  FIRST_SKILL_OPTION_SET: 1,
  /**
   * 스킬 문양 번호 (저장 Skill 의 equipPerkOptionDic typeSlots 값, 1부터, 0 = 미적용) → SkillPerk 표 perkType.
   * Localized 표 skill_perk_desc_<perkType> 키가 나오는 순서와 같다. 1 · 5 는 저장 값과 화면으로 확인했고, 그 밖의 1~54 는 이 순서와 코드의 쓰임이 맞는다 (유력).
   * 55~58 은 코드의 계산식 모양으로 순서를 맞췄다 (기본 데미지 곱 55 · 57, 교체 스킬 곱 56 · 58). 번호를 정의한 enum 자체는 읽지 못했다
   */
  SKILL_PERK_TYPES: [
    'BuffPerDownAndSkillDmg', 'BuffPerUpAndSkillDmg', 'CoolTimeUpAndSkillDmg', 'CoolTimeDownAndSkillDmg', 'ChangeCharSkillDmg',
    'SetValue', 'SkillLv', 'SkillLvAndSkillDmg', 'SkillLvAndChangeCharSkillDmg', 'UseAndAttackDmg',
    'UseAndSkillDmg', 'UseAndHp', 'CoolTimeDown', 'SsRuneAndSkillDmg', 'UseAndChangeCharSkillDmg',
    'BuffPerAndSkillDmg', 'SkillDmg', 'MultiSlash1', 'WheelWind1', 'CrossSlash1',
    'Crescent1', 'LethalSlash1', 'MultiPuch1', 'WindSphere1', 'MultiHook1',
    'PowerPunch1', 'BodySlam1', 'MultiStraight1', 'SummonShot1', 'Phoenix1',
    'Butterfly1', 'FocusShooting1', 'Gravity1', 'FireWall1', 'LightningBolt1',
    'Blizzard1', 'IceSpear1', 'DashAttack1', 'MoonlightSlash1', 'TakeDownSlash1',
    'GroundSmash1', 'Rage1', 'Claw1', 'DragonWheel1', 'DragonWheel2',
    'DashPunch1', 'MultiShot1', 'GuideShot1', 'ArrowRain1', 'StepAndShot1',
    'FireBall1', 'FrostStrike1', 'LightningStorm1', 'ChainLightning1', 'SkillDmg2',
    'ChangeCharSkillDmg2', 'SkillLvAndSkillDmg2', 'SkillLvAndChangeCharSkillDmg2',
  ] as readonly string[],
  /** typeSlots 칸 순서대로 문양이 해금되는 스킬 레벨 (SkillPerk 표 targetLv) */
  SKILL_PERK_TARGET_LEVELS: ['60', '70', '80', '90', '100', '110', '120'] as readonly string[],
  /** 연성: 모든 부위에 걸리는 세트 행의 parts 값 */
  ALCHEMY_ALL_PARTS: 'All',
  /** 연성 합계 칸: 보조 능력치 (합을 소수 2자리 글로) */
  ALCHEMY_SUM_FIELDS: {
    artifactTotalSmite: 'smite',
    artifactTotalBarrier: 'barrier',
    artifactTotalDoubleAttack: 'doubleAttack',
    artifactTotalSuperCritical: 'superCritical',
    artifactTotalSwitchingBoost: 'switchingBoost',
    artifactTotalSpearAttack: 'spearAttack',
    artifactTotalSkillCombo: 'skillCombo',
  } as Record<string, string>,
  ALCHEMY_SUM_DECIMALS: 2,
  /** 연성 장착 아이템 pValues 의 공격력 % · 체력 % 자리 */
  ALCHEMY_ITEM_ATTACK_INDEX: 0,
  ALCHEMY_ITEM_HP_INDEX: 1,
  /** 연성 합계 칸: 부위 슬롯 % (곱한 배율의 게임 표기) */
  ALCHEMY_PART_FIELDS: {
    artifactTotalCharSkill: '_per_CharSkillDamage',
    artifactTotalChangeSkill: '_per_ChangeSkillDamage',
    artifactTotalCritDmg: '_per_criticalDmg',
    artifactTotalBuffSkill: '_per_BuffSkillDamage',
    artifactTotalActiveSkill: '_per_ActiveSkillDamage',
    artifactTotalNormal: '_per_NormalMonsterDamage',
    artifactTotalBoss: '_per_BossMonsterDamage',
    artifactTotalHero: '_per_HeroMonsterDamage',
  } as Record<string, string>,
  /** Default 사전에서 읽는 항목 이름: 광고 제거 구매, 공격력 이벤트 버프 끝나는 시각 */
  ADS_REMOVE_ITEM: 'AdsRemove',
  ATTACK_BUFF_ITEM: 'ItemBuffStageAtk',
} as const;
