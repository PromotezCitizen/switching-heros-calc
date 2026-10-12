import { describe, expect, it } from 'vitest';
import { combineKind, combineLines, withoutExcludedStats, type Line } from './combine';
import { formatLog, logOnePlus, parseGameNumber } from './gameNumber';
import { ARTIFACT_TOTAL_FIELDS, artifactLines } from './sources/artifact';

/** 기대값은 기존 htmls/stat-calc-core.js 를 그대로 실행해 얻은 출력이다 */
describe('큰 수 읽기', () => {
  it.each([
    ['5.14N%', 42.710963118995274, true],
    ['8.97DC', 321.9527924430441, false],
    ['356.53CI%', 263.55209607917044, true],
    ['1,234.5', 3.091491094267951, false],
    ['81.82%', 1.9128594751623549, true],
    ['12ab', 85.07918124604763, false],
    ['3.5aa', 81.54406804435027, false],
  ])('%s', (text, log, percent) => {
    const parsed = parseGameNumber(text);
    expect(parsed?.log).toBeCloseTo(log, 10);
    expect(parsed?.percent).toBe(percent);
  });
  it.each(['abc', '', '0'])('읽을 수 없는 글 %j 은 null', (text) => {
    expect(parseGameNumber(text)).toBeNull();
  });
});

describe('큰 수 표기', () => {
  it.each([
    [0, '1'],
    [1.5, '31.62'],
    [3.99, '9,772.37'],
    [4, '10.00A'],
    [6.3, '2.00B'],
    [8.9999, '999.77B'],
    [11.4, '251.19C'],
    [100, '10.00AG'],
    [321.95, '8.91DC'],
    [17.999999, '1.00F'],
  ])('log %s → %s', (log, expected) => {
    expect(formatLog(log)).toBe(expected);
  });
  it('값이 없거나 무한이면 -', () => {
    expect(formatLog(null)).toBe('-');
    expect(formatLog(Infinity)).toBe('-');
  });
  it('log10(1 + 10^x)', () => {
    expect(logOnePlus(-3)).toBeCloseTo(0.0004340774793185929, 12);
    expect(logOnePlus(0)).toBeCloseTo(0.3010299956639812, 12);
    expect(logOnePlus(2)).toBeCloseTo(2.0043213737826426, 12);
    expect(logOnePlus(15.1)).toBe(15.1);
  });
});

describe('줄 합산', () => {
  it('스탯 이름으로 합산 방식을 정한다', () => {
    expect(combineKind('_per_hp')).toBe('multiply');
    expect(combineKind('x_down_y')).toBe('down');
    expect(combineKind('_pow_z')).toBe('pow');
    expect(combineKind('smite')).toBe('sum');
  });
  it('기존 합산 결과와 같다', () => {
    const lines: Line[] = [
      { source: 'a', stat: '_per_attackDamage', log: parseGameNumber('5.14N%')!.log },
      { source: 'b', stat: '_per_attackDamage', log: parseGameNumber('14.1A%')!.log },
      { source: 'c', stat: '_per_hp', log: parseGameNumber('4.9N%')!.log },
      { source: 'd', stat: 'smite', log: parseGameNumber('81.82%')!.log },
      { source: 'e', stat: 'smite', value: 10 },
      { source: 'f', stat: '_down_x', value: 20 },
      { source: 'g', stat: '_pow_y', value: 8 },
      { source: 'h', stat: '', value: 5 },
      { source: 'i', stat: 'smite', value: 0 },
    ];
    const combined = combineLines(lines);
    expect(Object.keys(combined)).toEqual(['_per_attackDamage', '_per_hp', 'smite', '_down_x', '_pow_y']);
    expect(combined._per_attackDamage.log).toBeCloseTo(42.86325146337833, 10);
    expect(combined._per_attackDamage.count).toBe(2);
    expect(combined._per_hp.log).toBeCloseTo(40.690196080028514, 10);
    expect(combined.smite.sum).toBeCloseTo(91.82, 10);
    expect(combined.smite.count).toBe(2);
    expect(combined._down_x.log).toBeCloseTo(-0.09691001300805639, 12);
    expect(combined._pow_y.log).toBeCloseTo(0.9030899869919435, 12);
  });
});

describe('대소문자만 다른 스탯', () => {
  it('같은 스탯으로 합치고 처음 나온 철자를 쓴다', () => {
    const combined = combineLines([
      { source: 'a', stat: '_per_NormalMonsterDamage', value: 100 },
      { source: 'b', stat: '_per_normalMonsterDamage', value: 100 },
    ]);
    expect(Object.keys(combined)).toEqual(['_per_NormalMonsterDamage']);
    expect(combined._per_NormalMonsterDamage.count).toBe(2);
    expect(combined._per_NormalMonsterDamage.log).toBeCloseTo(2 * Math.log10(2), 12);
  });
});

describe('계산식에서 뺀 스탯 (명중)', () => {
  it('명중 줄은 대소문자와 상관없이 걸러진다', () => {
    const lines: Line[] = [
      { source: 'a', stat: '_per_attackDamage', value: 10 },
      { source: 'b', stat: '_per_hit', value: 9.75 },
      { source: 'c', stat: '_per_Hit', value: 14.37 },
      { source: 'd', stat: 'hit', value: 5 },
    ];
    expect(withoutExcludedStats(lines).map((line) => line.source)).toEqual(['a']);
  });
});

describe('연성 능력치 합계', () => {
  it('읽을 수 있는 칸만 줄이 된다', () => {
    const lines = artifactLines(
      { artifactTotalAtk: '5.14N%', artifactTotalHp: '', artifactTotalSmite: 'abc', artifactTotalBarrier: '24.57%' },
      (fieldId) => fieldId,
    );
    expect(lines.map((line) => [line.source, line.stat])).toEqual([
      ['artifactTotalAtk', '_per_attackDamage'],
      ['artifactTotalBarrier', 'barrier'],
    ]);
  });
  it('관통·스킬 콤보 칸: 특성 합에 더하면 프로필 줄과 같다 (저장 데이터 검증 관통 75.13, 스킬 콤보 38.37)', () => {
    const lines = artifactLines(
      { artifactTotalSpearAttack: '25.13%', artifactTotalSkillCombo: '8.37%' },
      (fieldId) => fieldId,
    );
    expect(lines.map((line) => [line.source, line.stat])).toEqual([
      ['artifactTotalSpearAttack', 'spearAttack'],
      ['artifactTotalSkillCombo', 'skillCombo'],
    ]);
    // 관통 = 기본 10 + 관통 추가 특성 40 + 연성 25.13, 스킬 콤보 = 기본 10 + 추가 특성 20 + 연성 8.37
    const combined = combineLines([
      ...lines,
      { source: '기본 관통', stat: 'spearAttack', value: 10 },
      { source: '관통 추가 특성', stat: 'spearAttackAddPer', value: 40 },
      { source: '기본 스킬 콤보', stat: 'skillCombo', value: 10 },
      { source: '스킬 콤보 추가 특성', stat: 'skillComboAddPer', value: 20 },
    ]);
    expect(combined.spearAttack.sum + combined.spearAttackAddPer.sum).toBeCloseTo(75.13, 10);
    expect(combined.skillCombo.sum + combined.skillComboAddPer.sum).toBeCloseTo(38.37, 10);
  });
  it('칸 순서: 슈퍼 치명타 → 관통 → 스위칭 부스트 → 스킬 콤보', () => {
    const ids = ARTIFACT_TOTAL_FIELDS.map((field) => field.id);
    expect(ids.slice(ids.indexOf('artifactTotalSuperCritical'), ids.indexOf('artifactTotalSkillCombo') + 1)).toEqual([
      'artifactTotalSuperCritical',
      'artifactTotalSpearAttack',
      'artifactTotalSwitchingBoost',
      'artifactTotalSkillCombo',
    ]);
    expect(ids).toHaveLength(17);
  });
});
