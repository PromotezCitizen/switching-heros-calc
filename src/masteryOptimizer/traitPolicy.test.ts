import { describe, expect, it } from 'vitest';
import { traitPolicyFor } from '@/masteryOptimizer/traitPolicy';

describe('특성 추천 고정 · 무시 규칙', () => {
  it('광폭화 7 · 이성 유지 8 · 마나 체인 23 은 고정, 무시 목록은 찍지 않음', () => {
    const policy = traitPolicyFor('stage');
    expect([...policy.fixed]).toEqual(['7', '8', '23']);
    for (const rNo of ['2', '4', '24', '26', '37', '40', '41', '42', '46', '62', '64', '214'])
      expect(policy.ignored.has(rNo)).toBe(true);
  });

  it('방어 특성은 대상 종류에 맞는 것만 남긴다 (일반 곡예, 보스 방탄, 히어로 위기회피, 2 포함)', () => {
    const allowed = (target: Parameters<typeof traitPolicyFor>[0]) =>
      ['48', '302', '49', '303', '50', '304'].filter((rNo) => !traitPolicyFor(target).ignored.has(rNo));
    expect(allowed('stage')).toEqual(['48', '302']);
    expect(allowed('awaken')).toEqual(['49', '303']);
    expect(allowed('pvp')).toEqual(['50', '304']);
  });
});

describe('체력은 전부 빼고 계산: 체력을 올리는 얼티밋은 무시', () => {
  it('statName 에 hp 마디가 있는 얼티밋 16개 (1000 1001 1002 1004 1009 1011 1012 1013 1014 1019 1021 1023 1024 1025 1026 3020)', async () => {
    const { loadTestTables } = await import('@/test/loadTestTables');
    const { masteryTraits } = await import('@/calc/sources/masteryRuneBuff/mastery');
    const traits = masteryTraits(loadTestTables().Mastery);
    const policy = traitPolicyFor('stage', traits);
    const hpUltimates = traits
      .filter((trait) => trait.ultimate && policy.ignored.has(trait.rNo) && /(^|_)hp(_|$)/i.test(trait.statName))
      .map((trait) => trait.rNo);
    expect([...hpUltimates].sort()).toEqual(
      [
        '1000',
        '1001',
        '1002',
        '1004',
        '1009',
        '1011',
        '1012',
        '1013',
        '1014',
        '1019',
        '1021',
        '1023',
        '1024',
        '1025',
        '1026',
        '3020',
      ].sort(),
    );
  });
});

describe('대상별로 더 빼는 특성', () => {
  it('야성 강화 9 · 끓어오르는 분노 10 은 늘 무시, 전장의 열기 53 · 사냥꾼의 본능 54 는 보스 · 히어로에서만, 연환 타격 20 은 PvP 가 아니면', () => {
    const stage = traitPolicyFor('stage');
    const boss = traitPolicyFor('awaken');
    const pvp = traitPolicyFor('pvp');
    for (const rNo of ['9', '10']) expect(stage.ignored.has(rNo)).toBe(true);
    expect(stage.ignored.has('53')).toBe(false);
    expect(boss.ignored.has('53') && boss.ignored.has('54')).toBe(true);
    expect(pvp.ignored.has('54')).toBe(true);
    expect(stage.ignored.has('20')).toBe(true);
    expect(pvp.ignored.has('20')).toBe(false);
  });
});

describe('편성 짝과 대상 종류 피해 얼티밋', () => {
  it('두 히어로 속성이 같으면 다른 속성 쪽 (209 · 2007) 을, 성별이 다르면 같은 성별 쪽 (2008) 을 뺀다', () => {
    const policy = traitPolicyFor('stage', [], { attributes: ['Water', 'Water'], genders: ['1', '2'] });
    for (const rNo of ['209', '2007', '2008']) expect(policy.ignored.has(rNo), rNo).toBe(true);
    for (const rNo of ['208', '2006', '2009']) expect(policy.ignored.has(rNo), rNo).toBe(false);
  });

  it('히어로가 한 명이면 짝 특성을 모두 뺀다', () => {
    const policy = traitPolicyFor('stage', [], { attributes: ['Fire'], genders: ['1'] });
    for (const rNo of ['208', '209', '2006', '2007', '2008', '2009']) expect(policy.ignored.has(rNo), rNo).toBe(true);
  });

  it('대상 종류 피해 얼티밋은 그 종류만 남긴다', () => {
    const boss = traitPolicyFor('awaken');
    for (const rNo of ['3003', '3034', '3005', '3036']) expect(boss.ignored.has(rNo), rNo).toBe(true);
    for (const rNo of ['3004', '3035']) expect(boss.ignored.has(rNo), rNo).toBe(false);
  });
});

describe('전투 특화 히어로 공격력 얼티밋', () => {
  it('두 히어로 특화가 같으면 그 특화 것만, 다르면 모두 후보', () => {
    const same = traitPolicyFor('stage', [], { attributes: [], genders: [], targetUnits: ['Boss', 'Boss'] });
    for (const rNo of ['1016', '1017', '1034', '1035']) expect(same.ignored.has(rNo), rNo).toBe(true);
    for (const rNo of ['1015', '1033']) expect(same.ignored.has(rNo), rNo).toBe(false);
    const mixed = traitPolicyFor('stage', [], { attributes: [], genders: [], targetUnits: ['Boss', 'Hero'] });
    for (const rNo of ['1015', '1016', '1017', '1033', '1034', '1035']) expect(mixed.ignored.has(rNo), rNo).toBe(false);
  });
});

describe('펫 속성 지배자', () => {
  it('장착 펫이 가장 많은 속성 것만 남기고, 같은 수면 모두, 펫이 없으면 모두 뺀다', () => {
    const water = traitPolicyFor('stage', [], {
      attributes: [],
      genders: [],
      petCounts: { Water: 3, Fire: 2, Earth: 1 },
    });
    for (const rNo of ['1005', '1007', '1030', '1032']) expect(water.ignored.has(rNo), rNo).toBe(true);
    for (const rNo of ['1006', '1031']) expect(water.ignored.has(rNo), rNo).toBe(false);
    const tie = traitPolicyFor('stage', [], { attributes: [], genders: [], petCounts: { Water: 2, Fire: 2 } });
    expect(tie.ignored.has('1005') || tie.ignored.has('1006')).toBe(false);
    const none = traitPolicyFor('stage', [], { attributes: [], genders: [], petCounts: {} });
    for (const rNo of ['1005', '1006', '1007']) expect(none.ignored.has(rNo), rNo).toBe(true);
  });
});
