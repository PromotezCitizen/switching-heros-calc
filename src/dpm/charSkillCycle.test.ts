import { describe, expect, it } from 'vitest';
import awakenTable from '@public/data/tables/CharacterAwaken.json';
import charSkillTable from '@public/data/tables/CharSkill.json';
import { charSkillRow } from '@/dpm/charSkillCycle';

describe('전용 스킬: 각성 표 charSkillId → 전용 스킬 행', () => {
  it('에이카 (205) 각성 10 → 12217, N 10 / 각성 5 → 12216, N 15', () => {
    expect(charSkillRow(awakenTable, charSkillTable, '205', 10)?.skillId).toBe('12217');
    expect(charSkillRow(awakenTable, charSkillTable, '205', 10)?.buffPer).toBe('10');
    expect(charSkillRow(awakenTable, charSkillTable, '205', 5)?.skillId).toBe('12216');
  });
  it('각성 표에 전용 스킬이 없는 레벨 (205 각성 1~4) → 없음', () => {
    expect(charSkillRow(awakenTable, charSkillTable, '205', 3)).toBeUndefined();
  });
});
