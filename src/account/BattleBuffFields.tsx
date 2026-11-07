import { useTranslation } from 'react-i18next';
import { SimpleGrid } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { FlagField, SelectField } from '@/components/StoreFields';
import { CALC_KEY_PREFIX } from '@/calc/storeKeys';

const { KILLER_ACTIVE_FIELD, NORMAL_MONSTER_FOOD_FIELD, NORMAL_MONSTER_FOODS, ATTACK_EVENT_BUFF_FIELD, ATTACK_EVENT_BUFF } =
  CONSTS.masteryRuneBuff;

/**
 * 전투 버프 입력 (학살자 발동 · 음식 효과 · 공격력 이벤트 버프). 계산식 확인기 버프 탭에 있던 칸을 공통 입력으로 옮김
 * (사용자 지시 2026-11-07 "공통입력"). 저장 칸 이름은 그대로 (calc.*) 라 이미 넣은 값 · 폰 불러오기 값이 그대로 쓰인다
 */
export default function BattleBuffFields() {
  const { t: translate } = useTranslation();
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }}>
      <FlagField
        storeKey={CALC_KEY_PREFIX + KILLER_ACTIVE_FIELD}
        label={translate('calc.buff.killerActive')}
        hint={translate('calc.buff.killerHint')}
      />
      <SelectField
        storeKey={CALC_KEY_PREFIX + NORMAL_MONSTER_FOOD_FIELD}
        label={translate('calc.buff.food')}
        hint={translate('calc.buff.foodHint')}
        options={[
          { value: '', label: translate('calc.buff.foodNone') },
          ...NORMAL_MONSTER_FOODS.map((food) => ({
            value: food.id,
            label: translate('calc.buff.foodOption', { food: translate(`calc.buff.foods.${food.id}`), percent: food.percent }),
          })),
        ]}
      />
      <FlagField
        storeKey={CALC_KEY_PREFIX + ATTACK_EVENT_BUFF_FIELD}
        label={translate('calc.buff.attackEventBuff', { percent: ATTACK_EVENT_BUFF.percent })}
      />
    </SimpleGrid>
  );
}
