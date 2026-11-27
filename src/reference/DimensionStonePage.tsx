import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Center,
  Checkbox,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { formatLog, parseGameNumber } from '@/calc/gameNumber';
import { useStatTables } from '@/data/statTables';
import {
  alchemyStone,
  fillParts,
  minAlchemyLevelFor,
  setSteps,
  slotCosts,
  stonePartLog,
  stoneTotalLog,
  type PartInput,
} from '@/reference/dimensionStone';
import { useCalcStore } from '@/store/useCalcStore';
import { useUiValue } from '@/store/useUiStore';

const DS = CONSTS.dimensionStone;
const TABLES = ['AlchemySlot'] as const;
const levelKey = (part: string) => DS.LEVEL_KEY_PREFIX + part;
const heldKey = (part: string) => DS.HELD_KEY_PREFIX + part;
const ALCHEMY_LEVEL_KEY = 'dimStone.alchemyLevel';
const BUFF_KEY = 'dimStone.buff';
const TRUE_TEXT = 'true';
const LEVEL_INPUT_WIDTH = 90;
const HELD_INPUT_WIDTH = 130;
const TABLE_MIN_WIDTH = 560;
/** 칸 입력 칸 배치: 폰 1줄, 중간 2줄, 넓으면 5줄 (10칸이 두 줄) */
const PART_GRID_COLUMNS = { base: 1, sm: 2, lg: 5 };

type Costs = ReturnType<typeof slotCosts>;

/** 레벨 칸 글자 → 0 ~ 최대 레벨 정수, 비었거나 잘못이면 null */
function readLevel(text: string | undefined): number | null {
  if (text === undefined || text.trim() === '') return null;
  const value = Number(text.replace(/,/g, '').replace(/^[tT]/, ''));
  return Number.isInteger(value) && value >= 0 && value <= DS.MAX_SLOT_LEVEL ? value : null;
}

/** 보유 파편 칸 (게임 표기 "1.23AB" 또는 숫자) → log. 비면 0개 (-Infinity), 잘못이면 null */
function readHeldLog(text: string | undefined): number | null {
  if (text === undefined || text.trim() === '' || text.trim() === '0') return -Infinity;
  const parsed = parseGameNumber(text);
  return parsed ? parsed.log : null;
}

/**
 * 차원의 돌 탭: 아티팩트 10칸 레벨과 보유 파편으로 다음 세트 단계에 몇 등급 돌이 필요한지와 그 단계에 붙는 값,
 * 연성 레벨에서 어떤 돌이 얼마나 나오는지 보여 준다. 칸 값은 계산기 저장소 (불러오기가 채움), 연성 칸은 이 기기에 기억
 */
export default function DimensionStonePage() {
  const { t: translate } = useTranslation();
  const tables = useStatTables(TABLES);
  const costs = useMemo(() => (tables.status === 'ready' ? slotCosts(tables.data) : null), [tables]);

  if (tables.status === 'failed') return <Alert color="red">{translate('dimStone.loadFailed')}</Alert>;
  if (!costs)
    return (
      // 불러오는 동안 화면 한가운데에
      <Center pos="fixed" inset={0} style={{ pointerEvents: 'none' }}>
        <Group gap="xs">
          <Loader size="sm" />
          <Text size="sm">{translate('dimStone.loading')}</Text>
        </Group>
      </Center>
    );

  return (
    <Stack mt="md" gap="lg">
      <Title order={3}>{translate('dimStone.title')}</Title>
      <SetSection costs={costs} />
      <PartTable />
      <AlchemySection />
    </Stack>
  );
}

/** 세트 단계 결과: 지금 단계, 다음 STEPS_AHEAD 단계마다 붙는 값, 필요한 파편과 돌 */
function SetSection({ costs }: { costs: Costs }) {
  const { t: translate } = useTranslation();
  const values = useCalcStore((state) => state.values);
  const inputs: (PartInput | null)[] = DS.PARTS.map((part) => {
    const level = readLevel(values[levelKey(part)]);
    const heldLog = readHeldLog(values[heldKey(part)]);
    return level === null || heldLog === null ? null : { level, heldLog };
  });
  const parts = fillParts(inputs);
  const result = parts ? setSteps(costs, parts) : null;
  const filledCount = inputs.filter((input) => input !== null).length;
  return (
    <Stack gap={4}>
      <Title order={4}>{translate('dimStone.setTitle')}</Title>
      {!result ? (
        <Text size="sm" c="dimmed">
          {translate('dimStone.setNeedsInput')}
        </Text>
      ) : (
        <>
          <Text size="sm" fw={700}>
            {translate('dimStone.setNow', { set: result.setLevel, min: result.minLevel })}
          </Text>
          {filledCount < DS.PARTS.length && (
            <Text size="xs" c="dimmed">
              {translate('dimStone.setPartial')}
            </Text>
          )}
          <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
            <Table verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{translate('dimStone.setTarget')}</Table.Th>
                  <Table.Th>{translate('dimStone.setGain')}</Table.Th>
                  <Table.Th>{translate('dimStone.setStone')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {result.steps.map((step) => (
                  <Table.Tr key={step.target}>
                    <Table.Td>
                      {Number.isNaN(step.slotLevel)
                        ? translate('dimStone.beyondMax')
                        : translate('dimStone.setStep', { set: step.target, level: step.slotLevel })}
                    </Table.Td>
                    <Table.Td>
                      {step.stat
                        ? translate('dimStone.gain', {
                            stat: translate(`dimStone.stats.${step.stat}`, { defaultValue: step.stat }),
                            percent: (step.percent ?? 0).toLocaleString('ko-KR'),
                          })
                        : '-'}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={700}>
                        {step.grade === null
                          ? translate('dimStone.noStone')
                          : step.grade === 0
                            ? translate('dimStone.alreadyEnough')
                            : translate('dimStone.stoneGradeWithLevel', {
                                grade: step.grade,
                                level: minAlchemyLevelFor(step.grade).toLocaleString('ko-KR'),
                              })}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </>
      )}
    </Stack>
  );
}

/** 칸 하나: 이름, 레벨, 보유 파편 */
function PartCard({ part }: { part: string }) {
  const { t: translate } = useTranslation();
  const levelText = useCalcStore((state) => state.values[levelKey(part)]);
  const heldText = useCalcStore((state) => state.values[heldKey(part)]);
  const setValue = useCalcStore((state) => state.setValue);
  const level = readLevel(levelText);
  const heldLog = readHeldLog(heldText);
  return (
    <Paper withBorder p="xs">
      <Text size="sm" fw={700}>
        {translate(`dimStone.parts.${part}`)}
      </Text>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <TextInput
          size="xs"
          w={LEVEL_INPUT_WIDTH}
          label={translate('dimStone.levelColumn')}
          value={levelText ?? ''}
          onChange={(event) => setValue(levelKey(part), event.currentTarget.value)}
          error={levelText && level === null ? translate('dimStone.badLevel') : undefined}
        />
        <TextInput
          size="xs"
          w={HELD_INPUT_WIDTH}
          label={translate('dimStone.heldColumn')}
          value={heldText ?? ''}
          placeholder="0"
          onChange={(event) => setValue(heldKey(part), event.currentTarget.value)}
          error={heldLog === null ? translate('dimStone.badHeld') : undefined}
        />
      </Group>
    </Paper>
  );
}

/** 10칸 입력 (불러오기가 채움). 화면이 넓으면 칸을 좌우로 나란히 */
function PartTable() {
  const { t: translate } = useTranslation();
  return (
    <Stack gap={4}>
      <Title order={4}>{translate('dimStone.partTitle')}</Title>
      <Text size="sm" c="dimmed">
        {translate('dimStone.partHelp')}
      </Text>
      <SimpleGrid cols={PART_GRID_COLUMNS} spacing="xs">
        {DS.PARTS.map((part) => (
          <PartCard key={part} part={part} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function AlchemySection() {
  const { t: translate } = useTranslation();
  const [levelText, setLevelText] = useUiValue(ALCHEMY_LEVEL_KEY);
  const [buffText, setBuffText] = useUiValue(BUFF_KEY);
  const buffed = buffText === TRUE_TEXT;
  const level = levelText ? Number(levelText.replace(/,/g, '')) : NaN;
  const stone = Number.isFinite(level) ? alchemyStone(level, buffed) : null;
  return (
    <Stack gap={4}>
      <Title order={4}>{translate('dimStone.alchemyTitle')}</Title>
      <Group gap="md" align="flex-end">
        <TextInput
          size="xs"
          w={LEVEL_INPUT_WIDTH * 1.5}
          label={translate('dimStone.alchemyLevel')}
          value={levelText ?? ''}
          onChange={(event) => setLevelText(event.currentTarget.value)}
        />
        <Checkbox
          label={translate('dimStone.buff')}
          checked={buffed}
          onChange={(event) => setBuffText(event.currentTarget.checked ? TRUE_TEXT : '')}
        />
      </Group>
      {levelText && Number.isFinite(level) && !stone && (
        <Text size="sm" c="dimmed">
          {translate('dimStone.alchemyTooLow', { level: DS.ALCHEMY_STONE_START_LEVEL })}
        </Text>
      )}
      {stone && (
        <Stack gap={2}>
          <Text size="sm" fw={700}>
            {translate('dimStone.alchemyStone', { grade: stone.grade })}
          </Text>
          <Text size="sm">
            {translate('dimStone.alchemyAmount', {
              total: formatLog(stoneTotalLog(stone.grade)),
              part: formatLog(stonePartLog(stone.grade)),
            })}
          </Text>
          <Text size="sm">
            {translate('dimStone.alchemyChance', {
              chance: stone.chancePercent.toLocaleString('ko-KR', { maximumFractionDigits: 4 }),
              count: Math.round(stone.alchemiesPerStone).toLocaleString('ko-KR'),
            })}
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
