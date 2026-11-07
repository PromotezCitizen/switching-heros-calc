import { describe, expect, it } from 'vitest';
import { loadoutFromValues, markCountOf, parseOwnedCards, valuesWithLoadout } from '@/cardOptimizer/loadout';
import { cardSlotField, cardGradeField, cardSetPickField, CARD_SET_BONUS_FIELD } from '@/calc/sources/heroWeaponCardPet/card';
import { loadTestTables } from '@/test/loadTestTables';
import { ownedCardsText } from '@/usb/saveImport/ownedCards';

const tables = loadTestTables();

describe('카드 편성', () => {
  const saved = { cardDic: { k: [36, 4], v: [{ trsc: 15, setIdDic: { k: [1, 2, 3], v: [{ setIdList: [3, 2] }, { setIdList: [8] }, { setIdList: [14, 11] }] } }, { trsc: 10 }] } };

  it('저장 데이터 → 글 → 보유 카드로 왕복한다', () => {
    const owned = parseOwnedCards(ownedCardsText(saved));
    expect(owned).toEqual([
      { cardId: '36', star: '15', setsByMark: [['3', '2'], ['8'], ['14', '11']] },
      { cardId: '4', star: '10', setsByMark: [] },
    ]);
    expect(markCountOf(tables, owned[0])).toBe(3);
  });

  it('편성 → 입력값 → 편성으로 돌아오고, 세트 보너스 레벨은 세트 점수 합이다', () => {
    const owned = parseOwnedCards(ownedCardsText(saved));
    const loadout = [{ card: owned[0], picks: ['2', '8', '11'] }];
    const values = valuesWithLoadout({ [cardSlotField(2)]: '99', [cardSetPickField(2, 1)]: '1' }, tables, loadout);
    expect(values[cardSlotField(1)]).toBe('36');
    expect(values[cardGradeField(1)]).toBe('R_15');
    expect(values[cardSlotField(2)]).toBeUndefined();
    expect(values[cardSetPickField(2, 1)]).toBeUndefined();
    expect(values[CARD_SET_BONUS_FIELD]).toBe('150');
    expect(loadoutFromValues(values, tables, owned)).toEqual(loadout);
  });
});
