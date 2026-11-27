/**
 * 차원의 돌 계산 (근거: claude-docs/react-port/dimension-stone-2026-11-22.md, 5.81 표와 게임 코드)
 */
export const DIMENSION_STONE_CONSTS = {
  /** 아티팩트 슬롯 10부위 (AlchemySlot parts, 게임 칸 순서). 강화 비용은 10부위가 같다 */
  PARTS: [
    'Hat',
    'Armor',
    'Glove',
    'Belt',
    'Pants',
    'Boots',
    'Necklace',
    'Ring',
    'Earring',
    'Cape',
  ] as readonly string[],
  /** 비용을 읽는 부위 (10부위 비용이 같아서 하나만 읽는다) */
  COST_PART: 'Hat',
  /** 세트 행의 parts 값. 세트 k 단계 = 10칸의 가장 낮은 레벨이 그 행 enhCostVal (5k) 이상, 재료 없음 */
  SET_PART: 'All',
  /** 슬롯 레벨 최대 (AlchemySlot 부위 행 lv 끝) */
  MAX_SLOT_LEVEL: 1800,
  /** 돌 N 등급의 파편 수 = 8^(N − 1) (BoxInfo itemCnt, 표 값과 최대 0.08% 차) */
  STONE_BASE: 8,
  MIN_STONE_GRADE: 1,
  MAX_STONE_GRADE: 874,
  /** 돌 1개의 파편은 1개씩 10부위 중 무작위 한 곳에 들어간다 → 한 부위 평균 = 합계 / 10 */
  PART_SHARE: 10,
  /** 한 부위가 받는 양의 흔들림 (80000번 무작위 배분의 표준편차 / 평균, 계산값 %) */
  SPREAD_PERCENT: 1.06,
  /** 다음 공격력 세트를 몇 개까지 보일지 */
  STEPS_AHEAD: 5,
  /** 보여 줄 세트 효과 스탯 (공격력 세트만) */
  SHOWN_SET_STAT: '_per_attackDamage',
  /** 연성 레벨 → 돌: 200 부터 3레벨마다 등급 +1, 확률 (%) 은 0.001, 0.002, 0.004 반복, 마지막 2819 는 0.001 (AlchemyLevel) */
  ALCHEMY_STONE_START_LEVEL: 200,
  ALCHEMY_LEVELS_PER_GRADE: 3,
  ALCHEMY_STONE_PROBS: [0.001, 0.002, 0.004] as readonly number[],
  ALCHEMY_MAX_LEVEL: 2819,
  ALCHEMY_LAST_LEVEL_PROB: 0.001,
  /** 연성 1번마다 0~100 난수 <= 확률 x 버프 배수 이면 돌 1개. 차원의 돌 버프 (ItemBuffFragment, 확률 +100%) 의 배수 */
  BUFF_MULTIPLIER: 2,
  PERCENT_RANGE: 100,
  /** 입력 칸 저장 이름 (계산기 저장소, 불러오기가 채움): 칸 레벨, 보유 파편 */
  LEVEL_KEY_PREFIX: 'dimensionStone.level.',
  HELD_KEY_PREFIX: 'dimensionStone.held.',
  /** 세이브: Alchemy slotData.slotLvDic 의 칸 번호 1~10 = PARTS 순서 (11 = 세트, 게임 코드 m5755), 보유 파편 = Default _newNotInvenDic 의 Fragment<부위> */
  SAVE_FIRST_PART_INDEX: 1,
  FRAGMENT_ITEM_PREFIX: 'Fragment',
  /** 표 숫자 칸 (긴 정수 글자) 을 log 로 바꿀 때 앞에서 읽는 자리 수 */
  TABLE_MANTISSA_DIGITS: 15,
} as const;
