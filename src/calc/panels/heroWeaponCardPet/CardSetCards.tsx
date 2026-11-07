import { Card, Image, Stack, Text, Tooltip } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import { CONSTS } from '@/CONSTS';
import type { CardSetState } from '@/calc/sources/heroWeaponCardPet/card';
import { lineText, type StatDescriptions } from '@/calc/statText';
import { iconUrl } from '@/calc/panels/heroWeaponCardPet/IconPicker';
import { cardSetIcon, useCardNames } from '@/calc/panels/heroWeaponCardPet/cardPanelParts';

const { CARD_ICON_SIZE, UNUSED_OPACITY } = CONSTS.heroWeaponCardPet.ui;
/** 계산식 숫자: 천 단위 쉼표, 소수는 있는 만큼 (최대 2자리) */
const plainNumber = (value: number): string => value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const { CARD_MIN_WIDTH } = CONSTS.display;
/** 세트 단계 문구 끝의 " 증가" 는 뺀다 (기존 화면) */
const TRAILING_INCREASE = / 증가$/;

export interface CardSetCardsProps {
  /** cardSetStates 결과 */
  setStates: CardSetState[];
  descriptions: StatDescriptions;
}

/** 카드 세트 칸들: 마크가 하나라도 있는 세트마다 그림 · 이름 · 마크 수 · 2/4/6세트 효과 (켜진 단계는 진하게) */
export default function CardSetCards({ setStates, descriptions }: CardSetCardsProps) {
  const { translate, setName } = useCardNames();
  return (
    <AutoGrid minItemWidth={CARD_MIN_WIDTH.medium} gap="var(--mantine-spacing-sm)">
      {setStates
        .filter((set) => set.markCount > 0)
        .map((set) => (
          <Card key={set.setId} withBorder padding="sm">
            <Stack gap={4} align="center">
              <Image src={iconUrl(cardSetIcon(set.setId))} w={CARD_ICON_SIZE} h={CARD_ICON_SIZE} fit="contain" alt="" />
              <Text fw={600}>{setName(set.setId)}</Text>
              <Text size="sm">{translate('calc.card.markCount', { count: set.markCount })}</Text>
              {set.tiers.map((tier) => (
                // 마우스를 올리거나 누르면 (터치 포함) 계산식: 기본 + 레벨당 × 세트 레벨, 세트 레벨 = 카드 세트 점수 합
                <Tooltip
                  key={tier.setCount}
                  multiline
                  events={{ hover: true, focus: true, touch: true }}
                  label={
                    // 세트 레벨이 어떻게 나왔는지 (카드 세트 점수 합) 는 화면에 한 번만 따로 보여 준다 (사용자 결정 2026-11-02)
                    <Text size="xs">
                      {translate('calc.card.setFormula', {
                        base: plainNumber(tier.base),
                        perLevel: plainNumber(tier.perLevel),
                        level: plainNumber(tier.level),
                        value: plainNumber(tier.value),
                      })}
                    </Text>
                  }
                >
                  <Text size="sm" style={{ opacity: tier.reached ? undefined : UNUSED_OPACITY, cursor: 'help' }} tabIndex={0}>
                    {translate('calc.card.setTier', {
                      count: tier.setCount,
                      effect: lineText(descriptions, { source: '', stat: tier.stat, value: tier.value }).replace(TRAILING_INCREASE, ''),
                    })}
                  </Text>
                </Tooltip>
              ))}
            </Stack>
          </Card>
        ))}
    </AutoGrid>
  );
}
