import { describe, expect, it } from 'vitest';
import { changeSkillHits } from '@/dpm/changeSkillHits';
import { tableRows } from '@/data/statTables';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();
const rowOf = (skillId: string) => tableRows(tables.ChangeSkill).find((row) => row.skillId === skillId);

describe('교체 스킬 적중 수 (changeSkillHits.ts, 조사 문서 skill-gaps · hero-skills-*-2026-11-05.md)', () => {
  it('ChangeSkill 표가 있다 (서버 표의 ChangeSkill 101행)', () => {
    expect(tableRows(tables.ChangeSkill).length).toBe(101);
  });

  it('티르 1021: 칼 int(10 / 2) = 5자루지만 판정 4번 × 맞는 적', () => {
    expect(changeSkillHits(rowOf('1021'), 1).hits).toBe(4);
    expect(changeSkillHits(rowOf('1021'), 3).hits).toBe(12);
  });

  it('에이카 1218: 화살 18개 × 맞는 적, 각성 11217: value1 / value3 = 15번', () => {
    expect(changeSkillHits(rowOf('1218'), 1).hits).toBe(18);
    expect(changeSkillHits(rowOf('11217'), 1).hits).toBe(15);
  });

  it('파이크 1112: 주먹 15발 중 마지막 1발만 × 3 → 14 + 3 = 17', () => {
    expect(changeSkillHits(rowOf('1112'), 1).hits).toBe(17);
  });

  it('썬더 1221: int(8 / 0.5) = 16틱, 추정 표시 없음 / 카이토 1009 는 상자 수를 추정해 표시가 남는다', () => {
    const thunder = changeSkillHits(rowOf('1221'), 1);
    expect(thunder.hits).toBe(16);
    expect(thunder.estimates).toBeUndefined();
    expect(changeSkillHits(rowOf('1009'), 1).estimates).toContain('estimate:changeSkillHits');
  });

  it('표의 101행 모두 규칙이 있다 (적중 0 초과)', () => {
    for (const row of tableRows(tables.ChangeSkill)) {
      const result = changeSkillHits(row, 1);
      expect(result.supported, row.skillId).toBe(true);
      expect(result.hits, row.skillId).toBeGreaterThan(0);
    }
  });

  it('행이 없으면 계산하지 않는다', () => {
    expect(changeSkillHits(undefined, 1).supported).toBe(false);
  });
});
