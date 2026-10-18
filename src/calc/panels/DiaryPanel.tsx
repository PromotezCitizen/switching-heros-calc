/** 일기장: 현재 책 번호 + 슬롯 12개 레벨을 입력하면 누적 효과를 계산해 보여 준다 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Group, Image, Stack, Text } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import { CONSTS } from '@/CONSTS';
import { NumberField } from '@/components/StoreFields';
import { CALC_KEY_PREFIX } from '@/calc/storeKeys';
import {
  DIARY_BOOK_FIELD,
  DIARY_SLOT_ICONS,
  diarySlotField,
  diarySlotResults,
} from '@/calc/sources/textLines/diary';
import { formatPercentText } from '@/calc/statText';
import type { TabPanelProps } from '@/calc/types';

const ICON_FOLDER = 'icons/Atlas_diary_icon';

interface DiarySlotCardProps {
  slot: number;
  icon: string;
  /** 누적 효과 글 (책 번호가 없으면 '') */
  percentText: string;
}

/** 슬롯 하나 (memo: 슬롯 레벨 하나를 바꾸면 누적 효과 글이 바뀐 슬롯만 다시 그린다) */
const DiarySlotCard = memo(function DiarySlotCard({ slot, icon, percentText }: DiarySlotCardProps) {
  const { t: translate } = useTranslation();
  const { DIARY_ICON_SIZE } = CONSTS.textLines;
  return (
    <Card withBorder>
      <Group gap="xs" wrap="nowrap" align="center">
        <Image
          src={`${import.meta.env.BASE_URL}${ICON_FOLDER}/${icon}.png`}
          alt=""
          w={DIARY_ICON_SIZE}
          h={DIARY_ICON_SIZE}
          fit="contain"
        />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" lineClamp={1} title={translate(`calc.diary.slots.${slot}`)}>
            {translate(`calc.diary.slots.${slot}`)}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <NumberField
              storeKey={CALC_KEY_PREFIX + diarySlotField(slot)}
              label={translate('calc.diary.slotLevel')}
              placeholder={translate('calc.diary.slotLevel')}
              hideLabel
              min={0}
            />
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              {percentText}
            </Text>
          </Group>
        </Stack>
      </Group>
    </Card>
  );
});

export default function DiaryPanel({ values, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const results = diarySlotResults(values, tables);
  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        {translate('calc.diary.help')}
      </Text>
      <Group maw={CONSTS.display.LIST_INPUT_WIDTH * 2}>
        <NumberField
          storeKey={CALC_KEY_PREFIX + DIARY_BOOK_FIELD}
          label={translate('calc.diary.book')}
          hint={translate('calc.diary.bookHint')}
          min={0}
        />
      </Group>
      <AutoGrid minItemWidth={CONSTS.display.CARD_MIN_WIDTH.medium}>
        {DIARY_SLOT_ICONS.map((icon, index) => {
          const slot = index + 1;
          const result = results.find((candidate) => candidate.slot === slot);
          return (
            <DiarySlotCard
              key={slot}
              slot={slot}
              icon={icon}
              percentText={result ? formatPercentText(result.cumulativePercent) : ''}
            />
          );
        })}
      </AutoGrid>
    </Stack>
  );
}
