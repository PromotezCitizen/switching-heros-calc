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
