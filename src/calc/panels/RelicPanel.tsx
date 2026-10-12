import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Group, Image, Stack, Table, Text, TextInput } from '@mantine/core';
import AutoGrid from '../../components/AutoGrid';
import ChoiceChips from '../../components/ChoiceChips';
import HorizontalScrollRow from '../../components/HorizontalScrollRow';
import SectionTitle from '../../components/SectionTitle';
import { CONSTS } from '../../CONSTS';
import {
  RELIC_MAX_GRADE_FIELD,
  RELIC_TAB_LINK_FIELDS,
  lowerGradeRelicFill,
  relicBlessingFromStates,
  relicGradeAllowed,
  relicGrades,
  relicLevelFieldId,
  relicLinkFieldId,
  relicStates,
  relicValue,
  usedRelicLinkFields,
  type RelicState,
} from '../sources/trainingRelic/relic';
import { amountText, lineText } from '../statText';
import { CALC_KEY_PREFIX } from '../storeKeys';
import { useCalcStore } from '../../store/useCalcStore';
import type { TabPanelProps } from '../types';

const { UNOWNED_OPACITY, OWNED_OPACITY, ICON_SIZE, PREVIEW_LEVEL } = CONSTS.trainingRelic.relic;
const MIN_LEVEL = CONSTS.emptyInput.LEVEL;
const { CARD_MIN_WIDTH, LIST_INPUT_WIDTH } = CONSTS.display;

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

  function effectText({ row, level, value }: RelicState): string {
    if (!level) {
      const firstLevelEffect = lineText(descriptions, {
        source: '',
        stat: row.statType,
        value: relicValue(row, PREVIEW_LEVEL),
      });
      return translate('calc.relic.notOwned', { effect: firstLevelEffect });
    }
    return lineText(descriptions, { source: '', stat: row.statType, value });
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
                onClick={() => setShownGrade(grade)}
              >
                {grade}
              </Button>
            ) : null,
          )}
        </Group>
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
        <HorizontalScrollRow itemWidth={LIST_INPUT_WIDTH}>
          {RELIC_TAB_LINK_FIELDS.filter((field) => usedLinks.has(field)).map((field) => {
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
        </HorizontalScrollRow>
        {!usedLinks.size && <Text size="sm" c="dimmed">{translate('calc.relic.noLinks')}</Text>}
        <Text size="sm" c="dimmed">{translate('calc.relic.linksHelp')}</Text>
      </Stack>
    </Stack>
  );
}
