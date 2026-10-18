import { describe, expect, it } from 'vitest';
import awakenTable from '../../public/data/tables/CharacterAwaken.json';
import charSkillTable from '../../public/data/tables/CharSkill.json';
import { charSkillGameSeconds, charSkillRow } from '@/dpm/charSkillCycle';

describe('전용 스킬: 각성 표 charSkillId → 전용 스킬 행, 일반 공격 buffPer 번마다', () => {
  it('에이카 (205) 각성 10 → 12217, N 10 / 각성 5 → 12216, N 15', () => {
    expect(charSkillRow(awakenTable, charSkillTable, '205', 10)?.skillId).toBe('12217');
    expect(charSkillRow(awakenTable, charSkillTable, '205', 10)?.buffPer).toBe('10');
    expect(charSkillRow(awakenTable, charSkillTable, '205', 5)?.skillId).toBe('12216');
  });
  it('각성 표에 전용 스킬이 없는 레벨 (205 각성 1~4) → 없음', () => {
    expect(charSkillRow(awakenTable, charSkillTable, '205', 3)).toBeUndefined();
  });
  it('10-18 계정: 일반 공격 0.14게임초 × 10 = 1.4게임초 → 실제 1.077초 (실측 1.08)', () => {
    const gameSeconds = charSkillGameSeconds('1', '10', 0.14);
    expect(gameSeconds).toBeCloseTo(1.4, 10);
    expect(gameSeconds! / 1.3).toBeCloseTo(1.08, 2);
  });
  it('발동 조건이 일반 공격 횟수 (종류 1) 가 아니면 아직 계산 안 함 → null', () => {
    expect(charSkillGameSeconds('2', '10', 0.14)).toBeNull();
  });
});
