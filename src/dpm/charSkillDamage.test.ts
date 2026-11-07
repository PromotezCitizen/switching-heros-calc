import { describe, expect, it } from 'vitest';
import { charSkillHits, heroOptionMultiplier } from '@/dpm/charSkillDamage';
import { loadTestTables } from '@/test/loadTestTables';

const tables = loadTestTables();
/** 에이카 각성 10 (전용 스킬 12217: damage 10000, value1 5, value3 30000, 단계 5) */
const EIKA = { charName: '에이카', heroOwnedAwaken_205: '10' };

describe('전용 스킬 12217 (에이카)', () => {
  it('각성 칸 이름이 맞는지 먼저: 각성 10 → 12217', () => {
    expect(charSkillHits(EIKA, tables, 3, 0).skillId).toBe('12217');
  });
  it('전용 무기 미장착: 유성 5 × 적 3 = 15, 계수 100 (10000%)', () => {
    const hits = charSkillHits(EIKA, tables, 3, 0);
    expect(hits.supported).toBe(true);
    expect(hits.hits).toBe(15);
    expect(Math.pow(10, hits.coefficientLog)).toBeCloseTo(100, 8);
  });
  it('전용 무기 1021 ★4 이상 장착 → 유성 5 + 6 = 11 → 33, 보주 파편 2 → + 300 × 2', () => {
    const equipped = { ...EIKA, exclusiveEquipped: 'true', exclusiveOwnedStar_1021: '13' };
    expect(charSkillHits(equipped, tables, 3, 0).hits).toBe(33);
    expect(charSkillHits(equipped, tables, 3, 2).hits).toBe(33 + 600);
  });
  it('각성 5 (12216, 단계 4) 는 보주 없음: 파편 수를 넣어도 유성만', () => {
    const hits = charSkillHits({ ...EIKA, heroOwnedAwaken_205: '5' }, tables, 3, 2);
    expect(hits.skillId).toBe('12216');
    expect(hits.hits).toBe(15);
  });
  it('히어로가 없으면 supported false', () => {
    expect(charSkillHits({}, tables, 3, 0).supported).toBe(false);
  });
});

describe('영웅 옵션 (장착 스킬 문양의 전용/교체 스킬 데미지)', () => {
  it('문양이 없으면 1', () => {
    expect(heroOptionMultiplier({ skillLevel_201: '43', skillEquip_1: '201' }, tables)).toBe(1);
  });
  it('기습 Lv60 "전용/교체 스킬 데미지 100%" 를 장착 칸에 끼면 ×2, 안 끼면 1', () => {
    const perk = { skillLevel_1: '60', skillPerk_1_60: 'ChangeCharSkillDmg' };
    expect(heroOptionMultiplier({ ...perk, skillEquip_1: '1' }, tables)).toBe(2);
    expect(heroOptionMultiplier(perk, tables)).toBe(1);
  });
});
