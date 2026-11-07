import { describe, expect, it } from 'vitest';
import alchemySlotTable from '../../../public/data/tables/AlchemySlot.json';
import awakenTable from '../../../public/data/tables/Awaken.json';
import { OWNED_CARDS_KEY } from '@/usb/saveImport/ownedCards';
import { HUNTING_KEYS } from '@/hunting/huntingKeys';
import cardTable from '../../../public/data/tables/Card.json';
import characterTable from '../../../public/data/tables/Character.json';
import affinityTable from '../../../public/data/tables/CharacterAffinity.json';
import collectionTable from '../../../public/data/tables/Collection.json';
import contentMissionTable from '../../../public/data/tables/ContentMission.json';
import costumeTable from '../../../public/data/tables/Costume.json';
import diceTable from '../../../public/data/tables/DiceOption.json';
import iconTable from '../../../public/data/tables/Icon.json';
import petTable from '../../../public/data/tables/Pet.json';
import relicTable from '../../../public/data/tables/Relic.json';
import titleTable from '../../../public/data/tables/Title.json';
import trainingTable from '../../../public/data/tables/Training.json';
import weaponCharTable from '../../../public/data/tables/WeaponChar.json';
import weaponJobTable from '../../../public/data/tables/WeaponJob.json';
import { ACCOUNT_KEYS } from '@/account/accountKeys';
import { parseGameNumber } from '@/calc/gameNumber';
import savedValues from '@/calc/sources/summary/testValues0154.json';
import type { StatTables } from '@/data/statTables';
import { importSave, missingSaveKeys, pickDefault, topKeys, type SaveFiles } from '@/usb/saveImport/importSave';
import { readDictionary } from '@/usb/saveImport/saveDictionary';
import saveSubset from '@/usb/saveImport/saveSubset0154.json';
import saveSubset1018 from '@/usb/saveImport/saveSubset1018.json';

/**
 * 2026-10-12 01:54 저장 데이터 (필요한 키만 뽑은 사본 saveSubset0154.json) 를 변환해
 * 같은 저장 데이터로 Python 변환 스크립트가 만든 입력값 (testValues0154.json, 화면 값과 맞춘 것) 과 대조한다
 */
const tables = {
  AlchemySlot: alchemySlotTable,
  Awaken: awakenTable,
  Card: cardTable,
  Character: characterTable,
  CharacterAffinity: affinityTable,
  Collection: collectionTable,
  ContentMission: contentMissionTable,
  Costume: costumeTable,
  DiceOption: diceTable,
  Icon: iconTable,
  Pet: petTable,
  Relic: relicTable,
  Title: titleTable,
  Training: trainingTable,
  WeaponChar: weaponCharTable,
  WeaponJob: weaponJobTable,
} as StatTables;
const expected: Record<string, string> = savedValues.values;

/**
 * 저장 데이터에서 오지 않는 칸 (Python 이 따로 넣은 값): 전투 중 최대 상태 3개, 프로필 비교값 2개,
 * 영혼 연성 레벨 (잠김 여부를 저장 데이터로 못 가려 Python 도 빈칸), Python 판의 다발 화살 옵션 칸 (지금은 스킬마다 옵션 칸 skillOption_<스킬>_<칸>)
 */
const NOT_FROM_SAVE = new Set(['summaryEnemyCountReached', 'berserkStacks', 'killerActive', 'atk', 'hp', 'soulForgeLevel', 'skillOption252']);
/** 스킬마다 옵션 칸: Python 변환에는 없는 칸이라 따로 대조한다 */
const SKILL_OPTION_KEY = /^skillOption_\d+_\d+$/;
/** 스킬 문양 칸: 이것도 Python 변환에는 없는 칸이라 skillRuneValues.test.ts 에서 따로 대조한다 */
const SKILL_PERK_KEY = /^skillPerk_\d+_\d+$/;
/** 2슬롯 히어로의 장착 스킬 · 전용 무기 장착 (교체 DPM 용): 이것도 Python 변환에는 없는 칸이라 swapDamage.test.ts 에서 따로 대조한다 */
const SECOND_HERO_KEY = /^(contentPresets|presetOverrides|alchemySameGradeMax|weaponSssOptionCount2?|skillEquip2_\d+|exclusiveEquipped2|weaponOption2(Stat|Value)\d+|frameOwned_\d+|ancientMastered|ancientProgress|soulForgeLevel|soulForgeSlot_\d+|coreMasteryLevel|figureLevel_\d+|normalMonsterFood)$/;
const NUMBER_KEY = /(^inheritValue|^weaponOptionValue|^petOption\d+_\d+Value|^artifactTotal(Smite|Barrier|DoubleAttack|SuperCritical|SwitchingBoost|SpearAttack|SkillCombo)$)/;
const LOG_TOLERANCE = 1e-6;
const VIP_LEVEL_0154 = '11';
const FAIRY_LEVEL_0154 = '648';

describe('저장 데이터 → 입력 칸 (저장 파일 10종)', () => {
  const raw = saveSubset as unknown as Omit<SaveFiles, 'Default'> & { Default: Parameters<typeof pickDefault>[0] };
  const result = importSave({ ...raw, Default: pickDefault(raw.Default) }, tables);

  it('표에서 못 찾은 항목 없음', () => {
    expect(result.notes).toEqual([]);
  });

  it('전용 무기 SSS 옵션 수 (1 · 2슬롯): 0 이상 정수 글로 채운다', () => {
    for (const field of ['weaponSssOptionCount', 'weaponSssOptionCount2']) {
      expect(result.values[field], field).toMatch(/^\d+$/);
    }
  });

  it('연성장비 같은 등급 최대 개수: rarity 18 × 7 · 19 × 2 · 20 × 1 → 7 (등급 숫자가 다르면 따로 센다)', () => {
    expect(result.values.alchemySameGradeMax).toBe('7');
  });

  it('Python 변환의 저장 데이터 칸을 빠짐없이 같은 값으로 낸다', () => {
    const expectedKeys = Object.keys(expected).filter((key) => !NOT_FROM_SAVE.has(key)).sort();
    // 비운 칸 ('' = 이 프리셋에서 레벨 없는 특성) 은 파이썬 변환에 없는 칸이라 뺀다
    const sameKeys = Object.keys(result.values).filter(
      (key) => !SKILL_OPTION_KEY.test(key) && !SKILL_PERK_KEY.test(key) && !SECOND_HERO_KEY.test(key) && !(key.startsWith('mastery_') && result.values[key] === ''),
    );
    expect(sameKeys.sort()).toEqual(expectedKeys);
    for (const key of expectedKeys) {
      const actual = result.values[key];
      const expectedNumber = parseGameNumber(expected[key]);
      if (NUMBER_KEY.test(key)) {
        expect(Number(actual), key).toBeCloseTo(Number(expected[key]), 6);
      } else if (expectedNumber && /[A-Z]$/.test(expected[key])) {
        expect(Math.abs(parseGameNumber(actual)!.log - expectedNumber.log), key).toBeLessThan(LOG_TOLERANCE);
      } else {
        expect(actual, key).toBe(expected[key]);
      }
    }
  });

  it('스킬 옵션: 세트 1 의 옵션 번호 (rNo) 를 칸 순서대로 (다발 화살 252 = 320 · 319)', () => {
    const skillOptions = readDictionary(raw.Skill.psSkillOptionDic);
    const savedCount = [...skillOptions.values()].reduce((sum, sets) => sum + (readDictionary(sets).get(1)?.diceOptions.length ?? 0), 0);
    expect(Object.keys(result.values).filter((key) => SKILL_OPTION_KEY.test(key))).toHaveLength(savedCount);
    expect(result.values.skillOption_252_1).toBe('320');
    expect(result.values.skillOption_252_2).toBe('319');
  });

  it('저장 구조가 바뀌어 키가 빠지면 그 항목만 건너뛰고 나머지는 채운다', () => {
    const { diaryData: _diaryData, ...charWithoutDiary } = raw.Char;
    void _diaryData;
    const keysByKind = Object.fromEntries(Object.entries({ ...raw, Char: charWithoutDiary }).map(([kind, data]) => [kind, topKeys(data)]));
    expect(missingSaveKeys(keysByKind)).toEqual(['Default.diaryData / Char.diaryData']);
    const partial = importSave({ ...raw, Char: charWithoutDiary as SaveFiles['Char'], Default: pickDefault(raw.Default) }, tables);
    expect(partial.notes).toHaveLength(1);
    expect(partial.notes[0]).toMatch(/^일기장: /);
    expect(Object.keys(partial.values).some((key) => key.startsWith('diary'))).toBe(false);
    expect(partial.values.mineLevel).toBe(expected.mineLevel);
    expect(Object.keys(partial.values)).toHaveLength(Object.keys(result.values).filter((key) => !key.startsWith('diary')).length);
  });

  it('키가 없어 값이 비면 "undefined" 를 칸에 쓰지 않는다 (파견 레벨 Dispatch.lv, 무기 링크 초월)', () => {
    const { lv: _lv, ...dispatchWithoutLevel } = raw.Dispatch;
    void _lv;
    const equipWithoutStar = { ...raw.Equip, weaponLinkData: { ...raw.Equip.weaponLinkData, transcendLv: undefined } };
    const partial = importSave(
      {
        ...raw,
        Dispatch: dispatchWithoutLevel as SaveFiles['Dispatch'],
        Equip: equipWithoutStar as unknown as SaveFiles['Equip'],
        Default: pickDefault(raw.Default),
      },
      tables,
    );
    expect(partial.values.relicLink_dispatchLevel).toBeUndefined();
    expect(partial.values.weaponLinkStar).toBeUndefined();
    expect(Object.values(partial.values).some((value) => /undefined|NaN/.test(value))).toBe(false);
    expect(partial.notes.join('\n')).toMatch(/파견 레벨/);
    expect(partial.notes.join('\n')).toMatch(/읽지 못한 항목: weaponLinkStar/);
  });

  it('공통 입력: VIP · 요정 레벨 · 광고 제거, 게임 버전 (저장 데이터 _version 5.5 = 스토어 5.50)', () => {
    expect(result.accountValues).toEqual({
      [ACCOUNT_KEYS.vipLevel]: VIP_LEVEL_0154,
      [ACCOUNT_KEYS.fairyLevel]: FAIRY_LEVEL_0154,
      [ACCOUNT_KEYS.adRemoved]: 'true',
      'meta.gameVersion': '5.50',
      [OWNED_CARDS_KEY]: expect.stringMatching(/^\d+:\d+:/),
    });
  });

  it('사냥 계산기 오프라인 층은 최대층 (Default.maxStageNo), 없으면 칸을 건드리지 않는다', () => {
    const withStage = importSave({ ...raw, Default: pickDefault({ ...raw.Default, maxStageNo: 7616, selectStageNo: 7000 } as Parameters<typeof pickDefault>[0]) }, tables, false);
    expect(withStage.accountValues[HUNTING_KEYS.offlineFloor]).toBe('7616');
    const without = importSave({ ...raw, Default: pickDefault({ ...raw.Default, maxStageNo: undefined }) }, tables, false);
    expect(HUNTING_KEYS.offlineFloor in without.accountValues).toBe(false);
  });
  it('공통 입력: 유저 레벨 (Default.userLv) 은 최적 특성의 유저 레벨 칸으로, 없으면 칸을 건드리지 않는다', () => {
    const withLevel = importSave({ ...raw, Default: pickDefault({ ...raw.Default, userLv: 96052 }) }, tables, false);
    expect(withLevel.accountValues[ACCOUNT_KEYS.userLevel]).toBe('96052');
    expect(ACCOUNT_KEYS.userLevel in result.accountValues).toBe(false);
  });
});

/** 새 저장 형식 기준 칸 (일기장 · 광산 · 훈련 · 파견 레벨이 Default 로 옮겨짐). 화면 기대값은 없어 칸이 다 나오는지만 본다 */
const MOVED_SECTION_KEY = /^(diary|mine|training|relicLink_dispatchLevel$)/;
const DISPATCH_LEVEL_1018 = '30';

describe('저장 데이터 → 입력 칸 (2026-10-18 새 저장 형식 layoutVer 1)', () => {
  const raw = saveSubset1018 as unknown as Omit<SaveFiles, 'Default'> & { Default: Parameters<typeof pickDefault>[0] };
  const result = importSave({ ...raw, Default: pickDefault(raw.Default) }, tables);

  it('옮겨진 키를 빠진 키로 알리지 않는다', () => {
    const keysByKind = Object.fromEntries(Object.entries(raw).map(([kind, data]) => [kind, topKeys(data)]));
    expect(missingSaveKeys(keysByKind)).toEqual([]);
  });

  it('표에서 못 찾은 항목 · 못 읽은 칸 없음', () => {
    expect(result.notes).toEqual([]);
  });

  it('옮겨진 일기장 · 광산 · 훈련 · 파견 레벨 칸이 옛 형식과 같은 이름으로 다 나온다', () => {
    const oldKeys = Object.keys(expected).filter((key) => MOVED_SECTION_KEY.test(key)).sort();
    expect(Object.keys(result.values).filter((key) => MOVED_SECTION_KEY.test(key)).sort()).toEqual(oldKeys);
    expect(result.values.relicLink_dispatchLevel).toBe(DISPATCH_LEVEL_1018);
  });

  it('게임 버전: float 로 저장된 5.599999… 를 5.60 으로', () => {
    expect(result.accountValues['meta.gameVersion']).toBe('5.60');
  });
});
