import { useTranslation } from 'react-i18next';
import { Accordion, Box, Group, Image, Table, Text } from '@mantine/core';
import LazySelect from '@/components/LazySelect';
import { CONSTS } from '@/CONSTS';
import type { StatTables } from '@/data/statTables';
import { cardDisplayStar, cardGrades, cardIds, cardRowsOf } from '@/calc/sources/heroWeaponCardPet/card';
import { iconUrl } from '@/calc/panels/heroWeaponCardPet/IconPicker';
import { useCardNames } from '@/calc/panels/heroWeaponCardPet/cardPanelParts';
import { formatOwnedCards, parseOwnedCards, type OwnedCard } from '@/cardOptimizer/loadout';
import { useCalcStore } from '@/store/useCalcStore';
import { OWNED_CARDS_KEY } from '@/usb/saveImport/ownedCards';

const { CARD_ICON_PREFIX } = CONSTS.heroWeaponCardPet.card;
const { UNUSED_OPACITY } = CONSTS.heroWeaponCardPet.ui;
const { ICON_SIZE, SELECT_WIDTH, TABLE_MAX_HEIGHT } = CONSTS.hero.roster;
const NOT_OWNED = '';

/**
 * 보유 카드 표: 카드마다 등급 · 성 ("없음" = 미보유). 저장 칸은 공통 값 account.cardOwned (폰 불러오기와 같은 글 형식).
 * 편성 칸에서 카드를 고를 때의 기본 등급 · 성과 카드 추천 후보로 쓰인다. 마크 칸 세트는 화면에 보이지 않고 불러온 값을 그대로 둔다
 */
export default function OwnedCardsTable({ tables }: { tables: StatTables }) {
  const { t: translate } = useTranslation();
  const { cardName } = useCardNames();
  const ownedText = useCalcStore((state) => state.values[OWNED_CARDS_KEY] ?? '');
  const setStoreValue = useCalcStore((state) => state.setValue);
  const owned = parseOwnedCards(ownedText);
  const ownedById = new Map(owned.map((card) => [card.cardId, card]));

  /** 카드 하나의 성을 바꾼다 (빈 값 = 미보유로 목록에서 뺌). 마크 세트는 있던 그대로 */
  const changeStar = (cardId: string, star: string) => {
    const others = owned.filter((card) => card.cardId !== cardId);
    const previous = ownedById.get(cardId);
    const next: OwnedCard[] = star ? [...others, { cardId, star, setsByMark: previous?.setsByMark ?? [] }] : others;
    setStoreValue(OWNED_CARDS_KEY, formatOwnedCards(next));
  };

  return (
    <Accordion variant="contained">
      <Accordion.Item value="owned">
        <Accordion.Control>{translate('calc.card.ownedTitle', { count: owned.length })}</Accordion.Control>
        <Accordion.Panel>
          <Text size="xs" c="dimmed" mb="xs">
            {translate('calc.card.ownedHelp')}
          </Text>
          <Box style={{ overflow: 'auto', maxHeight: TABLE_MAX_HEIGHT }}>
            <Table verticalSpacing={4} horizontalSpacing="xs" stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{translate('calc.card.ownedCard')}</Table.Th>
                  <Table.Th>{translate('calc.card.gradePlaceholder')}</Table.Th>
                  <Table.Th>{translate('calc.card.ownedStar')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {cardIds(tables).map((cardId) => {
                  const card = ownedById.get(cardId);
                  const rows = cardRowsOf(tables, cardId);
                  const row = card ? rows.find((candidate) => candidate.star === card.star) : undefined;
                  const grade = row?.grade ?? NOT_OWNED;
                  const name = cardName(cardId);
                  return (
                    <Table.Tr key={cardId} style={{ opacity: card ? undefined : UNUSED_OPACITY }}>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          <Image src={iconUrl(CARD_ICON_PREFIX + cardId)} w={ICON_SIZE} h={ICON_SIZE} fit="contain" alt="" />
                          <Text size="sm">{name}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {/* 등급을 고르면 그 등급 첫 성, "없음" 이면 미보유 */}
                        <LazySelect
                          size="xs"
                          style={{ width: SELECT_WIDTH }}
                          aria-label={translate('calc.card.ownedGradeLabel', { name })}
                          data={[{ value: NOT_OWNED, label: translate('calc.card.none') }, ...cardGrades(tables, cardId).map((value) => ({ value, label: value }))]}
                          value={grade}
                          allowDeselect={false}
                          onChange={(next) => changeStar(cardId, next ? (rows.find((candidate) => candidate.grade === next)?.star ?? NOT_OWNED) : NOT_OWNED)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <LazySelect
                          size="xs"
                          style={{ width: SELECT_WIDTH }}
                          aria-label={translate('calc.card.ownedStarLabel', { name })}
                          disabled={!grade}
                          data={rows
                            .filter((candidate) => candidate.grade === grade)
                            .map((candidate) => ({ value: candidate.star, label: translate('calc.card.starText', { star: cardDisplayStar(tables, candidate) }) }))}
                          value={row ? row.star : null}
                          allowDeselect={false}
                          onChange={(next) => next && changeStar(cardId, next)}
                        />
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Box>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
