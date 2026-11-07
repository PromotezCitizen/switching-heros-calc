import { describe, expect, it } from 'vitest';
import { tableRows } from '@/data/statTables';
import { cardGradeField, cardSlotField, stickerUnlocked } from '@/calc/sources/heroWeaponCardPet/card';
import { gradeStarValue } from '@/calc/sources/heroWeaponCardPet/shared';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();

describe('카드 스티커는 배지 칸이 있는 카드 (URP 이상) 를 장착했을 때만 열린다 (ContentsUnlock 75행 CardGrade 12)', () => {
  const rows = tableRows(tables.Card);
  const withSlot = rows.find((row) => Number(row.stickerSlotCnt) > 0)!;
  const withoutSlot = rows.find((row) => !(Number(row.stickerSlotCnt) > 0))!;

  it('장착 카드가 없거나 배지 칸 없는 카드뿐이면 닫힘', () => {
    expect(stickerUnlocked({}, tables)).toBe(false);
    expect(stickerUnlocked({ [cardSlotField(1)]: withoutSlot.cardId, [cardGradeField(1)]: gradeStarValue(withoutSlot) }, tables)).toBe(false);
  });

  it('배지 칸이 있는 카드를 하나라도 장착하면 열림', () => {
    expect(stickerUnlocked({ [cardSlotField(2)]: withSlot.cardId, [cardGradeField(2)]: gradeStarValue(withSlot) }, tables)).toBe(true);
  });
});
