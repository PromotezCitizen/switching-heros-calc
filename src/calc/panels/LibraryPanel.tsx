import { useTranslation } from 'react-i18next';
import { Card, Group, Image, NumberInput, Stack, Text } from '@mantine/core';
import HorizontalScrollRow from '@/components/HorizontalScrollRow';
import SectionTitle from '@/components/SectionTitle';
import { CONSTS } from '@/CONSTS';
import {
  bookEffectSum,
  bookLevelField,
  bookStat,
  inheritStatField,
  inheritValueField,
  libraryArchiveLevel,
  openInheritSlots,
} from '@/calc/sources/heroWeaponCardPet/library';
import { numberValue } from '@/calc/sources/heroWeaponCardPet/shared';
import { lineText } from '@/calc/statText';
import type { TabPanelProps } from '@/calc/types';
import { iconUrl } from '@/calc/panels/heroWeaponCardPet/IconPicker';
import StatValueRows, { allStatChoices } from '@/calc/panels/heroWeaponCardPet/StatValueRows';

const { JOBS, MIN_NUMBER } = CONSTS.heroWeaponCardPet;
const { INHERIT_ROWS, BOOK_ICONS } = CONSTS.heroWeaponCardPet.library;
const { CARD_ICON_SIZE, BOOK_CARD_MIN_WIDTH, LINK_LEVEL_INPUT_WIDTH } = CONSTS.heroWeaponCardPet.ui;
const INHERIT_ROW_NUMBERS = Array.from({ length: INHERIT_ROWS }, (_, index) => index + 1);

/** 히어로의 기록: 기록 보관소 (책 4권 레벨, 보관소 레벨은 자동) + 전승된 능력 */
export default function LibraryPanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const archiveLevel = libraryArchiveLevel(values);
  const openSlots = openInheritSlots(archiveLevel);
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <SectionTitle>{translate('calc.library.archiveTitle')}</SectionTitle>
        <Text size="sm" c="dimmed">
          {translate('calc.library.archiveLevel', { level: archiveLevel })}
        </Text>
      </Group>
      {/* 책 4권 한 줄: 아이콘 · 이름 · 레벨 칸 · 효과. 칸 폭이 모자라면 가로 스크롤 */}
      <HorizontalScrollRow itemWidth={BOOK_CARD_MIN_WIDTH}>
        {JOBS.map((job) => {
          const book = translate(`calc.library.books.${job}`);
          const level = numberValue(values, bookLevelField(job));
          const sum = bookEffectSum(tables, job, level);
          return (
            <Card key={job} withBorder padding="xs">
              <Stack gap={4} align="center">
                <Image src={iconUrl(BOOK_ICONS[job])} w={CARD_ICON_SIZE} h={CARD_ICON_SIZE} fit="contain" alt="" />
                <Text size="sm" fw={600}>
                  {book}
                </Text>
                <NumberInput
                  size="xs"
                  w={LINK_LEVEL_INPUT_WIDTH}
                  hideControls
                  min={MIN_NUMBER}
                  allowNegative={false}
                  allowDecimal={false}
                  placeholder={translate('calc.library.levelPlaceholder')}
                  aria-label={translate('calc.library.bookLevelLabel', { book })}
                  value={values[bookLevelField(job)] ?? ''}
                  onChange={(next) => setValue(bookLevelField(job), String(next))}
                />
                <Text size="xs" c="dimmed" ta="center">
                  {sum ? lineText(descriptions, { source: book, stat: bookStat(job), value: sum }) : '-'}
                </Text>
              </Stack>
            </Card>
          );
        })}
      </HorizontalScrollRow>

      <SectionTitle mt="xs">{translate('calc.library.inheritTitle')}</SectionTitle>
      {openSlots ? (
        <StatValueRows
          rowNumbers={INHERIT_ROW_NUMBERS.filter((index) => index <= openSlots)}
          statField={inheritStatField}
          valueField={inheritValueField}
          values={values}
          setValue={setValue}
          choices={allStatChoices(descriptions)}
          noneLabel={translate('calc.library.none')}
          statLabel={(index) => translate('calc.library.statLabel', { index })}
          valueLabel={(index) => translate('calc.library.valueLabel', { index })}
          valuePlaceholder={translate('calc.library.valuePlaceholder')}
        />
      ) : (
        <Text size="xs" c="dimmed">
          {translate('calc.library.inheritLocked')}
        </Text>
      )}
    </Stack>
  );
}
