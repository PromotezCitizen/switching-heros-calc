import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  Box,
  Button,
  Group,
  Image,
  NumberInput,
  Stack,
  Table,
  Text,
  HoverCard,
  UnstyledButton,
} from '@mantine/core';
import SectionTitle from '@/components/SectionTitle';
import { CONSTS } from '@/CONSTS';
import {
  clampedMasteryLevel,
  masteryLevel,
  masteryLevelKey,
  masteryTotals,
  masteryTraits,
  plainNumber,
  traitEffectText,
  traitValue,
  type MasteryTrait,
} from '@/calc/sources/masteryRuneBuff/mastery';
import { skippedUltimateNames } from '@/calc/sources/masteryRuneBuff/ultimate';
import { statLabel } from '@/calc/statText';
import { previousStepCleared, ultimateGateCleared, type Allocation } from '@/masteryOptimizer/rules';
import type { CalcValues, TabPanelProps } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import type { Line } from '@/calc/combine';
import { formatLog } from '@/calc/gameNumber';

/** 현재 값 글: 소수점 버린 쉼표 숫자 (버리기 전에 부동소수 오차를 유효 숫자로 정리, 7.9999… → 8). 아주 큰 값만 게임 단위 글자 */
function currentNumber(log: number): string {
  if (!isFinite(log)) return '0';
  return log < PANEL.PLAIN_NUMBER_MAX_LOG
    ? plainNumber(Math.trunc(Number(Math.pow(10, log).toPrecision(PANEL.CURRENT_PRECISION))))
    : formatLog(log);
}
import { chancesFromLines, type Chances } from '@/calc/sources/masteryRuneBuff/chances';

const { MASTERY_GROUPS, ULTIMATE_ON_LEVEL, MIN_LEVEL, PANEL } = CONSTS.masteryRuneBuff;

/** 특성 아이콘: 일반 A_<번호>, 얼티밋 UT_<번호> (게임 그림 묶음 Atlas_Characteristics) */
function traitIconPath(trait: MasteryTrait): string {
  return `${import.meta.env.BASE_URL}icons/Atlas_Characteristics/${trait.ultimate ? 'UT_' : 'A_'}${trait.rNo}.png`;
}

/** 히어로마다 따로 세는 개수 얼티밋의 스탯 이름 끝 (전용 무기 클리어 미션 수) */
const TRANS_MISSION_SUFFIX = `_${CONSTS.masteryRuneBuff.ULTIMATE_TRANS_MISSION_KEY}`;

/** 줄 하나의 % 값 (log10). 0 이하면 null */
function linePercentLog(line: Line): number | null {
  if (line.log !== undefined && line.log !== null) return line.log;
  return line.value && line.value > 0 ? Math.log10(line.value) : null;
}

/**
 * 지금 들어간 값 글: 특성 줄 % 의 합. 설명이 "배" 단위면 배수 (1 + % / 100), 아니면 %. 줄이 없으면 0
 */
function currentValueText(trait: MasteryTrait, allLines: readonly Line[]): string {
  // 스탯 이름이 계산 줄 꼴이 아니면 그 특성 이름 그대로의 줄은 계수 (다른 계산이 읽음) 라 빼고, 실제 효과 줄 (중첩, 초과 단계) 만 더한다
  const lines = PANEL.DIRECT_STAT_PREFIX.test(trait.statName)
    ? allLines
    : allLines.filter((line) => line.stat !== trait.statName);
  const logs = lines.map(linePercentLog).filter((log): log is number => log !== null);
  // 줄 % 의 합 (log10). 가장 큰 값 기준으로 더해 아주 큰 값도 넘치지 않게
  const top = logs.length ? Math.max(...logs) : -Infinity;
  const percentLog = isFinite(top)
    ? top + Math.log10(logs.reduce((sum, log) => sum + Math.pow(10, log - top), 0))
    : -Infinity;
  if (PANEL.MULTIPLIER_DESC.test(trait.desc)) {
    // 1 + % / 100 (아주 큰 값은 % / 100 과 같다)
    const multiplierLog =
      percentLog > PANEL.LARGE_LOG ? percentLog - 2 : Math.log10(1 + Math.pow(10, percentLog) / 100);
    return `${currentNumber(multiplierLog)}${PANEL.MULTIPLIER_UNIT}`;
  }
  return `${currentNumber(percentLog)}%`;
}

/** "~마다" · "~당" 쌓이는 특성의 쌓임 방식: _pow_ 는 값^개수 (곱연산), 그 밖은 값 × 개수 (합연산). 쌓이지 않으면 null */
function stackKindKey(trait: MasteryTrait): string | null {
  if (!PANEL.STACKING_DESC.test(trait.desc)) return null;
  return trait.statName.startsWith(PANEL.POW_PREFIX) || PANEL.STEP_POWER_STATS[trait.statName]
    ? 'calc.mastery.stackMultiply'
    : 'calc.mastery.stackSum';
}

/** 같은 단계끼리 묶는다 (특성은 이미 단계 순으로 정렬되어 있음). 열리는 레벨은 단계 안에서 같다 */
function groupBySteps(traits: MasteryTrait[]): { step: number; unlockLevel: number; traits: MasteryTrait[] }[] {
  const steps: { step: number; unlockLevel: number; traits: MasteryTrait[] }[] = [];
  for (const trait of traits) {
    const last = steps[steps.length - 1];
    if (last && last.step === trait.step) last.traits.push(trait);
    else steps.push({ step: trait.step, unlockLevel: trait.unlockLevel, traits: [trait] });
  }
  return steps;
}

interface TraitNodeProps {
  trait: MasteryTrait;
  level: number;
  /** 늘 같은 함수여야 한다 (memo: 레벨이 바뀐 칸만 다시 그림) */
  onChangeLevel: (trait: MasteryTrait, level: number) => void;
  /** true 면 값을 바꾸는 입력 (아이콘 클릭 · 레벨 칸 · 최대 버튼) 을 모두 보기 전용으로 만든다 (추천 결과 화면) */
  readOnly?: boolean;
  /** 앞 단계 조건 (일반: 앞 단계 특성 하나가 최대, 얼티밋: 같은 종류 마지막 단계 특성 하나가 최대) 을 못 채움. 올리기는 막고 내리기만 된다 */
  locked?: boolean;
  /** 지금 들어간 값 글 (모든 탭 줄을 받은 경우만, 쌓이는 특성에만 보인다) */
  current?: string;
}

/**
 * 특성 칸 하나: 아이콘 위에 올리면 이름·효과 말풍선, 아래에 이름과 레벨.
 * 일반 = 아이콘을 누르면 최대 (최대면 0) + 레벨 칸, 얼티밋 = 아이콘을 눌러 켬/끔.
 * memo: 특성 하나를 바꿀 때 나머지 100여 칸은 다시 그리지 않는다 (전에는 클릭마다 나무 전체를 다시 그려 0.7초)
 */
const TraitNode = memo(function TraitNode({ trait, level, onChangeLevel, readOnly, locked, current }: TraitNodeProps) {
  const { t: translate } = useTranslation();
  const name = translate(`calc.mastery.names.${trait.rNo}`, { defaultValue: trait.statName });
  const active = level > 0;
  // 일반 특성은 지금 레벨의 효과, 얼티밋은 켬/끔뿐이라 켰을 때 효과 (값이 하나)
  const effectText = traitEffectText(trait, trait.ultimate ? ULTIMATE_ON_LEVEL : level);
  const stackKey = stackKindKey(trait);
  const note = translate(`calc.mastery.notes.${trait.rNo}`, { defaultValue: '' });
  // 추천 계산에서 뺀 이유는 넣는 법 안내와 따로 보인다
  const excludedReason = translate(`calc.mastery.excludedReasons.${trait.rNo}`, { defaultValue: '' });
  const lockedText = locked
    ? translate(trait.ultimate ? 'calc.mastery.lockedUltimate' : 'calc.mastery.lockedPrevious')
    : '';
  // 조건을 못 채웠으면 올리기는 막고 내리기만 받는다
  const changeLevel = (next: number) => onChangeLevel(trait, locked ? Math.min(next, level) : next);
  const icon = (
    <Image
      src={traitIconPath(trait)}
      w={PANEL.NODE_ICON_SIZE}
      h={PANEL.NODE_ICON_SIZE}
      alt={name}
      style={!active ? PANEL.INACTIVE_ICON_STYLE : undefined}
    />
  );
  return (
    <Stack gap={2} align="center" w={PANEL.NODE_WIDTH}>
      {/* 마우스를 설명 위로 옮겨도 닫히지 않아 글을 골라 복사할 수 있다 */}
      <HoverCard width={PANEL.TOOLTIP_MAX_WIDTH} shadow="md" position="top" withinPortal>
        <HoverCard.Dropdown p="xs">
          <Text size="xs" fw={700}>
            {name}
            {stackKey && ` (${translate(stackKey)})`}
          </Text>
          <Text size="xs">
            {effectText}
            {stackKey && current !== undefined && ` ${translate('calc.mastery.current', { value: current })}`}
          </Text>
          {/* 특성별 안내 (예: 같은 등급 연성장비 조건에서 GR · GR+ 는 다른 등급) */}
          {note && (
            <Text size="xs" mt={4}>
              {note}
            </Text>
          )}
          {excludedReason && (
            <Text size="xs" mt={4}>
              {excludedReason}
            </Text>
          )}
          {lockedText && (
            <Text size="xs" mt={4}>
              {lockedText}
            </Text>
          )}
        </HoverCard.Dropdown>
        <HoverCard.Target>
          {readOnly ? (
            <Box>{icon}</Box>
          ) : trait.ultimate ? (
            <UnstyledButton
              aria-label={name}
              aria-pressed={active}
              onClick={() => changeLevel(active ? MIN_LEVEL : ULTIMATE_ON_LEVEL)}
            >
              {icon}
            </UnstyledButton>
          ) : (
            <UnstyledButton
              aria-label={translate('calc.mastery.fillMax', { name })}
              // 누르면 최대 레벨, 이미 최대면 0
              onClick={() => changeLevel(level >= trait.maxLevel ? MIN_LEVEL : trait.maxLevel)}
            >
              {icon}
            </UnstyledButton>
          )}
        </HoverCard.Target>
      </HoverCard>
      <Text size={PANEL.NODE_NAME_TEXT_SIZE} ta="center" lineClamp={PANEL.NODE_NAME_MAX_LINES} w="100%" title={name}>
        {name}
      </Text>
      {trait.ultimate ? (
        <Text size={PANEL.NODE_SMALL_TEXT_SIZE}>
          {active
            ? translate('calc.mastery.ultimateOn', { defaultValue: '사용' })
            : translate('calc.mastery.ultimateOff', { defaultValue: '미사용' })}
        </Text>
      ) : (
        <Group gap={2} wrap="nowrap" align="center">
          <NumberInput
            size="xs"
            w={PANEL.NODE_LEVEL_INPUT_WIDTH}
            styles={{ input: { paddingInline: PANEL.NODE_LEVEL_INPUT_PADDING } }}
            hideControls
            min={MIN_LEVEL}
            max={trait.maxLevel}
            allowNegative={false}
            allowDecimal={false}
            aria-label={translate('calc.mastery.levelInput', { name })}
            value={level}
            readOnly={readOnly}
            error={locked && active}
            onChange={(next) => changeLevel(Number(next) || MIN_LEVEL)}
          />
          {readOnly ? (
            <Text size={PANEL.NODE_SMALL_TEXT_SIZE}>{translate('calc.mastery.maxLevel', { max: trait.maxLevel })}</Text>
          ) : (
            <UnstyledButton
              aria-label={translate('calc.mastery.levelMax')}
              title={translate('calc.mastery.levelMax')}
              onClick={() => changeLevel(trait.maxLevel)}
            >
              <Text size={PANEL.NODE_SMALL_TEXT_SIZE}>
                {translate('calc.mastery.maxLevel', { max: trait.maxLevel })}
              </Text>
            </UnstyledButton>
          )}
        </Group>
      )}
    </Stack>
  );
});

/**
 * 특성 탭: 게임 특성 화면처럼 단계마다 한 줄에 아이콘과 레벨 칸만 놓는다.
 * 이름·효과는 아이콘 위에 올렸을 때 말풍선으로. 레벨은 칸 mastery_<rNo> 에 저장
 */
export default function MasteryPanel({
  values,
  setValue,
  tables,
  descriptions,
  readOnly,
  traitLines,
}: TabPanelProps & {
  readOnly?: boolean;
  /** 모든 탭 줄 (있으면 툴팁에 특성마다 지금 들어간 값) */
  traitLines?: (values: CalcValues, tables: StatTables) => Line[];
}) {
  const { t: translate } = useTranslation();
  const changeLevel = useCallback(
    (trait: MasteryTrait, level: number) =>
      setValue(masteryLevelKey(trait.rNo), String(clampedMasteryLevel(trait, level))),
    [setValue],
  );
  const masteryTable = tables.Mastery;
  if (!masteryTable) return null;

  const traits = masteryTraits(masteryTable);
  // 특성 번호 → 그 특성에서 나온 줄
  // 지금 계정에 붙을 수 있는 값: 설명과 같은 기준 (얼티밋은 켠 것으로, 일반 특성은 지금 레벨) 으로 지금 계정의 개수, 확률로 계산한다
  const linesByTrait = new Map<string, Line[]>();
  let chances: Chances = {};
  let potential: CalcValues = values;
  let allLines: Line[] = [];
  let levelOf = (trait: MasteryTrait) => masteryLevel(values, trait);
  if (traitLines) {
    potential = { ...values };
    for (const trait of traits) {
      if (trait.ultimate) potential[masteryLevelKey(trait.rNo)] = String(ULTIMATE_ON_LEVEL);
    }
    levelOf = (trait) => masteryLevel(potential, trait);
    allLines = traitLines(potential, tables);
    chances = chancesFromLines(allLines, potential, tables);
    for (const line of allLines) {
      if (!line.traitNo) continue;
      const list = linesByTrait.get(line.traitNo) ?? [];
      list.push(line);
      linesByTrait.set(line.traitNo, list);
    }
  }
  const currentOf = (trait: MasteryTrait) => {
    if (!traitLines) return undefined;
    // 히어로마다 따로 세는 개수 (전용 무기 클리어 미션 수): 1슬롯, 2슬롯 칸 값 × 특성 값
    if (trait.statName.endsWith(TRANS_MISSION_SUFFIX)) {
      const [first, second] = CONSTS.masteryRuneBuff.TRANS_MISSION_FIELDS.map((field) =>
        currentNumber(Math.log10(traitValue(trait, ULTIMATE_ON_LEVEL) * Math.max(Number(values[field]) || 0, 0))),
      );
      return translate('calc.mastery.currentSlots', { first: `${first}%`, second: `${second}%` });
    }
    // 확률 계산 안에서 더해지는 특성: 이 특성 줄이 있을 때와 없을 때의 확률 차이
    const gainedChance = PANEL.CHANCE_GAIN_STATS[trait.statName];
    if (gainedChance) {
      const without = chancesFromLines(
        allLines.filter((line) => line.traitNo !== trait.rNo),
        potential,
        tables,
      );
      const gain = (chances[gainedChance] ?? 0) - (without[gainedChance] ?? 0);
      return `${gain > 0 ? currentNumber(Math.log10(gain)) : 0}%`;
    }
    const chanceName = PANEL.STEP_POWER_STATS[trait.statName];
    if (chanceName) {
      // (1 + 값 / 100)^floor(확률 / 10) 의 늘어난 양 (%): 설명이 % 단위
      const steps = Math.floor(Math.trunc(chances[chanceName] ?? 0) / PANEL.STEP_POWER_CHANCE_STEP);
      const multiplier = Math.pow(1 + traitValue(trait, levelOf(trait)) / 100, steps);
      return `${currentNumber(Math.log10((multiplier - 1) * 100))}%`;
    }
    return currentValueText(trait, linesByTrait.get(trait.rNo) ?? []);
  };
  const totals = masteryTotals(traits, values);
  // 앞 단계 조건: 최적 추천과 같은 규칙 (masteryOptimizer/rules.ts)
  const allocation: Allocation = Object.fromEntries(traits.map((trait) => [trait.rNo, masteryLevel(values, trait)]));
  const lockedSet = new Set(
    traits
      .filter(
        (trait) =>
          !(trait.ultimate
            ? ultimateGateCleared(traits, trait, allocation)
            : previousStepCleared(traits, trait, allocation)),
      )
      .map((trait) => trait.rNo),
  );
  const violationNames = traits
    .filter((trait) => lockedSet.has(trait.rNo) && (allocation[trait.rNo] ?? 0) > 0)
    .map((trait) => translate(`calc.mastery.names.${trait.rNo}`, { defaultValue: trait.statName }));
  // 켠 얼티밋 중 계산하지 못하는 것 (특성 레벨 칸만 읽음)
  const skippedUltimates = skippedUltimateNames(values, masteryTable, (key, params) => translate(key, params ?? {}));
  const resetTraits = (targets: MasteryTrait[]) => {
    for (const trait of targets) setValue(masteryLevelKey(trait.rNo), '');
  };
  const totalLabel = (statName: string, trait: MasteryTrait) =>
    descriptions[statName] !== undefined ? statLabel(descriptions, statName) : trait.desc;

  return (
    <Stack gap="sm">
      <Group gap="md" align="center">
        <SectionTitle>{translate('calc.mastery.pointsTitle')}</SectionTitle>
        <Text size="sm">
          {translate('calc.mastery.pointsTotal')} {plainNumber(totals.points)}
        </Text>
        {MASTERY_GROUPS.map((group) => (
          <Text key={group} size="sm">
            {translate(`calc.mastery.groups.${group}`)} {plainNumber(totals.pointsByGroup[group] ?? 0)}
          </Text>
        ))}
        {!readOnly && (
          <Button size="compact-xs" variant="default" onClick={() => resetTraits(traits)}>
            {translate('calc.mastery.resetAll')}
          </Button>
        )}
      </Group>
      <Text size="xs">{translate('calc.mastery.pointsHint')}</Text>
      {!readOnly && violationNames.length > 0 && (
        <Text size="xs" c="red">
          {translate('calc.mastery.lockedViolations', { names: violationNames.join(', ') })}
        </Text>
      )}
      {skippedUltimates.length > 0 && (
        <Text size="xs" c="orange">
          {translate('calc.ultimate.skipped', { names: skippedUltimates.join(', ') })}
        </Text>
      )}

      {/* 스탯·스킬·히어로를 좌우로 나란히 놓는다. 화면이 좁으면 쌓지 않고 가로 스크롤 */}
      <Box style={{ overflow: 'auto', maxHeight: PANEL.TREE_MAX_HEIGHT }}>
        <Group gap={PANEL.COLUMN_GAP} wrap="nowrap" align="flex-start" justify="space-between">
          {MASTERY_GROUPS.map((group) => {
            const groupTraits = traits.filter((trait) => trait.group === group);
            return (
              <Stack key={group} gap={PANEL.STAGE_ROW_GAP} miw={PANEL.COLUMN_WIDTH} style={{ flex: 1 }}>
                {/* 안쪽에서 스크롤해도 열 제목이 맨 위에 남는다 */}
                <Group
                  gap="xs"
                  align="center"
                  pos="sticky"
                  top={0}
                  py={PANEL.COLUMN_HEADER_PADDING}
                  bg="var(--mantine-color-body)"
                  style={{ zIndex: PANEL.COLUMN_HEADER_Z_INDEX }}
                >
                  <SectionTitle>{translate(`calc.mastery.groups.${group}`)}</SectionTitle>
                  {!readOnly && (
                    <Button size="compact-xs" variant="subtle" onClick={() => resetTraits(groupTraits)}>
                      {translate('calc.mastery.resetGroup')}
                    </Button>
                  )}
                </Group>
                {groupBySteps(groupTraits).map(({ step, unlockLevel, traits: stepTraits }) => (
                  // 일반 특성 단계 (1~18) 뒤에 얼티밋 단계 (1~7) 가 다시 1부터 나오므로 key 에 둘을 구분해 넣는다
                  <Group
                    key={`${stepTraits[0].ultimate ? 'ultimate' : 'trait'}-${step}`}
                    gap={PANEL.NODE_GAP}
                    wrap="nowrap"
                    align="flex-start"
                  >
                    {/* 단계 이름 아래에 열리는 레벨 (같은 레벨에 단계 두 개가 열리는 곳이 있어 옆 칸과 맞춰 보게) */}
                    <Stack
                      gap={0}
                      w={PANEL.STAGE_LABEL_WIDTH}
                      pt={PANEL.STAGE_LABEL_TOP_OFFSET}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Text size="xs">{translate('calc.mastery.step', { step })}</Text>
                      <Text size="xs">
                        {translate('calc.mastery.unlockLevel', { level: unlockLevel.toLocaleString('ko-KR') })}
                      </Text>
                    </Stack>
                    {/* 특성 칸은 줄 가운데에 일정한 간격으로 */}
                    <Group
                      justify="center"
                      gap={PANEL.TRAIT_ROW_GAP}
                      wrap="nowrap"
                      align="flex-start"
                      style={{ flex: 1 }}
                    >
                      {stepTraits.map((trait) => (
                        <TraitNode
                          key={trait.rNo}
                          trait={trait}
                          level={masteryLevel(values, trait)}
                          onChangeLevel={changeLevel}
                          readOnly={readOnly}
                          locked={!readOnly && lockedSet.has(trait.rNo)}
                          current={currentOf(trait)}
                        />
                      ))}
                    </Group>
                  </Group>
                ))}
              </Stack>
            );
          })}
        </Group>
      </Box>

      <Accordion variant="contained">
        <Accordion.Item value="totals">
          <Accordion.Control>{translate('calc.mastery.totalsOpen')}</Accordion.Control>
          <Accordion.Panel>
            {totals.stats.length ? (
              <Table.ScrollContainer minWidth={CONSTS.display.TABLE_MIN_WIDTH}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{translate('calc.mastery.totalsStat')}</Table.Th>
                      <Table.Th>{translate('calc.mastery.totalsValue')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {totals.stats.map((entry) => (
                      <Table.Tr key={entry.statName}>
                        <Table.Td>{totalLabel(entry.statName, entry.trait)}</Table.Td>
                        <Table.Td ta="right">{plainNumber(entry.value)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            ) : (
              <Text size="sm">{translate('calc.mastery.totalsEmpty')}</Text>
            )}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
