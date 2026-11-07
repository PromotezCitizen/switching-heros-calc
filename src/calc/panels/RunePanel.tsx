import { useTranslation } from 'react-i18next';
import { Box, Card, Group, Image, NumberInput, SimpleGrid, Stack, Text } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
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
import { statLabel, type StatDescriptions } from '@/calc/statText';
import type { CalcValues, TabPanelProps } from '@/calc/types';

const { CORE_RUNE_KEY, CORE_RUNE_ICON, RUNE_ICON_PREFIX, RUNE_ICON_SLOT_OFFSET, MIN_LEVEL, PANEL, LAB } =
  CONSTS.masteryRuneBuff;
const { RUNE_CARD_WIDTH, RUNE_CARD_HEIGHT, RUNE_HEX_RADIUS, RUNE_GRID_COLUMNS } = PANEL;
/** 육각형 꼭짓점 6개: 맨 위에서 시작해 시계 방향 (60° 간격) */
const HEX_START_DEGREES = -90;
const HEX_STEP_DEGREES = 60;
const DEGREES_TO_RADIANS = Math.PI / 180;
/** 육각형 배치에 필요한 폭 · 높이 (좌우 꼭짓점 x = 반지름 × cos 30°, 위아래 꼭짓점 y = 반지름) */
const HEX_WIDTH = 2 * RUNE_HEX_RADIUS * Math.cos(30 * DEGREES_TO_RADIANS) + RUNE_CARD_WIDTH;
const HEX_HEIGHT = 2 * RUNE_HEX_RADIUS + RUNE_CARD_HEIGHT;

/** 룬 아이콘: 속성 룬 슬롯 0~5 = ICON_rune1~6, 코어 = ICON_center_rune */
function runeIconPath(rune: AttributeRune): string {
  const name = rune.key === CORE_RUNE_KEY ? CORE_RUNE_ICON : RUNE_ICON_PREFIX + (Number(rune.key) + RUNE_ICON_SLOT_OFFSET);
  return `${import.meta.env.BASE_URL}icons/Atlas_AttributeRune/${name}.png`;
}

interface RuneCardProps {
  rune: AttributeRune;
  values: CalcValues;
  setValue: TabPanelProps['setValue'];
  descriptions: StatDescriptions;
}

/** 룬 카드 하나: 아이콘 · 이름 · 효과 이름, 레벨 칸 / 최대, 그 레벨의 누적 효과 */
function RuneCard({ rune, values, setValue, descriptions }: RuneCardProps) {
  const { t: translate } = useTranslation();
  const name = translate(`calc.rune.names.${rune.key}`, { defaultValue: rune.key });
  const value = runeValue(rune, runeLevel(values, rune));
  const fieldKey = runeFieldKey(rune);
  return (
    <Card withBorder padding="xs" h="100%">
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
          value={values[fieldKey] ?? ''}
          onChange={(next) => setValue(fieldKey, String(next))}
        />
        <Text size="xs" c="dimmed">
          {translate('calc.rune.maxLevel', { max: runeLevelLimit(rune, values) })}
        </Text>
      </Group>
      <Text size="xs" mt="xs">
        {value ? translate('calc.rune.effect', { value: formatLog(Math.log10(value)) }) : translate('calc.rune.notLearned')}
      </Text>
    </Card>
  );
}

/**
 * 룬 탭: 게임 화면처럼 가운데 코어 룬, 둘레 육각형 꼭짓점에 속성 룬 6개 (맨 위부터 시계 방향, 슬롯 순서).
 * 영역이 육각형 폭보다 좁으면 코어를 맨 앞에 둔 2열 · 1열 격자. 카드 아래 = 그 레벨의 누적 값
 */
export default function RunePanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const { ref, width } = useElementSize();
  const labUnlocked = runeLabUnlocked(values, tables);
  const runeTable = tables.AttributeRune;
  if (!runeTable) return null;
  const runes = attributeRunes(runeTable);
  const core = runes.find((rune) => rune.key === CORE_RUNE_KEY);
  const around = runes.filter((rune) => rune.key !== CORE_RUNE_KEY);
  const hexagon = width >= HEX_WIDTH;
  const card = (rune: AttributeRune) => <RuneCard key={rune.key} rune={rune} values={values} setValue={setValue} descriptions={descriptions} />;

  return (
    <Stack gap="xs">
      <SectionTitle>{translate('calc.rune.levelsTitle')}</SectionTitle>
      <Box ref={ref}>
        {hexagon ? (
          <Box pos="relative" w={HEX_WIDTH} h={HEX_HEIGHT} mx="auto">
            {[...(core ? [{ rune: core, x: 0, y: 0 }] : []),
              ...around.map((rune, index) => {
                const angle = (HEX_START_DEGREES + HEX_STEP_DEGREES * index) * DEGREES_TO_RADIANS;
                return { rune, x: RUNE_HEX_RADIUS * Math.cos(angle), y: RUNE_HEX_RADIUS * Math.sin(angle) };
              })].map(({ rune, x, y }) => (
              <Box
                key={rune.key}
                pos="absolute"
                w={RUNE_CARD_WIDTH}
                h={RUNE_CARD_HEIGHT}
                left={HEX_WIDTH / 2 + x - RUNE_CARD_WIDTH / 2}
                top={HEX_HEIGHT / 2 + y - RUNE_CARD_HEIGHT / 2}
              >
                {card(rune)}
              </Box>
            ))}
          </Box>
        ) : (
          <SimpleGrid type="container" cols={RUNE_GRID_COLUMNS} spacing="sm">
            {[...(core ? [core] : []), ...around].map(card)}
          </SimpleGrid>
        )}
      </Box>
      <Text size="sm" c="dimmed">
        {translate('calc.rune.hint')}
      </Text>

      {/* 속성 룬 연구소: 열렸으면 입력, 안 열렸으면 언제 열리는지 (속성 룬 6개 모두 최대 레벨) */}
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
