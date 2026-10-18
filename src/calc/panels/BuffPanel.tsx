import { useTranslation } from 'react-i18next';
import { Stack, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { FlagField, SelectField } from '@/components/StoreFields';
import i18next from 'i18next';
import { chancesWithBattleState } from '@/calc/sources/masteryRuneBuff/battleState';
import { berserkStacks, killerLog } from '@/calc/sources/masteryRuneBuff/buff';
import { chancesFromLines } from '@/calc/sources/masteryRuneBuff/chances';
import type { OtherTabLines } from '@/calc/sources/masteryRuneBuff';
import { plainNumber } from '@/calc/sources/masteryRuneBuff/mastery';
import { CALC_KEY_PREFIX } from '@/calc/storeKeys';
import type { TabPanelProps } from '@/calc/types';

const {
  KILLER_ACTIVE_FIELD,
  KILLER_DISPLAY_DECIMALS,
  NORMAL_MONSTER_FOOD_FIELD,
  NORMAL_MONSTER_FOODS,
  ATTACK_EVENT_BUFF_FIELD,
  ATTACK_EVENT_BUFF,
} = CONSTS.masteryRuneBuff;

interface BuffPanelProps extends TabPanelProps {
  /** 버프 탭을 뺀 모든 탭의 줄 (탭 목록이 넘겨 줌) */
  otherTabLines: OtherTabLines;
}

/**
 * 버프: 입력은 학살자 켬/끔, 일반 몬스터 피해 음식 (처음 = 없음), 공격력 이벤트 버프 켬/끔 (처음 = 꺼짐). 학살자 배율은 특성 탭 레벨로 정해져 결과만 보여 준다.
 * 연타·스킬 콤보 % 는 다른 탭 줄로 계산해 늘 보여 준다 (다른 탭 칸을 많이 읽어 그 칸이 바뀔 때마다 이 칸만 다시 그림)
 */
export default function BuffPanel({ values, tables, otherTabLines }: BuffPanelProps) {
  const { t: translate } = useTranslation();
  const masteryTable = tables.Mastery;
  // 연타·스킬 콤보는 버프 탭 줄과 같이 전투 중 최대 상태 공격속도·치명타 확률까지 넣어 계산한다
  const otherLines = otherTabLines(values, tables);
  const chances = masteryTable
    ? chancesWithBattleState(otherLines, values, tables, masteryTable, (translationKey, params) =>
        i18next.t(translationKey, params ?? {}),
      ).chances
    : chancesFromLines(otherLines, values, tables);

  return (
    <Stack gap="xs">
      <FlagField storeKey={CALC_KEY_PREFIX + KILLER_ACTIVE_FIELD} label={translate('calc.buff.killerActive')} />
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
      {masteryTable && (
        <Text size="sm">
          {translate('calc.buff.status', {
            stacks: berserkStacks(masteryTable, values),
            killer: Number(Math.pow(10, killerLog(masteryTable, values)).toFixed(KILLER_DISPLAY_DECIMALS)),
          })}
        </Text>
      )}
      <Text size="sm">
        {translate('calc.buff.chances', {
          doubleAttack: plainNumber(chances.doubleAttack),
          skillCombo: plainNumber(chances.skillCombo),
        })}
      </Text>
      <Text size="xs" c="dimmed">
        {translate('calc.buff.chancesHint')}
      </Text>
    </Stack>
  );
}
