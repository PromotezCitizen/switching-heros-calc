import { useTranslation } from 'react-i18next';
import { Card, Group, Image, NumberInput, Stack, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import HorizontalScrollRow from '@/components/HorizontalScrollRow';
import SectionTitle from '@/components/SectionTitle';
import { formatLog } from '@/calc/gameNumber';
import {
  attributeRunes,
  runeFieldKey,
  runeLabField,
  runeLabUnlocked,
  runeLevel,
  runeLevelLimit,
  runeValue,
  type AttributeRune,
} from '@/calc/sources/masteryRuneBuff/rune';
import { statLabel } from '@/calc/statText';
import type { TabPanelProps } from '@/calc/types';

const { CORE_RUNE_KEY, CORE_RUNE_ICON, RUNE_ICON_PREFIX, RUNE_ICON_SLOT_OFFSET, MIN_LEVEL, PANEL, LAB } =
  CONSTS.masteryRuneBuff;

/** 룬 아이콘: 속성 룬 슬롯 0~5 = ICON_rune1~6, 코어 = ICON_center_rune */
function runeIconPath(rune: AttributeRune): string {
  const name = rune.key === CORE_RUNE_KEY ? CORE_RUNE_ICON : RUNE_ICON_PREFIX + (Number(rune.key) + RUNE_ICON_SLOT_OFFSET);
  return `${import.meta.env.BASE_URL}icons/Atlas_AttributeRune/${name}.png`;
}

/** 룬 탭: 룬마다 레벨 (칸 rune_<슬롯|core>). 카드 아래 = 그 레벨의 누적 값. 코어 룬을 맨 앞에, 한 줄 (넘치면 가로 스크롤) */
export default function RunePanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const labUnlocked = runeLabUnlocked(values, tables);
  const runeTable = tables.AttributeRune;
  if (!runeTable) return null;
  const runes = attributeRunes(runeTable);
  const coreFirst = [...runes.filter((rune) => rune.key === CORE_RUNE_KEY), ...runes.filter((rune) => rune.key !== CORE_RUNE_KEY)];

  return (
    <Stack gap="xs">
      <SectionTitle>{translate('calc.rune.levelsTitle')}</SectionTitle>
      <HorizontalScrollRow itemWidth={PANEL.RUNE_CARD_WIDTH}>
        {coreFirst.map((rune) => {
          const name = translate(`calc.rune.names.${rune.key}`, { defaultValue: rune.key });
          const value = runeValue(rune, runeLevel(values, rune));
          const fieldKey = runeFieldKey(rune);
          const storedText = values[fieldKey];
          return (
            <Card key={rune.key} withBorder padding="xs" h="100%">
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <Image src={runeIconPath(rune)} w={PANEL.ICON_SIZE} h={PANEL.ICON_SIZE} alt="" />
                <Stack gap={0}>
                  <Text fw={600} size="sm">
                    {name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {descriptions[rune.stat] !== undefined ? statLabel(descriptions, rune.stat) : rune.stat}
                  </Text>
                </Stack>
              </Group>
              <Group gap="xs" mt="xs" wrap="nowrap">
                <NumberInput
                  size="xs"
                  w={PANEL.LEVEL_INPUT_WIDTH}
                  hideControls
                  min={MIN_LEVEL}
                  max={runeLevelLimit(rune, values)}
                  clampBehavior="none"
                  allowNegative={false}
                  aria-label={translate('calc.rune.levelInput', { name })}
                  value={storedText ?? ''}
                  onChange={(next) => setValue(fieldKey, String(next))}
                />
                <Text size="xs" c="dimmed">
                  {translate('calc.rune.maxLevel', { max: runeLevelLimit(rune, values) })}
                </Text>
              </Group>
              <Text size="xs" mt="xs">
                {value
                  ? translate('calc.rune.effect', { value: formatLog(Math.log10(value)) })
                  : translate('calc.rune.notLearned')}
              </Text>
            </Card>
          );
        })}
      </HorizontalScrollRow>
      <Text size="sm" c="dimmed">
        {translate('calc.rune.hint')}
      </Text>

      {/* 속성 룬 연구소: 열렸으면 입력, 안 열렸으면 언제 열리는지 (속성 룬 6개 모두 최대 레벨, 사용자 지시 2026-11-07) */}
      <SectionTitle>{translate('calc.rune.labTitle')}</SectionTitle>
      {labUnlocked ? (
        <>
          <Text size="sm" c="dimmed">
            {translate('calc.rune.labHint')}
          </Text>
          {/* 속성 3개 한 줄 (좁으면 가로 스크롤): 연구실 레벨, 비워 두면 입력 전 */}
          <HorizontalScrollRow itemWidth={LAB.INPUT_WIDTH}>
            {LAB.ATTRIBUTES.map((attribute) => (
              <NumberInput
                key={attribute}
                size="xs"
                hideControls
                min={MIN_LEVEL}
                allowNegative={false}
                allowDecimal={false}
                label={translate('calc.rune.labLevelInput', { attribute: translate(`calc.rune.labAttributes.${attribute}`) })}
                value={values[runeLabField(attribute)] ?? ''}
                onChange={(next) => setValue(runeLabField(attribute), String(next))}
              />
            ))}
          </HorizontalScrollRow>
        </>
      ) : (
        <Text size="sm" c="dimmed">
          {translate('calc.rune.labLocked')}
        </Text>
      )}
    </Stack>
  );
}
