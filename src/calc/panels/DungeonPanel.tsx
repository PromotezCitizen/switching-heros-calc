import { useTranslation } from 'react-i18next';
import { SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { DUNGEON_LINKS, relicLinkFieldId } from '@/calc/sources/trainingRelic/relic';
import type { TabPanelProps } from '@/calc/types';

/** 모험 던전 속성별 최고 기록 칸 (1 불 · 2 물 · 3 땅, 폰 불러오기가 채움, 계산에는 안 씀) */
const PET_RESCUE_ATTRIBUTES = [1, 2, 3] as const;
const petRescueField = (attribute: number) => `petRescueBest_${attribute}`;
const MIN_STAGE = 0;

/**
 * 던전 기록: 보물 · 무기 · 유물 · 불 · 물 · 땅 던전 클리어 단계 (유물 연동 · 던전 얼티밋이 쓰는 칸, 저장 칸 이름은 relicLink_* 그대로)
 * 와 모험 던전 속성별 최고 기록 (계산에는 안 씀)
 */
export default function DungeonPanel({ values, setValue }: TabPanelProps) {
  const { t: translate } = useTranslation();
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {translate('calc.dungeon.help')}
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {DUNGEON_LINKS.map((field) => {
          const fieldId = relicLinkFieldId(field);
          return (
            <TextInput
              key={field}
              type="number"
              inputMode="numeric"
              min={MIN_STAGE}
              label={translate(`calc.relic.links.${field}`)}
              value={values[fieldId] ?? ''}
              onChange={(event) => setValue(fieldId, event.currentTarget.value)}
            />
          );
        })}
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {PET_RESCUE_ATTRIBUTES.map((attribute) => {
          const fieldId = petRescueField(attribute);
          return (
            <TextInput
              key={fieldId}
              type="number"
              inputMode="numeric"
              min={MIN_STAGE}
              label={translate('calc.dungeon.petRescue', { attribute: translate(`calc.relic.attributes.${attribute}`) })}
              value={values[fieldId] ?? ''}
              onChange={(event) => setValue(fieldId, event.currentTarget.value)}
            />
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
