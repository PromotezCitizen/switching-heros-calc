import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Box, Button, Group, LoadingOverlay, Paper, Stack, Text, Title } from '@mantine/core';
import ChoiceChips from '@/components/ChoiceChips';
import HorizontalScrollRow from '@/components/HorizontalScrollRow';
import { CONSTS } from '@/CONSTS';
import CardSetCards from '@/calc/panels/heroWeaponCardPet/CardSetCards';
import { CardSlotCard, cardPickerOptions } from '@/calc/panels/heroWeaponCardPet/CardSlotCard';
import IconPicker, { PickerImage } from '@/calc/panels/heroWeaponCardPet/IconPicker';
import { CARD_SLOT_FIELDS, cardMarkFields, useCardNames } from '@/calc/panels/heroWeaponCardPet/cardPanelParts';
import { CARD_EXTRA_MARKS_FIELD, CARD_MARK_NUMBERS, CARD_SLOT_NUMBERS, cardGradeField, cardSetStates } from '@/calc/sources/heroWeaponCardPet/card';
import { rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';
import { joinFieldValues } from '@/calc/useTrackedCalcValues';
import type { StatDescriptions } from '@/calc/statText';
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import type { LockedMarkGroup, LockedMarkOption } from '@/cardOptimizer/lockedMarkGroups';
import { parseOwnedCards, valuesWithLoadout, type Loadout } from '@/cardOptimizer/loadout';
import { useCardRecommendation, type CardRecommendationState } from '@/cardOptimizer/useCardRecommendation';
import type { OptimizerInputs } from '@/masteryOptimizer/snapshot';
import { resultSlot } from '@/masteryOptimizer/storedResult';
import { useCalcStore } from '@/store/useCalcStore';
import { CARD_FIXED_KEY, MAX_FIXED_CARDS, cardResultKey, fixedCardIdsOf, type StoredCardResult } from '@/cardOptimizer/cardResult';

const LOG_DECIMALS = 2;
/** 계산 중 덮개: 보여 줄 결과가 없을 때도 스피너가 보이는 최소 높이 (px) */
const LOADING_MIN_HEIGHT = 120;
/** 몬스터 카드 화면은 추천 결과를 보여 주기만 한다: 값을 바꾸는 입력은 무시 (늘 같은 함수여야 패널이 다시 그리지 않음) */
const IGNORE_CHANGE = (): void => undefined;
const { CARD_SLOT_WIDTH } = CONSTS.heroWeaponCardPet.ui;
const MAX_FIXED = MAX_FIXED_CARDS;
/** 결과 카드 칸의 "고정" 표시 위치 (모서리에서 px) */
const FIXED_BADGE_OFFSET = 6;
/** 고정 카드 버튼에 늘어놓는 그림 크기 (px) */
const FIXED_ICON_SIZE = 40;
const { CARD_ICON_PREFIX } = CONSTS.heroWeaponCardPet.card;

interface Props {
  calcValues: CalcValues;
  tables: StatTables;
  descriptions: StatDescriptions;
  inputs: OptimizerInputs | null;
  /** 공통 입력 칸 account.cardOwned */
  ownedText: string;
  /** 카드 · 세트 마크 계산이 돌기 시작하거나 끝날 때 알린다 (계산 중에는 최적화 대상을 못 바꾸게 하려고) */
  onRunningChange?: (running: boolean) => void;
  /** 다른 계산 (특성 추천 · 일괄 계산) 이 도는 중이면 시작 버튼 · 고정 카드 고르기를 잠근다 */
  externalLocked?: boolean;
}


function cardKey(loadout: Loadout): string {
  return loadout
    .map((entry) => entry.card.cardId)
    .sort()
    .join(',');
}

/**
 * 카드 추천: 카드 6장을 먼저 고르고 (마크는 안 봄), 그 카드의 세트 마크를 이어서 고른다. 두 단계는 따로 계산하고 버튼은 하나다.
 * 둘 다 빈 상태에서 시작하고 지금 편성은 비교에만 쓴다. 결과는 몬스터 카드 탭의 부품 (편성 칸 · 세트 칸) 으로 읽기 전용으로 보여 준다
 */
export default function CardRecommendSection({ calcValues, tables, descriptions, inputs, ownedText, onRunningChange, externalLocked = false }: Props) {
  const { t: translate } = useTranslation();
  const cardsRun = useCardRecommendation();
  const marksRun = useCardRecommendation();
  const owned = useMemo(() => parseOwnedCards(ownedText), [ownedText]);
  const cardsDone = cardsRun.state.status === 'done' ? cardsRun.state : null;
  const marksDone = marksRun.state.status === 'done' ? marksRun.state : null;
  const running = cardsRun.state.status === 'running' || marksRun.state.status === 'running';
  // 카드 계산이 끝나고 세트 마크 계산이 이어지는 사이에도 계산 중으로 본다 (그 사이에 대상을 바꾸면 마크가 다른 조건으로 계산된다)
  useEffect(() => {
    onRunningChange?.(running || chaining.current);
  }, [running, cardsRun.state.status]);
  // 페이지를 떠날 때는 계산 중이 아니라고 알린다
  useEffect(() => () => onRunningChange?.(false), []);

  /** 효율은 log10 값이라 증가량도 log10 차이로 적는다 (+3.38) */
  const gainText = (gainLog: number): string => `+${gainLog.toFixed(LOG_DECIMALS)}`;

  // 결과는 최적화 대상과 자동 교체 상태마다 따로 저장한다 (바꿨다 돌아와도 그 조합의 마지막 결과가 그대로 보이게).
  // 계산 중에 바꿔도 끝난 결과는 계산을 시작한 때의 칸에 저장한다
  const slot = inputs ? resultSlot(inputs.target, inputs.damage.swap === true) : '';
  const runSlotRef = useRef(slot);
  // 지난번 결과 (저장해 둔 것): 새로고침해도 다시 계산하지 않고 바로 보인다
  const storedText = useCalcStore((state) => state.values[cardResultKey(slot)]);
  const restored = useMemo((): { loadout: Loadout; before: number; after: number; lockedGroups?: LockedMarkGroup[] } | null => {
    if (!storedText) return null;
    try {
      const stored = JSON.parse(storedText) as StoredCardResult;
      const loadout = stored.cards.flatMap((entry): Loadout => {
        const card = owned.find((candidate) => candidate.cardId === entry.cardId);
        return card ? [{ card, picks: entry.picks }] : [];
      });
      return loadout.length === stored.cards.length ? { loadout, before: stored.before, after: stored.after, lockedGroups: stored.lockedGroups } : null;
    } catch {
      return null;
    }
  }, [storedText, owned]);

  // 이번에 끝난 결과: 마크까지 끝났고 지금 받은 카드와 같은 카드에 대한 것이어야 한다
  const finishedRun =
    marksDone && (!cardsDone || cardKey(cardsDone.loadout) === cardKey(marksDone.loadout))
      ? {
          loadout: marksDone.loadout,
          before: marksDone.baseEfficiency ?? marksDone.efficiency,
          after: marksDone.efficiency,
          lockedGroups: marksDone.lockedGroups,
        }
      : null;
  // 지금 조합에서 시작한 계산의 결과만 화면에 쓴다 (다른 조합의 결과는 그 조합의 저장 칸에서 읽는다)
  const isCurrentRun = runSlotRef.current === slot;
  const finished = isCurrentRun ? finishedRun : null;
  const result = finished ?? restored;
  // 마크 계산이 끝났고 카드는 새로 받았을 때는 카드만 먼저 보여 준다 (마크는 이어서 계산 중)
  const shown: Loadout | null = result?.loadout ?? (isCurrentRun ? cardsDone?.loadout : null) ?? null;

  // 끝난 결과를 저장한다 (계산을 시작한 때의 칸에)
  const finishedKey = finishedRun ? `${cardKey(finishedRun.loadout)}|${finishedRun.after}` : '';
  useEffect(() => {
    if (!finishedRun) return;
    const stored: StoredCardResult = {
      cards: finishedRun.loadout.map((entry) => ({ cardId: entry.card.cardId, picks: entry.picks })),
      before: finishedRun.before,
      after: finishedRun.after,
      lockedGroups: finishedRun.lockedGroups,
    };
    useCalcStore.getState().setValue(cardResultKey(runSlotRef.current), JSON.stringify(stored));
  }, [finishedKey]);

  // 고정 카드: 바꾸지 않고 먼저 넣어 두고 나머지 칸만 찾는다 (보유 카드만 고를 수 있음)
  const fixedText = useCalcStore((state) => state.values[CARD_FIXED_KEY]);
  const fixedIds = useMemo(() => fixedCardIdsOf(fixedText), [fixedText]);
  // 보여 줄 때는 지금 고정 목록의 카드를 고정 목록 순서로 앞에 둔다. 카드 효과는 칸 번호와 상관없이 더해져 효율은 같다 (valuesWithLoadout)
  const shownValues = useMemo(() => {
    if (!shown) return null;
    const rank = (entry: Loadout[number]) => {
      const index = fixedIds.indexOf(entry.card.cardId);
      return index === -1 ? fixedIds.length : index;
    };
    return valuesWithLoadout(calcValues, tables, [...shown].sort((left, right) => rank(left) - rank(right)));
  }, [shown, fixedIds, calcValues, tables]);
  // 세트가 속한 마크 묶음 (카드 세트 표의 slot 열 = 마크 번호). 묶음 순서로 늘어놓고 칸마다 묶음 번호를 적는다
  const markGroupOf = useMemo(() => new Map(rowsOf(tables, 'CardSet').map((row) => [row.setId, Number(row.slot)])), [tables]);
  // 묶음 안에서는 마크가 많은 세트부터
  const setStates = useMemo(
    () => (shownValues ? cardSetStates(shownValues, tables).sort((left, right) => right.markCount - left.markCount) : []),
    [shownValues, tables],
  );
  const { setName, cardName } = useCardNames();
  // 고정 카드 고르기: 편성 칸과 같은 그림 창 (최초 등급 묶음 · 효과 힌트), 보유 카드만, 눌러서 켜고 끈다
  const ownedIds = useMemo(() => [...new Set(owned.map((card) => card.cardId))], [owned]);
  const fixedOptions = cardPickerOptions(tables, descriptions, translate, cardName, ownedIds);
  const shownFixed = fixedIds.filter((cardId) => ownedIds.includes(cardId));
  const toggleFixed = (cardId: string) => {
    const next = shownFixed.includes(cardId) ? shownFixed.filter((id) => id !== cardId) : shownFixed.length < MAX_FIXED ? [...shownFixed, cardId] : shownFixed;
    useCalcStore.getState().setValue(CARD_FIXED_KEY, next.join(','));
  };
  /** 마크 번호 (1 · 2 · 3번 묶음) 마다 세트별 개수: 어느 묶음의 세트인지 한눈에 보이게 한다 */
  const markGroups = useMemo(() => {
    const groups: { mark: number; parts: { setId: string; count: number }[] }[] = [];
    if (!shown) return groups;
    for (let mark = 0; mark < Math.max(0, ...shown.map((entry) => entry.picks.length)); mark += 1) {
      const counts = new Map<string, number>();
      for (const entry of shown) {
        const pick = entry.picks[mark];
        if (pick) counts.set(pick, (counts.get(pick) ?? 0) + 1);
      }
      groups.push({ mark: mark + 1, parts: [...counts].map(([setId, count]) => ({ setId, count })).sort((left, right) => right.count - left.count) });
    }
    return groups;
  }, [shown]);
  /** 추천 카드에서 안 열린 마크 묶음 (마지막 열린 묶음 뒤 ~ 마크 칸 최대): 카드 표에서 마크 칸이 그 번호 이상이 되는 첫 등급 (성 순) */
  const lockedGroups = useMemo(() => {
    if (!shown) return [];
    const cardRows = [...rowsOf(tables, 'Card')].sort((left, right) => Number(left.star) - Number(right.star));
    return CARD_MARK_NUMBERS.filter((mark) => mark > markGroups.length).map((mark) => ({
      mark,
      grade: cardRows.find((row) => Number(row.slotCnt) >= mark)?.grade ?? '',
      // 0 · 2 · 4 · 6장 열렸다면의 최선 세트 (마크 계산이 함께 낸 것, 없으면 등급만 보인다)
      options: result?.lockedGroups?.find((group) => group.mark === mark)?.options ?? [],
    }));
  }, [shown, markGroups.length, tables, result]);

  // 계산은 두 단계로 나눠 따로 한다 (카드 6장을 먼저 다 고른 뒤, 그 카드의 세트 마크). 버튼은 하나이고 카드가 끝나면 마크가 이어서 돈다
  const chaining = useRef(false);
  const start = () => {
    if (!inputs) return;
    chaining.current = true;
    runSlotRef.current = slot;
    // 지난 계산의 세트 마크 결과가 남아 이번 계산의 결과로 보이지 않게 비운다
    marksRun.reset();
    cardsRun.start({ values: calcValues, tables, inputs, ownedText, mode: 'cards', fixedCardIds: fixedIds });
  };
  const cardsStatus = cardsRun.state.status;
  useEffect(() => {
    if (!chaining.current || cardsStatus !== 'done' || cardsRun.state.status !== 'done' || !inputs) return;
    chaining.current = false;
    const cardIds = cardsRun.state.loadout.map((entry) => entry.card.cardId);
    marksRun.start({ values: calcValues, tables, inputs, ownedText, mode: 'marks', cardIds });
    // 카드 계산이 막 끝났을 때 한 번만 이어서 시작한다
  }, [cardsStatus]);
  // 멈추면 두 단계 모두 버린다: 화면은 이전에 저장한 결과로 돌아간다
  const stop = () => {
    chaining.current = false;
    cardsRun.reset();
    marksRun.reset();
  };

  const status = (state: CardRecommendationState, runningKey: string) => {
    if (state.status === 'running') {
      return (
        <Text mt="sm">
          {state.progress
            ? translate(runningKey, { evaluations: state.progress.evaluations.toLocaleString('ko-KR'), log: state.progress.efficiency.toFixed(LOG_DECIMALS) })
            : translate('optimizer.cards.starting')}
        </Text>
      );
    }
    if (state.status === 'failed') {
      return (
        <Alert color="red" mt="sm">
          {translate('optimizer.cards.failed', { message: state.message })}
        </Alert>
      );
    }
    return null;
  };

  return (
    <Paper withBorder p="md">
      <Title order={3} mb="sm">{translate('optimizer.cards.title')}</Title>
      <Text size="sm" c="dimmed" mb="sm">
        {translate('optimizer.cards.help')}
      </Text>
      {owned.length === 0 ? (
        <Alert color="yellow">{translate('optimizer.cards.noOwned')}</Alert>
      ) : (
        <Group align="flex-end">
          <Stack gap={2}>
            <Text size="sm" fw={500}>
              {translate('optimizer.cards.fixedLabel')}
            </Text>
            <IconPicker
              label={translate('optimizer.cards.fixedLabel')}
              title={translate('optimizer.cards.fixedTitle', { max: MAX_FIXED })}
              value=""
              emptyName=""
              options={fixedOptions}
              onPick={() => undefined}
              selectedValues={shownFixed}
              onToggle={toggleFixed}
              disabled={running || externalLocked}
              closeLabel={translate('calc.card.close')}
              buttonContent={
                <Group gap={4} wrap="nowrap">
                  {shownFixed.map((cardId) => (
                    <PickerImage key={cardId} path={CARD_ICON_PREFIX + cardId} size={FIXED_ICON_SIZE} />
                  ))}
                  <Text size="sm" c="dimmed">
                    {shownFixed.length > 0 ? translate('optimizer.cards.fixedCount', { count: shownFixed.length }) : translate('optimizer.cards.fixedNone')}
                  </Text>
                </Group>
              }
            />
            <Text size="xs" c="dimmed">
              {translate('optimizer.cards.fixedHelp', { max: MAX_FIXED })}
            </Text>
          </Stack>
          {/* 버튼 하나: 계산 중에는 멈추기로 바뀐다 */}
          <Button variant={running ? 'default' : 'filled'} onClick={running ? stop : start} disabled={!running && (!inputs || externalLocked)}>
            {translate(running ? 'optimizer.recommendStop' : 'optimizer.recommendStart')}
          </Button>
        </Group>
      )}
      {status(cardsRun.state, 'optimizer.cards.runningCards')}
      {status(marksRun.state, 'optimizer.cards.runningMarks')}
      {result && !running && (
        <Text fw={600} mt="sm">
          {translate('optimizer.recommendDone', {
            before: result.before.toFixed(LOG_DECIMALS),
            after: result.after.toFixed(LOG_DECIMALS),
            gain: gainText(result.after - result.before),
          })}
        </Text>
      )}
      {/* 계산 중에는 결과 위를 회색으로 덮고 스피너 (멈추기 버튼 · 진행 문구는 덮개 밖) */}
      <Box pos="relative" mt="md" mih={running ? LOADING_MIN_HEIGHT : undefined}>
      <LoadingOverlay visible={running} zIndex={CONSTS.masteryRuneBuff.PANEL.COLUMN_HEADER_Z_INDEX + 1} />
      {shownValues && (
        <Stack gap="xs">
          <Title order={4}>{translate('optimizer.cards.shownTitle')}</Title>
          <Text size="sm" c="dimmed">
            {translate('optimizer.cards.shownHelp')}
          </Text>
          <HorizontalScrollRow itemWidth={CARD_SLOT_WIDTH}>
            {CARD_SLOT_NUMBERS.map((slot) => (
              <Box key={slot} pos="relative">
                <CardSlotCard
                  slot={slot}
                  slotCardsText={joinFieldValues(shownValues, CARD_SLOT_FIELDS)}
                  gradeChoice={shownValues[cardGradeField(slot)] ?? ''}
                  marksText={joinFieldValues(shownValues, cardMarkFields(slot))}
                  tables={tables}
                  descriptions={descriptions}
                  setValue={IGNORE_CHANGE}
                  showMarks={false}
                />
                {/* 지금 고정 목록에 있는 카드 (결과에 저장하지 않음, 사용자 결정 2026-11-05) */}
                {shownFixed.includes(shownValues[CARD_SLOT_FIELDS[slot - 1]] ?? '') && (
                  <Badge size="sm" variant="light" pos="absolute" top={FIXED_BADGE_OFFSET} right={FIXED_BADGE_OFFSET}>
                    {translate('optimizer.cards.fixedBadge')}
                  </Badge>
                )}
              </Box>
            ))}
          </HorizontalScrollRow>
          {/* 세트 레벨 = 추천 카드 6장의 세트 점수 합: 모든 세트 효과 (말풍선 계산식) 에 같은 값이라 한 번만 */}
          {setStates[0] && setStates[0].tiers[0] && (
            <Text size="sm" c="dimmed">
              {translate('calc.card.setLevelFormula', {
                level: setStates[0].tiers[0].level.toLocaleString('ko-KR'),
                parts: setStates[0].levelParts.length ? setStates[0].levelParts.map((part) => part.toLocaleString('ko-KR')).join(' + ') : '-',
              })}
            </Text>
          )}
          {/* 마크 묶음 (1 · 2 · 3번) 마다 제목 (개수 요약) 과 그 묶음의 세트 칸 */}
          {markGroups.map((group) => (
            <Stack key={group.mark} gap="xs">
              <Text fw={700}>
                {translate('optimizer.cards.markGroupTitle', { mark: group.mark, parts: group.parts.map((part) => `${setName(part.setId)} ${part.count}`).join(' + ') })}
              </Text>
              <CardSetCards
                setStates={setStates.filter((set) => markGroupOf.get(set.setId) === group.mark)}
                descriptions={descriptions}
              />
            </Stack>
          ))}
          {lockedGroups.map((group) => (
            <Stack key={group.mark} gap={2}>
              <Text fw={700} c="dimmed">
                {translate('optimizer.cards.markGroupLocked', { mark: group.mark, grade: group.grade })}
              </Text>
              {/* 열렸다면: 0 · 2 · 4 · 6장 버튼으로 골라, 그 장수의 최선 세트를 세트 카드 (효과 줄) 로 본다 */}
              {group.options.length > 0 && shownValues && (
                <LockedGroupPicker
                  mark={group.mark}
                  options={group.options}
                  shownValues={shownValues}
                  tables={tables}
                  descriptions={descriptions}
                  markGroupOf={markGroupOf}
                  gainText={gainText}
                />
              )}
            </Stack>
          ))}
        </Stack>
      )}
      </Box>
    </Paper>
  );
}

interface LockedGroupPickerProps {
  mark: number;
  options: LockedMarkOption[];
  shownValues: CalcValues;
  tables: StatTables;
  descriptions: StatDescriptions;
  markGroupOf: Map<string, number>;
  gainText: (gainLog: number) => string;
}

/**
 * 안 열린 마크 묶음 하나: 0 · 2 · 4 · 6장 버튼 (사용자 지시 "버튼으로 눌러서 볼 수 있게"). 고른 장수의 최선 세트를
 * 열린 묶음과 같은 세트 카드 (CardSetCards) 로 보여 준다 — 추천 편성에 계산 전용 칸으로 그 세트 개수를 더한 상태의 세트 효과
 */
function LockedGroupPicker({ mark, options, shownValues, tables, descriptions, markGroupOf, gainText }: LockedGroupPickerProps) {
  const { t: translate } = useTranslation();
  const [selected, setSelected] = useState(String(options[0]?.count ?? 0));
  const option = options.find((candidate) => String(candidate.count) === selected) ?? options[0];
  const baseEfficiency = options[0]?.efficiency ?? 0;
  const setStates = useMemo(() => {
    if (!option || option.count === 0) return [];
    const extra = Object.fromEntries(option.sets.map((part) => [part.setId, part.count]));
    return cardSetStates({ ...shownValues, [CARD_EXTRA_MARKS_FIELD]: JSON.stringify(extra) }, tables)
      .filter((set) => markGroupOf.get(set.setId) === mark && set.markCount > 0)
      .sort((left, right) => right.markCount - left.markCount);
  }, [option, shownValues, tables, markGroupOf, mark]);
  return (
    <Stack gap="xs" pl="md">
      <ChoiceChips
        value={selected}
        options={options.map((candidate) => ({
          value: String(candidate.count),
          label: translate('optimizer.cards.lockedCount', { count: candidate.count }),
        }))}
        onChange={setSelected}
      />
      <Text size="sm" c="dimmed">
        {option && option.count > 0
          ? translate('optimizer.cards.lockedGain', { count: option.count, gain: gainText(option.efficiency - baseEfficiency) })
          : translate('optimizer.cards.lockedOptionNone')}
      </Text>
      {setStates.length > 0 && <CardSetCards setStates={setStates} descriptions={descriptions} />}
    </Stack>
  );
}
