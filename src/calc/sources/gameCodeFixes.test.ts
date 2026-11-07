import { describe, expect, it } from 'vitest';
import { CONSTS } from '@/CONSTS';
import { tableRows } from '@/data/statTables';
import { cardGradeField, cardLines, cardSlotField, stickerCountField, stickerLevelField } from '@/calc/sources/heroWeaponCardPet/card';
import { ARCHIVE_LEVEL_FIELD, bookLevelField, inheritStatField, inheritValueField, libraryArchiveLevel, libraryLines } from '@/calc/sources/heroWeaponCardPet/library';
import { gradeStarValue } from '@/calc/sources/heroWeaponCardPet/shared';
import { loadTestTables } from '@/test/loadTestTables';
import { diceValue } from '@/usb/saveImport/equipValues';

/** 예전 HTML 규칙을 게임 코드로 확인해 고친 것 (claude-docs/react-port/html-verify-A · B-2026-11-07.md) */
const tables = loadTestTables();
const label = (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`;

describe('기록 보관소 전승된 능력: 같은 스탯 칸은 값을 더해 한 줄 (게임 m6880 부분 C)', () => {
  // 책 4권 Lv40 → 보관소 Lv4 → 칸 2개 열림
  const books = Object.fromEntries((['Swordsman', 'Fighter', 'Archer', 'Mage'] as const).map((job) => [bookLevelField(job), '40']));
  it('200% + 200% → 400% 한 줄 (×5), 다른 스탯은 따로', () => {
    const same = libraryLines(
      { ...books, [inheritStatField(1)]: '_per_CharSkillDamage', [inheritValueField(1)]: '200%', [inheritStatField(2)]: '_per_CharSkillDamage', [inheritValueField(2)]: '200%' },
      tables,
      label,
    ).filter((line) => line.stat === '_per_CharSkillDamage');
    expect(same).toHaveLength(1);
    expect(same[0].log).toBeCloseTo(Math.log10(400), 10);
    const different = libraryLines(
      { ...books, [inheritStatField(1)]: '_per_CharSkillDamage', [inheritValueField(1)]: '200%', [inheritStatField(2)]: '_per_hp', [inheritValueField(2)]: '200%' },
      tables,
      label,
    ).filter((line) => line.source.includes('inherit'));
    expect(different).toHaveLength(2);
  });
});

describe('기록 보관소 레벨: 불러온 값이 있으면 그 값, 없으면 책 레벨 식 (게임은 저장 mainLv)', () => {
  const books = Object.fromEntries((["Swordsman", "Fighter", "Archer", "Mage"] as const).map((job) => [bookLevelField(job), "44"]));
  it('책 44 → 식으로 4, 불러온 3 이 있으면 3, 빈칸이면 식', () => {
    expect(libraryArchiveLevel(books)).toBe(4);
    expect(libraryArchiveLevel({ ...books, [ARCHIVE_LEVEL_FIELD]: "3" })).toBe(3);
    expect(libraryArchiveLevel({ ...books, [ARCHIVE_LEVEL_FIELD]: "" })).toBe(4);
  });
});

describe('카드 스티커 세트: 레벨은 모든 배지 점수의 합 하나 (게임 m15802)', () => {
  it('세트 값 = val1 + valUp1 × (모든 배지 점수 합)', () => {
    const card = tableRows(tables.Card).find((row) => Number(row.stickerSlotCnt) > 0)!;
    const sets = tableRows(tables.CardStickerSet);
    const [first, second] = [...new Set(sets.map((row) => row.stickerId))];
    const firstRow = sets.find((row) => row.stickerId === first && Number(row.setCnt) === Math.min(...sets.filter((r) => r.stickerId === first).map((r) => Number(r.setCnt))))!;
    const values = {
      [cardSlotField(1)]: card.cardId,
      [cardGradeField(1)]: gradeStarValue(card),
      [stickerCountField(first)]: firstRow.setCnt,
      [stickerLevelField(first)]: '3',
      [stickerLevelField(second)]: '4',
    };
    const line = cardLines(values, tables, label).find((candidate) => candidate.stat === firstRow.statName && candidate.source.includes('sources.set'));
    expect(line?.value).toBeCloseTo(Number(firstRow.val1) + Number(firstRow.valUp1) * 7, 10);
  });
});

describe('길드 스킬 열림 레벨 (서버 Option guild_lv_N add_guild_skill_order)', () => {
  it('스테이지 골드 스킬 (order 2 · 4 · 6 · 8 · 10) = 길드 Lv 23 · 32 · 44 · 56 · 60', () => {
    expect(CONSTS.guild.SKILLS.map((skill) => skill.unlock)).toEqual([23, 32, 44, 56, 60]);
  });
});

describe('불러오기 옵션 값은 표 최대값 (statMax) 에서 자른다 (게임 m6053)', () => {
  it('단계가 커서 최소 + 단계 × 단위 가 최대를 넘으면 최대', () => {
    const rows = tableRows(tables.DiceOption);
    const grades = CONSTS.usb.DICE_GRADES as readonly string[];
    const row = rows.find((candidate) => grades.includes(candidate.grade) && Number(candidate.statUnit) > 0 && Number(candidate.statMax) > Number(candidate.statMin))!;
    const grade = grades.indexOf(row.grade) + 1;
    const over = Math.ceil((Number(row.statMax) - Number(row.statMin)) / Number(row.statUnit)) + 5;
    expect(diceValue(rows, row.diceId, { diceId: Number(row.diceId), statType: row.statType, grade, unitLv: over })).toBe(Number(row.statMax));
  });
});
