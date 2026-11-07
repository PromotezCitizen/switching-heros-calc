import { describe, expect, it } from 'vitest';
import masteryTable from '../../public/data/tables/Mastery.json';
import { masteryTraits } from '@/calc/sources/masteryRuneBuff/mastery';
import { readDictionary } from '@/usb/saveImport/saveDictionary';
import type { ReinforceSave } from '@/usb/saveImport/reinforceValues';
import saveSubset1018 from '@/usb/saveImport/saveSubset1018.json';
import { isUnlocked, usedPoints, validateAllocation, type Allocation } from '@/masteryOptimizer/rules';

const traits = masteryTraits(masteryTable);
/** 10-18 저장 데이터 Default.userLv (claude-docs/device_data/2026-10-18_1347_layout) */
const USER_LEVEL_1018 = 81798;
const NO_BUDGET_LIMIT = Number.POSITIVE_INFINITY;

describe('저장된 실제 배분은 규칙을 모두 통과한다 (규칙이 틀리면 여기서 걸림)', () => {
  const reinforce = saveSubset1018.Reinforce as unknown as ReinforceSave;
  const presets = readDictionary(reinforce.masteryDatas);

  it('10-18 저장 데이터에 프리셋 7개', () => {
    expect([...presets.keys()]).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  for (const [presetKey, masteries] of presets) {
    it(`프리셋 ${presetKey}`, () => {
      const allocation: Allocation = {};
      for (const [rNo, entry] of readDictionary(masteries)) allocation[String(rNo)] = typeof entry === 'number' ? entry : entry.lv;
      expect(validateAllocation(traits, allocation, USER_LEVEL_1018, usedPoints(traits, allocation))).toEqual([]);
    });
  }
});

describe('규칙 하나씩', () => {
  const firstStep = traits.find((trait) => !trait.ultimate && trait.step === 1)!;
  const secondStepSameGroup = traits.find((trait) => !trait.ultimate && trait.group === firstStep.group && trait.step === 2)!;
  const ultimate = traits.find((trait) => trait.ultimate)!;

  it('사용 포인트 = 필요 포인트 × 레벨 합', () => {
    const allocation: Allocation = { [secondStepSameGroup.rNo]: 3, [firstStep.rNo]: 1 };
    expect(usedPoints(traits, allocation)).toBe(secondStepSameGroup.needPoint * 3 + firstStep.needPoint);
  });

  it('첫 단계는 앞 단계 조건이 없다', () => {
    expect(isUnlocked(traits, firstStep, {}, firstStep.unlockLevel)).toBe(true);
  });

  it('유저 레벨이 모자라면 잠김', () => {
    expect(isUnlocked(traits, firstStep, {}, firstStep.unlockLevel - 1)).toBe(false);
    expect(validateAllocation(traits, { [ultimate.rNo]: 1 }, ultimate.unlockLevel - 1, NO_BUDGET_LIMIT)).toContainEqual({
      kind: 'userLevel',
      rNo: ultimate.rNo,
    });
  });

  it('앞 단계에 최대 레벨 특성이 없으면 잠김, 채우면 열림', () => {
    const userLevel = secondStepSameGroup.unlockLevel;
    expect(isUnlocked(traits, secondStepSameGroup, {}, userLevel)).toBe(false);
    expect(isUnlocked(traits, secondStepSameGroup, { [firstStep.rNo]: firstStep.maxLevel - 1 }, userLevel)).toBe(false);
    expect(isUnlocked(traits, secondStepSameGroup, { [firstStep.rNo]: firstStep.maxLevel }, userLevel)).toBe(true);
    expect(
      validateAllocation(traits, { [secondStepSameGroup.rNo]: 1 }, userLevel, NO_BUDGET_LIMIT),
    ).toEqual([{ kind: 'previousStep', rNo: secondStepSameGroup.rNo }]);
  });

  it('앞 단계는 같은 묶음만 본다 (다른 묶음의 최대 레벨은 소용없음)', () => {
    const otherGroupFirst = traits.find((trait) => !trait.ultimate && trait.step === 1 && trait.group !== firstStep.group)!;
    const allocation: Allocation = { [otherGroupFirst.rNo]: otherGroupFirst.maxLevel };
    expect(isUnlocked(traits, secondStepSameGroup, allocation, secondStepSameGroup.unlockLevel)).toBe(false);
  });

  describe('얼티밋: 유저 레벨 + 같은 묶음 18단계 특성 하나가 최대 레벨 (5000)', () => {
    const laterUltimate = traits.find((trait) => trait.ultimate && trait.step > 1)!;
    const gates = traits.filter((trait) => !trait.ultimate && trait.group === laterUltimate.group && trait.step === 18);
    const otherGroupGate = traits.find((trait) => !trait.ultimate && trait.group !== laterUltimate.group && trait.step === 18)!;
    const userLevel = laterUltimate.unlockLevel;

    it('18단계 특성이 최대가 아니면 잠김 (아무것도 없을 때, 4999 일 때)', () => {
      expect(gates.length).toBeGreaterThan(1);
      expect(isUnlocked(traits, laterUltimate, {}, userLevel)).toBe(false);
      expect(isUnlocked(traits, laterUltimate, { [gates[0].rNo]: gates[0].maxLevel - 1 }, userLevel)).toBe(false);
      expect(validateAllocation(traits, { [laterUltimate.rNo]: 1 }, userLevel, NO_BUDGET_LIMIT)).toContainEqual({
        kind: 'ultimateGate',
        rNo: laterUltimate.rNo,
      });
    });
    it('같은 묶음의 18단계 특성 하나만 최대여도 열린다 (직업은 상관없음)', () => {
      for (const gate of gates) expect(isUnlocked(traits, laterUltimate, { [gate.rNo]: gate.maxLevel }, userLevel)).toBe(true);
    });
    it('다른 묶음의 18단계 최대는 소용없고, 유저 레벨이 모자라면 최대여도 잠김', () => {
      expect(isUnlocked(traits, laterUltimate, { [otherGroupGate.rNo]: otherGroupGate.maxLevel }, userLevel)).toBe(false);
      expect(isUnlocked(traits, laterUltimate, { [gates[0].rNo]: gates[0].maxLevel }, userLevel - 1)).toBe(false);
    });
    it('18단계가 최대가 아닌데 얼티밋이 있는 배분은 규칙 위반 (ultimateGate)', () => {
      const allocation: Allocation = { [gates[0].rNo]: gates[0].maxLevel - 1000, [laterUltimate.rNo]: 1 };
      expect(validateAllocation(traits, allocation, userLevel, NO_BUDGET_LIMIT)).toContainEqual({ kind: 'ultimateGate', rNo: laterUltimate.rNo });
    });
  });

  it('최대 레벨 초과 · 예산 초과 · 모르는 특성 번호', () => {
    const level = firstStep.maxLevel + 1;
    expect(validateAllocation(traits, { [firstStep.rNo]: level }, USER_LEVEL_1018, NO_BUDGET_LIMIT)).toEqual([
      { kind: 'overMaxLevel', rNo: firstStep.rNo },
    ]);
    const allocation: Allocation = { [firstStep.rNo]: firstStep.maxLevel };
    expect(validateAllocation(traits, allocation, USER_LEVEL_1018, usedPoints(traits, allocation) - 1)).toEqual([
      { kind: 'overBudget', rNo: null },
    ]);
    expect(validateAllocation(traits, { '999999': 1 }, USER_LEVEL_1018, NO_BUDGET_LIMIT)).toEqual([
      { kind: 'unknownTrait', rNo: '999999' },
    ]);
  });

  it('레벨 0 은 해금과 상관없이 통과', () => {
    expect(validateAllocation(traits, { [ultimate.rNo]: 0 }, 0, 0)).toEqual([]);
  });
});
