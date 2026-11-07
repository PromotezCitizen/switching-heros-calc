import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Group, TextInput } from '@mantine/core';
import LazySelect from '@/components/LazySelect';
import { CONSTS } from '@/CONSTS';
import { stickerCountField, stickerLevelField } from '@/calc/sources/heroWeaponCardPet/card';
import { unique, type RowGroup } from '@/calc/sources/heroWeaponCardPet/shared';
import type { TabPanelProps } from '@/calc/types';

const { MIN_NUMBER } = CONSTS.heroWeaponCardPet;

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
  const name = translate('calc.card.stickerName', { id: group.key });
  return (
    <Group grow gap="xs" align="flex-end">
      <LazySelect
        label={translate('calc.card.stickerCount', { name })}
        placeholder={translate('calc.card.none')}
        clearable
        data={unique(group.rows.map((row) => row.setCnt)).map((setCount) => ({
          value: setCount,
          label: translate('calc.card.countOption', { count: setCount }),
        }))}
        value={count || null}
        onChange={(selected) => setValue(stickerCountField(group.key), selected ?? '')}
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
