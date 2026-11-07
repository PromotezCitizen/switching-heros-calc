import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Group, LoadingOverlay, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { CONSTS } from '@/CONSTS';
import MasteryPanel from '@/calc/panels/MasteryPanel';
import { masteryTraits } from '@/calc/sources/masteryRuneBuff/mastery';
import { skillRows } from '@/calc/sources/skill/skill';
import { statDescription, statLabel, type StatDescriptions } from '@/calc/statText';
import { formatLog } from '@/calc/gameNumber';
import { valuesForTarget } from '@/usb/saveImport/contentPresets';
import { calcValuesOf } from '@/calc/storeKeys';
import type { CalcValues } from '@/calc/types';
import { FlagField, GroupedSelectField, NumberField } from '@/components/StoreFields';
import CardRecommendSection from '@/cardOptimizer/CardRecommendSection';
import { useStatTables } from '@/data/statTables';
import { OWNED_CARDS_KEY } from '@/usb/saveImport/ownedCards';
import { bundleTarget, masteryBundleTarget } from '@/masteryOptimizer/targetBundles';
import { useJsonData } from '@/data/useJsonData';
import { swapCycle } from '@/dpm/swapCycle';
import { DAMAGE_TARGETS, type DamageTarget } from '@/dpm/targetDamage';
import type { MonsterHpData } from '@/dpm/hpCondition';
import { valuesWithAllocation } from '@/masteryOptimizer/evaluate';
import { OPTIMIZER_TABLES } from '@/masteryOptimizer/optimizerTables';
import { usedPoints } from '@/masteryOptimizer/rules';
import { optimizerSnapshot, type OptimizerInputs } from '@/masteryOptimizer/snapshot';
import { masteryResultKey, parseMasteryResult, type StoredMasteryResult } from '@/masteryOptimizer/storedResult';
import { useRecommendation } from '@/masteryOptimizer/useRecommendation';
import { useBatchRecommendation } from '@/masteryOptimizer/useBatchRecommendation';
import { BATCH_CARD_TARGETS, BATCH_MASTERY_TARGETS } from '@/masteryOptimizer/batchRecommend';
import { readNumber } from '@/store/storedValues';
import { useCalcStore } from '@/store/useCalcStore';

const { TARGETS } = CONSTS.dpm;
/** 최적화 대상 묶음 (대상 종류 순서: 일반 · 보스 · 히어로) */
const TARGET_UNITS = ['normal', 'boss', 'hero'] as const;
const KEY_PREFIX = 'optimizer.';
const USER_LEVEL_KEY = ACCOUNT_KEYS.userLevel;
const TARGET_KEY = `${KEY_PREFIX}target`;
/** 묶인 대상 버튼 이름을 잇는 글 */
const TARGET_LABEL_JOINER = ' · ';
const TARGETS_PER_SKILL_KEY = `${KEY_PREFIX}targetsPerSkill`;
const STAGE_FLOOR_KEY = `${KEY_PREFIX}stageFloor`;
/** 자동 교체 (저장된 값이 없으면 켜짐: 2026-10-28 결정) */
const AUTO_SWAP_KEY = `${KEY_PREFIX}autoSwap`;
const DEFAULT_TARGETS_PER_SKILL = 3;
/** 계산 중 덮개: 보여 줄 결과가 없을 때도 스피너가 보이는 최소 높이 (px) */
const LOADING_MIN_HEIGHT = 120;
const SECONDS_DECIMALS = 2;
/** 추정한 값을 알리는 코드의 앞부분 (src/dpm: `estimate:<이름>:<스킬 번호>`) */
const ESTIMATE_PREFIX = 'estimate';
/** 카드 조건부 효과 코드 (`conditionStatsNotCounted:<스탯>,<스탯>`, src/dpm/targetDamage.ts) */
const CONDITION_STATS_KEY = 'conditionStatsNotCounted';
const PERCENT = 100;
/** 대미지 계산이 못 넣은 몫의 코드 중 "지원하지 않는 스킬" 앞부분 (src/dpm/targetDamage.ts) */
const UNSUPPORTED_PREFIX = 'unsupported';
/** 특성 화면 (MasteryPanel) 은 추천 결과를 보여 주기만 한다: 값을 바꾸는 입력은 무시 (늘 같은 함수여야 패널이 다시 그리지 않음) */
const IGNORE_CHANGE = (): void => undefined;
const NO_DESCRIPTIONS: StatDescriptions = {};

function formatCount(value: number): string {
  return value.toLocaleString('ko-KR');
}

export default function OptimizerPage() {
  const { t: translate } = useTranslation();
  const storeValues = useCalcStore((state) => state.values);
  const tables = useStatTables(OPTIMIZER_TABLES);
  const monsterHp = useJsonData<MonsterHpData>('monsterHp.json');
  const descriptions = useJsonData<StatDescriptions>('statDescriptions.json');
  const recommendation = useRecommendation();
  const batch = useBatchRecommendation();

  // 계산에는 계산식 확인기 칸 (접두사 뗀 것) 과 VIP 레벨을 넘긴다 (src/dpm 이 읽는 형태)
  const chosenTarget: DamageTarget = DAMAGE_TARGETS.find((candidate) => candidate === storeValues[TARGET_KEY]) ?? DAMAGE_TARGETS[0];
  // 게임 조건이 같은 대상끼리는 한 번만 계산한다 (묶음 앞 대상으로 계산 · 저장, targetBundles.ts)
  const target = bundleTarget(chosenTarget);
  // 특성 추천은 더 크게 묶어 계산 · 저장한다 (보스끼리 · 히어로끼리 하나, MASTERY_BUNDLES). 카드 추천은 target 그대로
  const masteryTarget = masteryBundleTarget(chosenTarget);
  // 버튼도 묶는다: 같은 대상으로 계산되는 대상은 버튼 하나, 이름은 이어 붙이고 값은 묶음 앞 대상
  const targetGroups = useMemo(() => {
    return TARGET_UNITS.map((unit) => {
      const merged = new Map<DamageTarget, string[]>();
      for (const value of DAMAGE_TARGETS.filter((candidate) => TARGETS[candidate].UNIT === unit)) {
        const representative = bundleTarget(value);
        merged.set(representative, [...(merged.get(representative) ?? []), translate(`optimizer.targets.${value}`)]);
      }
      const options = [...merged].map(([value, labels]) => ({ value, label: labels.join(TARGET_LABEL_JOINER) }));
      // 특성 추천을 같이 쓰는 버튼이 여러 개인 줄 (보스 · 히어로, MASTERY_BUNDLES) 에 설명
      const sharesMastery = options.length > 1 && new Set(options.map((option) => masteryBundleTarget(option.value))).size === 1;
      return {
        label: translate(`optimizer.targetGroups.${unit}`),
        options,
        hint: sharesMastery ? translate(`optimizer.sharedMasteryHint.${unit}`, { defaultValue: '' }) || undefined : undefined,
      };
    });
  }, [translate]);
  // 최적화 대상의 콘텐츠 프리셋 칸으로 바꿔 계산한다 (저장 가져오기가 남긴 프리셋별 칸, contentPresets.ts. 정보가 없으면 지금 칸 그대로)
  const calcValues = useMemo(
    (): CalcValues =>
      valuesForTarget({ ...calcValuesOf(storeValues), [ACCOUNT_KEYS.vipLevel]: storeValues[ACCOUNT_KEYS.vipLevel] ?? '' }, target),
    [storeValues, target],
  );
  const masteryCalcValues = useMemo(
    (): CalcValues =>
      valuesForTarget({ ...calcValuesOf(storeValues), [ACCOUNT_KEYS.vipLevel]: storeValues[ACCOUNT_KEYS.vipLevel] ?? '' }, masteryTarget),
    [storeValues, masteryTarget],
  );
  const autoSwap = storeValues[AUTO_SWAP_KEY] !== 'false';
  const userLevel = readNumber(storeValues, USER_LEVEL_KEY);
  const vipLevel = readNumber(storeValues, ACCOUNT_KEYS.vipLevel);

  const inputs = useMemo((): OptimizerInputs | null => {
    if (monsterHp.status === 'loading') return null;
    const stageFloor = readNumber(storeValues, STAGE_FLOOR_KEY);
    return {
      userLevel,
      vipLevel,
      target,
      damage: {
        targetsPerSkill: readNumber(storeValues, TARGETS_PER_SKILL_KEY, DEFAULT_TARGETS_PER_SKILL),
        orbShardHits: {},
        targetStatusCount: {},
        stageFloor: stageFloor > 0 ? stageFloor : null,
        attributeDungeonFloor: null,
        monsterHp: monsterHp.status === 'ready' ? monsterHp.data : null,
        swap: autoSwap,
      },
    };
  }, [storeValues, monsterHp, userLevel, vipLevel, target, autoSwap]);
  const masteryInputs = useMemo((): OptimizerInputs | null => (inputs ? { ...inputs, target: masteryTarget } : null), [inputs, masteryTarget]);

  const snapshot = useMemo(
    () => (tables.status === 'ready' && masteryInputs ? optimizerSnapshot(masteryCalcValues, tables.data, masteryInputs) : null),
    [masteryCalcValues, tables, masteryInputs],
  );
  const traits = useMemo(() => (tables.status === 'ready' ? masteryTraits(tables.data.Mastery) : []), [tables]);
  const cycle = useMemo(() => (tables.status === 'ready' ? swapCycle(tables.data) : null), [tables]);
  /** 계산에 못 넣은 몫 · 추정한 값의 코드 (`<코드>:<스킬 번호>` 또는 `estimate:<코드>:<스킬 번호>`, src/dpm) → 한국어 문장 */
  const missingMessage = (code: string): string => {
    const [first, second, third] = code.split(':');
    const isEstimate = first === ESTIMATE_PREFIX;
    const key = isEstimate ? second : first;
    const skillId = (isEstimate ? third : second) ?? '';
    // 조건부 효과 코드 목록은 스탯 설명으로 바꿔 보여 준다
    const skill =
      key === CONDITION_STATS_KEY
        ? skillId
            .split(',')
            .map((stat) => (descriptions.status === 'ready' && statDescription(descriptions.data, stat) ? statLabel(descriptions.data, stat) : stat))
            .join(', ')
        : (skillNames.get(skillId) ?? skillId);
    return translate(`optimizer.missing.${key}`, { skill, defaultValue: translate('optimizer.missing.unknown') });
  };
  /* 직업 스킬 번호 → 이름 (내역 표에 번호 대신 이름을 보여 준다. 전용 스킬은 히어로마다 하나라 이름을 붙이지 않음) */
  const skillNames = useMemo(
    () => new Map<string, string>(tables.status === 'ready' ? skillRows(tables.data).map((row) => [row.skillId, row.name]) : []),
    [tables],
  );
  const cycleTime = (gameSeconds: number): string => translate('optimizer.swapTime', { game: gameSeconds.toFixed(SECONDS_DECIMALS) });
  const cycleRows: [string, string][] = cycle
    ? [
        [translate('optimizer.swapHeroes'), `${calcValues.charName || '-'} ⇄ ${calcValues.charName2 || '-'}`],
        [
          translate('optimizer.swapGauge'),
          translate('optimizer.swapGaugeValue', { max: cycle.gaugeMax, start: cycle.gaugeStart, percent: cycle.gaugeStartPercent }),
        ],
        [translate('optimizer.swapFirst'), cycleTime(cycle.firstSeconds)],
        [translate('optimizer.swapFull'), cycleTime(cycle.fullSeconds)],
        [translate('optimizer.swapShare'), translate('optimizer.swapShareValue', { percent: CONSTS.dpm.SWAP.TIME_SHARE * PERCENT })],
      ]
    : [];

  const { state: recommendState } = recommendation;
  const running = recommendState.status === 'running';
  /** 카드 추천 계산이 도는 중인가 (카드 섹션이 알려 준다) */
  const [cardRunning, setCardRunning] = useState(false);
  /** 특성 · 카드 어느 쪽이든 계산 중이면 최적화 대상과 자동 교체를 못 바꾼다 (계산이 시작한 때의 조건으로 끝나게) */
  const locked = running || cardRunning || batch.running;
  // 저장된 대상이 묶음 앞 대상이 아니면 (버튼이 묶여 그 대상 버튼이 없음) 묶음 앞 대상으로 바꿔 둔다. 계산 중에는 대상을 바꾸지 않는다
  const setStoreValue = useCalcStore((state) => state.setValue);
  useEffect(() => {
    if (!locked && target !== chosenTarget) setStoreValue(TARGET_KEY, target);
  }, [locked, target, chosenTarget, setStoreValue]);
  const done = recommendState.status === 'done' ? recommendState : null;
  /** 지금 최적화 대상과 자동 교체 상태에 맞는 결과 저장 칸 */
  const resultKey = masteryResultKey(masteryTarget, autoSwap);
  /** 계산을 시작한 때의 저장 칸: 계산 중에 대상이나 자동 교체를 바꿔도 끝난 결과는 시작한 때의 칸에 저장한다 */
  const runKeyRef = useRef(resultKey);
  useEffect(() => {
    if (!done) return;
    const stored: StoredMasteryResult = { allocation: done.allocation, baseEfficiency: done.baseEfficiency, efficiency: done.efficiency };
    useCalcStore.getState().setValue(runKeyRef.current, JSON.stringify(stored));
  }, [done]);
  // 보여 주는 결과: 지금 대상과 자동 교체 상태의 저장된 결과 (바꿔도 그 조합의 마지막 결과가 그대로 보인다)
  const storedText = storeValues[resultKey];
  const shown = useMemo(
    () => parseMasteryResult(storedText) ?? (done && runKeyRef.current === resultKey ? done : null),
    [storedText, done, resultKey],
  );
  /** 추천 레벨을 넣은 입력값 (특성 화면이 읽는 형태: 칸 이름 `mastery_<번호>`) */
  const recommendedValues = useMemo(
    () => (shown ? valuesWithAllocation(masteryCalcValues, traits, shown.allocation) : null),
    [shown, masteryCalcValues, traits],
  );
  const unsupportedSkills = snapshot?.result.missing.some((code) => code.startsWith(UNSUPPORTED_PREFIX)) ?? false;

  const startRecommendation = () => {
    if (tables.status !== 'ready' || !masteryInputs) return;
    runKeyRef.current = resultKey;
    recommendation.start({ values: masteryCalcValues, tables: tables.data, inputs: masteryInputs });
  };

  const efficiencyText = (() => {
    if (!snapshot || !Number.isFinite(snapshot.efficiency)) return translate('optimizer.efficiencyNone');
    const damage = formatLog(snapshot.efficiency);
    return snapshot.result.windowSeconds === null
      ? translate('optimizer.efficiencyStage', { damage })
      : translate('optimizer.efficiencyWindow', { seconds: snapshot.result.windowSeconds, damage });
  })();

  /** 대미지는 log10 값이라 차이 = 몇 배인지 (게임 단위 표기) */
  const gainText = (gainLog: number): string => formatLog(gainLog);

  return (
    <Stack mt="lg" gap="md">
      <Text c="dimmed">{translate('optimizer.intro')}</Text>
      <Text size="sm" c="dimmed">
        {translate('optimizer.accountHint')}
      </Text>

      <Paper withBorder p="md">
        <Title order={3} mb="sm">{translate('optimizer.inputsTitle')}</Title>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <NumberField storeKey={USER_LEVEL_KEY} label={translate('optimizer.userLevel')} min={0} />
          <NumberField
            storeKey={TARGETS_PER_SKILL_KEY}
            label={translate('optimizer.targetsPerSkill')}
            hint={translate('optimizer.targetsPerSkillHint')}
            min={1}
            fallback={DEFAULT_TARGETS_PER_SKILL}
          />
          <NumberField storeKey={STAGE_FLOOR_KEY} label={translate('optimizer.stageFloor')} min={0} />
        </SimpleGrid>
        <Stack gap="sm">
          <GroupedSelectField
            storeKey={TARGET_KEY}
            label={translate('optimizer.target')}
            groups={targetGroups}
            disabled={locked}
          />
          <FlagField storeKey={AUTO_SWAP_KEY} label={translate('optimizer.autoSwap')} defaultChecked disabled={locked} />
          {locked && (
            <Text size="sm" c="dimmed">
              {translate('optimizer.lockedWhileRunning')}
            </Text>
          )}
          {/* 일괄 계산: 특성 묶음 (2개씩) → 카드 묶음 (3개씩), 끝나는 대상마다 저장 (batchRecommend.ts) */}
          <Group>
            <Button
              variant={batch.running ? 'default' : 'light'}
              onClick={batch.running ? batch.stop : () => tables.status === 'ready' && batch.start(tables.data, monsterHp.status === 'ready' ? monsterHp.data : null)}
              disabled={!batch.running && (tables.status !== 'ready' || monsterHp.status === 'loading' || userLevel <= 0 || running || cardRunning)}
            >
              {translate(batch.running ? 'optimizer.batch.stop' : 'optimizer.batch.start')}
            </Button>
            <Text size="sm" c="dimmed">
              {translate('optimizer.batch.help', { mastery: BATCH_MASTERY_TARGETS.length, cards: BATCH_CARD_TARGETS.length })}
            </Text>
          </Group>
          {batch.progress && (
            <Text size="sm">
              {translate(batch.progress.phase === 'done' ? 'optimizer.batch.done' : 'optimizer.batch.running', {
                masteryDone: batch.progress.masteryDone,
                mastery: BATCH_MASTERY_TARGETS.length,
                cardsDone: batch.progress.cardsDone,
                cards: BATCH_CARD_TARGETS.length,
                targets: batch.progress.running.map((name) => translate(`optimizer.targetGroups.${TARGETS[name].UNIT}`) + ' ' + translate(`optimizer.targets.${name}`)).join(', ') || '-',
              })}
            </Text>
          )}
          {batch.progress && batch.progress.failed.length > 0 && (
            <Alert color="red">{translate('optimizer.batch.failed', { list: batch.progress.failed.join(' / ') })}</Alert>
          )}
        </Stack>
      </Paper>

      {tables.status === 'loading' && <Text>{translate('optimizer.loading')}</Text>}
      {tables.status === 'failed' && <Alert color="red">{translate('optimizer.loadFailed')}</Alert>}
      {snapshot && (
        <>
          <Paper withBorder p="md">
            <Title order={3} mb="sm">{translate('optimizer.recommendTitle')}</Title>
            <Text size="sm" c="dimmed" mb="sm">
              {translate('optimizer.recommendHelp')}
            </Text>
            {unsupportedSkills && (
              <Alert color="yellow" mb="sm">
                {translate('optimizer.unsupportedWarning')}
              </Alert>
            )}
            <Group>
              {/* 버튼 하나: 계산 중에는 멈추기로 바뀐다 */}
              <Button
                variant={running ? 'default' : 'filled'}
                onClick={running ? recommendation.stop : startRecommendation}
                disabled={!running && (userLevel <= 0 || batch.running || cardRunning)}
              >
                {translate(running ? 'optimizer.recommendStop' : 'optimizer.recommendStart')}
              </Button>
            </Group>
            {userLevel <= 0 && (
              <Text size="sm" c="dimmed" mt="xs">
                {translate('optimizer.userLevelNeeded')}
              </Text>
            )}
            {running && (
              <Text mt="sm">
                {recommendState.progress?.phase
                  ? translate(`optimizer.phase.${recommendState.progress.phase}`, {
                      evaluations: formatCount(recommendState.progress.evaluations),
                      damage: formatLog(recommendState.progress.efficiency),
                    })
                  : recommendState.progress
                  ? translate('optimizer.recommendRunning', {
                      block: formatCount(recommendState.progress.block),
                      evaluations: formatCount(recommendState.progress.evaluations),
                      damage: formatLog(recommendState.progress.efficiency),
                    })
                  : translate('optimizer.recommendStarting')}
              </Text>
            )}
            {recommendState.status === 'failed' && (
              <Alert color="red" mt="sm">
                {translate('optimizer.recommendFailed', { message: recommendState.message })}
              </Alert>
            )}
            {/* 계산 중에는 결과 위를 회색으로 덮고 스피너 (멈추기 버튼 · 진행 문구는 덮개 밖) */}
            <Box pos="relative" mt="sm" mih={running ? LOADING_MIN_HEIGHT : undefined}>
            {/* 특성 화면의 고정 열 제목 (스탯 · 스킬 · 히어로) 보다 위, 앱 상단 고정 줄보다 아래 */}
            <LoadingOverlay visible={running} zIndex={CONSTS.masteryRuneBuff.PANEL.COLUMN_HEADER_Z_INDEX + 1} />
            {shown && (
              <Stack gap="xs">
                <Text fw={600}>
                  {translate('optimizer.recommendDone', {
                    before: formatLog(shown.baseEfficiency ?? snapshot.efficiency),
                    after: formatLog(shown.efficiency),
                    gain: gainText(shown.efficiency - (shown.baseEfficiency ?? snapshot.efficiency)),
                  })}
                </Text>
                <Text>
                  {translate('optimizer.recommendPoints', {
                    used: formatCount(usedPoints(traits, shown.allocation)),
                    total: formatCount(snapshot.totalPoints),
                    remaining: formatCount(snapshot.totalPoints - usedPoints(traits, shown.allocation)),
                  })}
                </Text>
                <Title order={4} mt="md">{translate('optimizer.treeTitle')}</Title>
                <Text size="sm" c="dimmed">
                  {translate('optimizer.treeHelp')}
                </Text>
                {recommendedValues && tables.status === 'ready' && (
                  <MasteryPanel
                    values={recommendedValues}
                    setValue={IGNORE_CHANGE}
                    readOnly
                    tables={tables.data}
                    descriptions={descriptions.status === 'ready' ? descriptions.data : NO_DESCRIPTIONS}
                  />
                )}
              </Stack>
            )}
            </Box>
          </Paper>

          {tables.status === 'ready' && (
            <CardRecommendSection
              calcValues={calcValues}
              tables={tables.data}
              descriptions={descriptions.status === 'ready' ? descriptions.data : NO_DESCRIPTIONS}
              inputs={inputs}
              ownedText={storeValues[OWNED_CARDS_KEY] ?? ''}
              onRunningChange={setCardRunning}
              externalLocked={batch.running || running}
            />
          )}

          {cycle && (
            <Paper withBorder p="md">
              <Title order={3} mb="sm">{translate('optimizer.swapTitle')}</Title>
              <Table>
                <Table.Tbody>
                  {cycleRows.map(([label, value]) => (
                    <Table.Tr key={label}>
                      <Table.Td>{label}</Table.Td>
                      <Table.Td>{value}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Text mt="sm" size="sm" c="dimmed">
                {translate('optimizer.swapNote')}
              </Text>
            </Paper>
          )}

          <Paper withBorder p="md">
            <Title order={3} mb="sm">{translate('optimizer.efficiencyTitle')}</Title>
            <Text fw={600}>{efficiencyText}</Text>
            {snapshot.result.parts.length > 0 && (
              <Table.ScrollContainer minWidth={320} mt="sm">
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{translate('optimizer.partName')}</Table.Th>
                      <Table.Th>{translate('optimizer.perMinuteLog')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {snapshot.result.parts.map((part) => (
                      <Table.Tr key={`${part.hero ?? ''}-${part.kind}-${part.skillId ?? ''}`}>
                        <Table.Td>
                          {part.hero ? `${part.hero} ` : ''}
                          {translate(`optimizer.kind.${part.kind}`)}
                          {part.skillId && part.kind !== 'char' && part.kind !== 'swap' ? ` ${skillNames.get(part.skillId) ?? part.skillId}` : ''}
                        </Table.Td>
                        <Table.Td>{formatLog(part.perMinuteLog)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
            {snapshot.result.missing.length > 0 && (
              <Stack mt="sm" gap={2}>
                <Text size="sm" fw={600}>
                  {translate('optimizer.missingTitle')}
                </Text>
                {snapshot.result.missing.map((code) => (
                  <Text key={code} size="sm" c="dimmed">
                    · {missingMessage(code)}
                  </Text>
                ))}
              </Stack>
            )}
          </Paper>
        </>
      )}
    </Stack>
  );
}
