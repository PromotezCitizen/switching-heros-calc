import { describe, expect, it } from 'vitest';
import { formatOwnedCards, parseOwnedCards } from '@/cardOptimizer/loadout';
import { ownedCardsText } from '@/usb/saveImport/ownedCards';

describe('보유 카드 글 (account.cardOwned)', () => {
  it('불러오기 글을 읽고 다시 쓰면 같은 글 (마크 칸 세트 그대로)', () => {
    const text = ownedCardsText({
      cardDic: {
        k: [3, 7],
        v: [
          { trsc: 12, setIdDic: { k: [1, 2], v: [{ setIdList: [3, 9] }, { setIdList: [13] }] } },
          { trsc: 4 },
        ],
      },
    } as unknown as Parameters<typeof ownedCardsText>[0]);
    expect(formatOwnedCards(parseOwnedCards(text))).toBe(text);
  });

  it('카드 하나를 빼거나 성을 바꿔 다시 쓸 수 있다', () => {
    const cards = parseOwnedCards('3:12:3/9,13;7:4:');
    expect(formatOwnedCards(cards.filter((card) => card.cardId !== '7'))).toBe('3:12:3/9,13');
    expect(formatOwnedCards(cards.map((card) => (card.cardId === '7' ? { ...card, star: '5' } : card)))).toBe('3:12:3/9,13;7:5:');
  });
});
