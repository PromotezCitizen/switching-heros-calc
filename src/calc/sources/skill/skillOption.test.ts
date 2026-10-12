import { describe, expect, it } from 'vitest';
import '../../../i18n';
import { combineLines } from '../../combine';
import { masteryRuneBuffTabs } from '../masteryRuneBuff';
import { arrowBarrageOptionPercent, skillOptionLines } from './skill';

/**
 * 다발 화살 252 옵션 (스킬 옵션 SkillRune 320 "적중할 때마다 5초간 공격력 N% 증가 (최대 5중첩)"): 25% x 5중첩 → x2.25, 로그 0.35218
 * (combat0113.py 116~122 · verify-2026-10-12-0113.md). 입력은 테스트 안에서 넣는다 (기본값 = 옵션 없음)
 */
describe('스킬 옵션: 다발 화살 252', () => {
  const label = (key: string, params?: Record<string, string | number>) => `${key} ${JSON.stringify(params ?? {})}`;

  it('칸이 비어 있거나 모르는 값이면 옵션 없음', () => {
    expect(arrowBarrageOptionPercent({})).toBe(0);
    expect(arrowBarrageOptionPercent({ skillOption252: '' })).toBe(0);
    expect(arrowBarrageOptionPercent({ skillOption252: '7' })).toBe(0);
    expect(skillOptionLines({}, label)).toEqual([]);
  });

  it('옵션 값 25% 를 최대 5중첩 선형으로 공격력 % 125 → x2.25', () => {
    expect(arrowBarrageOptionPercent({ skillOption252: '25' })).toBe(25);
    const lines = skillOptionLines({ skillOption252: '25' }, label);
    expect(lines).toHaveLength(1);
    expect(lines[0].stat).toBe('_per_attackDamage');
    expect(lines[0].value).toBe(125);
    expect(Math.pow(10, combineLines(lines)._per_attackDamage.log)).toBeCloseTo(2.25, 12);
    expect(combineLines(lines)._per_attackDamage.log).toBeCloseTo(0.35218, 5);
  });

  it('등급마다 값 5 / 10 / 15 / 20 / 25 → x1.25 / x1.5 / x1.75 / x2 / x2.25', () => {
    const factors = [5, 10, 15, 20, 25].map((percent) => {
      const lines = skillOptionLines({ skillOption252: String(percent) }, label);
      return Math.pow(10, combineLines(lines)._per_attackDamage.log);
    });
    expect(factors[0]).toBeCloseTo(1.25, 12);
    expect(factors[1]).toBeCloseTo(1.5, 12);
    expect(factors[2]).toBeCloseTo(1.75, 12);
    expect(factors[3]).toBeCloseTo(2, 12);
    expect(factors[4]).toBeCloseTo(2.25, 12);
  });

  it('버프 탭 줄에 들어간다 (전투 중 몫이라 특성 표가 없어도, 스킬 탭 줄은 비어 있음)', () => {
    const buffTab = masteryRuneBuffTabs(() => []).find((tab) => tab.id === 'buff')!;
    const lines = buffTab.lines({ skillOption252: '25' }, {});
    expect(lines.map((line) => [line.stat, line.value])).toEqual([['_per_attackDamage', 125]]);
    expect(buffTab.lines({}, {})).toEqual([]);
  });
});
