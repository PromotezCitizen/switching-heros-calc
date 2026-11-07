import { describe, expect, it } from 'vitest';
import { masteryLevelKey, masteryLines, masteryTraits, traitValue } from '@/calc/sources/masteryRuneBuff/mastery';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();
const label = (key: string) => key;
const trait = (rNo: string) => masteryTraits(tables.Mastery).find((candidate) => candidate.rNo === rNo)!;
const levels = (...entries: [string, number][]) => Object.fromEntries(entries.map(([rNo, level]) => [masteryLevelKey(rNo), String(level)]));

describe('일반 특성의 교체 등장 후 지속 효과 (_per_<스탯>_HeroSwap)', () => {
  it('특성 26 · 27 · 28 은 교체 등장 후 20초간 효과다', () => {
    expect(trait('26').statName).toBe('_per_buffAndActiveDmg_HeroSwap');
    expect(trait('27').statName).toBe('_per_CharSkillDamage_HeroSwap');
    expect(trait('28').statName).toBe('_per_ChangeSkillDamage_HeroSwap');
  });

  it('켜진 시간 비율이 0 이면 줄을 만들지 않는다 (이름에 _HeroSwap 이 붙은 줄도 남기지 않는다)', () => {
    const lines = masteryLines(levels(['26', 20], ['27', 20]), tables.Mastery, label, 0);
    expect(lines).toEqual([]);
  });

  it('켜진 시간 비율 100% 면 기본 스탯 줄로 바꿔 값 그대로 넣는다', () => {
    const lines = masteryLines(levels(['26', 20], ['27', 20], ['28', 20]), tables.Mastery, label, 100);
    expect(lines.map((line) => line.stat).sort()).toEqual(['_per_ChangeSkillDamage', '_per_CharSkillDamage', '_per_buffAndActiveDmg']);
    const buff = lines.find((line) => line.stat === '_per_buffAndActiveDmg');
    expect(buff?.value).toBeCloseTo(traitValue(trait('26'), 20), 9);
  });

  it('비율이 50% 면 값이 절반이다', () => {
    const [line] = masteryLines(levels(['26', 20]), tables.Mastery, label, 50);
    expect(line.value).toBeCloseTo(traitValue(trait('26'), 20) / 2, 9);
  });

  it('교체와 상관없는 일반 특성은 비율과 상관없이 그대로다', () => {
    const [line] = masteryLines(levels(['24', 20]), tables.Mastery, label, 0);
    expect(line.stat).toBe('_per_BuffSkillDamage');
    expect(line.value).toBeCloseTo(traitValue(trait('24'), 20), 9);
  });
});
