import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Group, TextInput } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { stickerCountField, stickerDisplayName, stickerLevelField } from '@/calc/sources/heroWeaponCardPet/card';
import type { RowGroup } from '@/calc/sources/heroWeaponCardPet/shared';
import type { TabPanelProps } from '@/calc/types';

const { MIN_NUMBER } = CONSTS.heroWeaponCardPet;
/** 프리셋 카드 6장 × 배지 칸 4 */
const MAX_STICKER_COUNT = 24;

export interface StickerRowProps {
  group: RowGroup;
  /** 칸 값 (세트 수 · 레벨) */
  count: string | undefined;
  level: string | undefined;
  setValue: TabPanelProps['setValue'];
}

/** 스티커 세트 하나 (memo: 그 스티커 칸을 바꿀 때만 다시 그린다) */
export const StickerRow = memo(function StickerRow({ group, count, level, setValue }: StickerRowProps) {
  const { t: translate } = useTranslation();
  const name = translate('calc.card.stickerName', { name: stickerDisplayName(group.key, translate) });
  return (
    <Group grow gap="xs" align="flex-end">
      <TextInput
        type="number"
        min={MIN_NUMBER}
        max={MAX_STICKER_COUNT}
        inputMode="numeric"
        label={translate('calc.card.stickerCount', { name })}
        value={count ?? ''}
        onChange={(event) => setValue(stickerCountField(group.key), event.currentTarget.value)}
      />
      <TextInput
        type="number"
        min={MIN_NUMBER}
        inputMode="numeric"
        label={translate('calc.card.stickerLevel', { name })}
        value={level ?? ''}
        onChange={(event) => setValue(stickerLevelField(group.key), event.currentTarget.value)}
      />
    </Group>
  );
});
