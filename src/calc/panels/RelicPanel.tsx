import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Group, Image, Stack, Table, Text, TextInput } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import ChoiceChips from '@/components/ChoiceChips';
import SectionTitle from '@/components/SectionTitle';
import { CONSTS } from '@/CONSTS';
import {
  RELIC_MAX_GRADE_FIELD,
  ATTRIBUTE_DUNGEON_LINKS,
  RELIC_TAB_LINK_FIELDS,
  lowerGradeRelicFill,
  relicBlessingFromStates,
  relicGradeAllowed,
  relicGrades,
  relicLevelFieldId,
  relicLinkFieldId,
  relicStates,
  usedRelicLinkFields,
  type RelicState,
} from '@/calc/sources/trainingRelic/relic';
import { amountText, lineText } from '@/calc/statText';
import { CALC_KEY_PREFIX } from '@/calc/storeKeys';
import { useCalcStore } from '@/store/useCalcStore';
import type { TabPanelProps } from '@/calc/types';

const { UNOWNED_OPACITY, OWNED_OPACITY, ICON_SIZE } = CONSTS.trainingRelic.relic;
/** 폰 불러오기가 채우는 모험 던전 (펫 구출) 이번 주 진행도 (보여 주기만) */
const PET_RESCUE_BEST_FIELD = 'petRescueBest';
const MIN_LEVEL = CONSTS.emptyInput.LEVEL;
const { CARD_MIN_WIDTH } = CONSTS.display;

function relicIconPath(iconIndex: string): string {
  return `${import.meta.env.BASE_URL}icons/Atlas_relic/item_relic_${iconIndex}.png`;
}

/** 유물: 최대 등급, 유물의 축복, 등급별 유물 레벨, 연동 수치 칸 */
export default function RelicPanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  /* 보고 있는 등급 (화면 전용, 저장 안 함) */
  const [shownGrade, setShownGrade] = useState<string | null>(null);
  const setStoreValues = useCalcStore((state) => state.setValues);
  const grades = relicGrades(tables);
  const maxGrade = values[RELIC_MAX_GRADE_FIELD] ?? '';
  const visibleGrade = shownGrade && relicGradeAllowed(grades, shownGrade, maxGrade) ? shownGrade : null;
  const states = relicStates(values, tables);
  /* 뽑은 유물 = 레벨 1 이상 (최대 등급 이하 유물만 센다) */
  const ownedCount = states.filter((state) => state.level).length;
  const usedLinks = usedRelicLinkFields(states);
  const blessing = relicBlessingFromStates(states, tables);

  /* 보유 유물을 위에, 미보유를 아래에 (등급 안에서는 표 순서) */
  const shownStates = visibleGrade ? states.filter((state) => state.row.grade === visibleGrade) : [];
  const sortedStates = [...shownStates.filter((state) => state.level), ...shownStates.filter((state) => !state.level)];

  /** 최대 등급과 낮은 등급 유물 채우기를 저장소에 한 번에 넣는다 (유물마다 따로 넣으면 수백 번 저장) */
  function changeMaxGrade(grade: string) {
    const changes = { [RELIC_MAX_GRADE_FIELD]: grade, ...lowerGradeRelicFill(values, tables, grade) };
    setStoreValues(
      Object.fromEntries(Object.entries(changes).map(([fieldId, text]) => [CALC_KEY_PREFIX + fieldId, text])),
    );
  }

  /* 유물 효과 = 기본 값 + 강화 값 × 레벨. 미보유 (레벨 0) 는 강화 부분만 0 이라 기본 값이 문구에 나온다 (계산에는 효과 없음: state.value 는 0) */
  function effectText({ row, level, value }: RelicState): string {
    return lineText(descriptions, { source: '', stat: row.statType, value: level ? value : Number(row.baseVal) });
  }

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <SectionTitle>{translate('calc.relic.maxGradeTitle')}</SectionTitle>
        <ChoiceChips
          label={translate('calc.relic.maxGradeLabel')}
          value={maxGrade}
          onChange={changeMaxGrade}
          options={[
            { value: '', label: translate('calc.relic.none') },
            ...grades.map((grade) => ({ value: grade, label: grade })),
          ]}
        />
        <Text size="sm" c="dimmed">{translate('calc.relic.maxGradeHelp')}</Text>
        <Text fw={600}>{translate('calc.relic.countLine', { owned: ownedCount, max: states.length })}</Text>
      </Stack>

      <Stack gap="xs">
        <SectionTitle>{translate('calc.relic.blessingTitle')}</SectionTitle>
        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>{translate('calc.relic.blessingLabel')}</Table.Td>
              <Table.Td>{amountText(blessing)}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Stack>

      <Stack gap="xs">
        <SectionTitle>{translate('calc.relic.levelsTitle')}</SectionTitle>
        <Group gap="xs" role="tablist" aria-label={translate('calc.relic.gradesLabel')}>
          {[...grades].reverse().map((grade) =>
            relicGradeAllowed(grades, grade, maxGrade) ? (
              <Button
                key={grade}
                size="compact-sm"
                role="tab"
                aria-selected={grade === visibleGrade}
                variant={grade === visibleGrade ? 'filled' : 'default'}
                // 열린 등급을 한 번 더 누르면 닫는다
                onClick={() => setShownGrade(grade === visibleGrade ? null : grade)}
              >
                {grade}
              </Button>
            ) : null,
          )}
        </Group>
        {visibleGrade && (
          <Text size="sm">
            {translate('calc.relic.gradeCount', {
              grade: visibleGrade,
              owned: shownStates.filter((state) => state.level).length,
              max: shownStates.length,
            })}
          </Text>
        )}
        {visibleGrade ? (
          <AutoGrid minItemWidth={CARD_MIN_WIDTH.small}>
            {sortedStates.map((state) => {
              const { row } = state;
              const name = translate(`calc.relic.names.${row.relicId}`);
              const fieldId = relicLevelFieldId(row.relicId);
              return (
                <Card
                  key={row.relicId}
                  withBorder
                  padding="xs"
                  style={{ opacity: state.level ? OWNED_OPACITY : UNOWNED_OPACITY }}
                >
                  <Stack gap="xs" align="center">
                    <Image
                      src={relicIconPath(row.iconIdx)}
                      alt=""
                      w={ICON_SIZE}
                      h={ICON_SIZE}
                      onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                    <Text size="sm" fw={600} ta="center">{name}</Text>
                    <Group gap="xs" wrap="nowrap">
                      <TextInput
                        type="number"
                        inputMode="numeric"
                        min={MIN_LEVEL}
                        max={row.maxLv}
                        aria-label={translate('calc.relic.levelAria', { name })}
                        value={values[fieldId] ?? ''}
                        onChange={(event) => setValue(fieldId, event.currentTarget.value)}
                      />
                      <Text size="sm" c="dimmed">/ {row.maxLv}</Text>
                    </Group>
                    <Text size="xs" ta="center">{effectText(state)}</Text>
                  </Stack>
                </Card>
              );
            })}
          </AutoGrid>
        ) : (
          <Text size="sm" c="dimmed">{translate('calc.relic.pickGrade')}</Text>
        )}
        <Text size="sm" c="dimmed">{translate('calc.relic.levelsHelp')}</Text>
      </Stack>

      <Stack gap="xs">
        <SectionTitle>{translate('calc.relic.linksTitle')}</SectionTitle>
        {/* 라벨이 길어 (예: "SSR 등급 이상 몬스터 카드 수") 한 줄에 하나씩 위아래로 */}
        <Stack gap="xs">
          {RELIC_TAB_LINK_FIELDS.filter((field) => usedLinks.has(field) || ATTRIBUTE_DUNGEON_LINKS.includes(field)).map((field) => {
            const fieldId = relicLinkFieldId(field);
            return (
              <TextInput
                key={field}
                type="number"
                inputMode="numeric"
                min={MIN_LEVEL}
                label={translate(`calc.relic.links.${field}`)}
                value={values[fieldId] ?? ''}
                onChange={(event) => setValue(fieldId, event.currentTarget.value)}
              />
            );
          })}
        </Stack>
        {/* 모험 던전: 계산에는 안 들어가고 (그 던전 안에서만 쓰이는 보너스) 이번 주 진행도만 보여 준다 (폰 불러오기 값) */}
        {values[PET_RESCUE_BEST_FIELD] && (
          <Text size="sm">
            {translate('calc.relic.petRescue', {
              best: (values[PET_RESCUE_BEST_FIELD] ?? '')
                .split(',')
                .map((level, index) => `${translate(`calc.relic.attributes.${index + 1}`)} ${level || '-'}`)
                .join(' · '),
            })}
          </Text>
        )}
        <Text size="sm" c="dimmed">{translate('calc.relic.linksHelp')}</Text>
      </Stack>
    </Stack>
  );
}
