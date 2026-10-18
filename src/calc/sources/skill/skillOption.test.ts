import { describe, expect, it } from 'vitest';
import '@/i18n';
import { combineLines } from '@/calc/combine';
import { masteryRuneBuffTabs } from '@/calc/sources/masteryRuneBuff';
import { skillIconPath, skillOptionLines } from '@/calc/sources/skill/skill';

/**
 * 다발 화살 252 옵션 (스킬 옵션 SkillRune 320 "적중할 때마다 5초간 공격력 N% 증가 (최대 5중첩)"): 입력 칸 없이 최고 값 25% x 5중첩 → x2.25,
 * 로그 0.35218 (combat0113.py 116~122 · verify-2026-10-12-0113.md). 다발 화살을 보유하고 장착 칸에 꼈을 때만
 */
describe('스킬 옵션: 다발 화살 252', () => {
  const label = (key: string, params?: Record<string, string | number>) => `${key} ${JSON.stringify(params ?? {})}`;
  const EQUIPPED = { skillLevel_252: '40', skillEquip_5: '252' };

  it('다발 화살을 안 꼈거나 보유하지 않았으면 줄 없음', () => {
    expect(skillOptionLines({}, label)).toEqual([]);
    expect(skillOptionLines({ skillLevel_252: '40' }, label)).toEqual([]);
    expect(skillOptionLines({ skillEquip_5: '252' }, label)).toEqual([]);
  });

  it('꼈으면 최고 값 25% 를 최대 5중첩 선형으로 공격력 % 125 → x2.25', () => {
    const lines = skillOptionLines(EQUIPPED, label);
    expect(lines).toHaveLength(1);
    expect(lines[0].stat).toBe('_per_attackDamage');
    expect(lines[0].value).toBe(125);
    expect(Math.pow(10, combineLines(lines)._per_attackDamage.log)).toBeCloseTo(2.25, 12);
    expect(combineLines(lines)._per_attackDamage.log).toBeCloseTo(0.35218, 5);
  });

  it('다른 옵션도 장착했을 때 최고 값 × 최대 중첩: 어퍼컷 10 × 6, 몸통 박치기 15 × 5, 화살 폭격 100, 용의 가호 공격속도 50', () => {
    const owned = { skillLevel_153: '30', skillLevel_155: '30', skillLevel_255: '30', skillLevel_104: '30' };
    const fighter = skillOptionLines({ ...owned, skillEquip_1: '153', skillEquip_2: '155', skillEquip_3: '104' }, label);
    expect(fighter.map((line) => [line.stat, line.value])).toEqual([
      ['_per_attackDamage', 60],
      ['_per_attackDamage', 75],
      ['attackSpeed', 50],
    ]);
    const archer = skillOptionLines({ ...owned, skillEquip_1: '255' }, label);
    expect(archer.map((line) => [line.stat, line.value])).toEqual([['_per_attackDamage', 100]]);
  });

  it('버프 탭 줄에 들어간다 (전투 중 몫이라 특성 표가 없어도)', () => {
    const buffTab = masteryRuneBuffTabs(() => []).find((tab) => tab.id === 'buff')!;
    const lines = buffTab.lines(EQUIPPED, {});
    expect(lines.map((line) => [line.stat, line.value])).toEqual([['_per_attackDamage', 125]]);
    expect(buffTab.lines({}, {})).toEqual([]);
  });
});

describe('스킬 아이콘 경로', () => {
  it('게임 그림 이름이 소문자 icon 인 1 · 101 · 301 만 따로', () => {
    expect(skillIconPath('252')).toBe('Atlas_Skill_Lobby/Skill_Icon_252');
    expect(skillIconPath('201')).toBe('Atlas_Skill_Lobby/Skill_Icon_201');
    expect(skillIconPath('101')).toBe('Atlas_Skill_Lobby/Skill_icon_101');
  });
});
