/**
 * 저장 데이터 Equip (+ 1슬롯 히어로, 받은 미션 목록) → 전용 무기·일반 무기·무기 링크·펫 입력 칸 값.
 * 영혼 연성 레벨은 잠김 여부를 저장 데이터로 가릴 수 없어 채우지 않는다.
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables, type TableRow } from '@/data/statTables';
import { groupBy, readDictionary, runSection, type SaveDictionary, type SaveImportResult } from '@/usb/saveImport/saveDictionary';
import { multiplierLogFromPercent, percentTextFromMultiplierLog } from '@/usb/saveImport/saveText';
import { exclusiveOptionStatField, exclusiveOptionValueField } from '@/calc/sources/hero/rosterFields';

const {
  DICE_GRADES,
  WEAPON_DICE_ID,
  SSS_OPTION,
  WEAPON_LINK_JOBS,
  EXCLUSIVE_WEAPON_ID_ABOVE,
  WEAPON_TRANSCEND_CONTENT_TYPE,
  WEAPON_TRANSCEND_MISSION_TYPE,
  ATTACK_PERCENT_STAT,
} = CONSTS.usb;

/** 저장 옵션 하나 (grade = 등급 번호, 1 = D) */
interface DiceOption {
  diceId: number;
  statType: string;
  grade: number;
  unitLv: number;
}

export interface EquipSave {
  psCharWeaponDic: SaveDictionary<number, { trscLv: number; enhLv: number }>;
  eqWeaponDic: SaveDictionary<number, number>;
  petDataDic: SaveDictionary<number, { lv: number }>;
  equipPetDataDic: SaveDictionary<number, { leaderId: number; slotList: { petId: number; optionId: number }[] }>;
  petOptionDic: SaveDictionary<number, SaveDictionary<number, { diceOptions: DiceOption[] }>>;
  weaponLinkData: { symbolLvDic: SaveDictionary<number, number>; transcendLv: number };
  psWeaponOptionDic: SaveDictionary<number, SaveDictionary<number, { diceOptions: DiceOption[] }>>;
  psJobWeaponDic: SaveDictionary<number, { weaponId: number; enhLv: number }>;
}

/** 다른 파일에서 가져오는 값: 쓰는 프리셋, 그 프리셋의 1슬롯 히어로, 받은 미션 번호 */
export interface EquipContext {
  presetKey: number;
  slot1HeroId: number;
  /** 2슬롯 히어로 (교체 DPM 용, 없으면 -1) */
  slot2HeroId?: number;
  receivedMissionIds: number[];
}

/** 주사위 표 값 = min(최소 + 단계 × 단위, 최대) (게임 m6053 과 같이 statMax 에서 자름, 표에 없으면 undefined) */
export function diceValue(rows: TableRow[], diceId: string, option: DiceOption): number | undefined {
  const grade = DICE_GRADES[option.grade - 1];
  const row = rows.find((candidate) => candidate.diceId === diceId && candidate.statType === option.statType && candidate.grade === grade);
  return row ? Math.min(Number(row.statMin) + Number(row.statUnit) * option.unitLv, Number(row.statMax)) : undefined;
}

export function equipValues(equip: EquipSave, context: EquipContext, tables: StatTables): SaveImportResult {
  const values: Record<string, string> = {};
  const notes: string[] = [];
  const diceRows = tableRows(tables.DiceOption);
  const received = new Set(context.receivedMissionIds);

  const exclusiveIds = new Set(tableRows(tables.WeaponChar).map((row) => row.weaponId));
  let equippedWeapon: number | undefined;
  let secondEquippedWeapon: number | undefined;

  // 전용 무기: 무기마다 초월 ★·강화 레벨, 1슬롯 히어로가 전용 무기를 꼈는지
  runSection(notes, '전용 무기', () => {
    for (const [weaponId, weapon] of readDictionary(equip.psCharWeaponDic)) {
      if (!exclusiveIds.has(String(weaponId))) {
        notes.push(`계산기에 없는 전용 무기예요 (번호 ${weaponId})`);
        continue;
      }
      values[`exclusiveOwnedStar_${weaponId}`] = String(weapon.trscLv);
      values[`exclusiveOwnedLevel_${weaponId}`] = String(weapon.enhLv);
    }
    equippedWeapon = readDictionary(equip.eqWeaponDic).get(context.slot1HeroId);
    values.exclusiveEquipped = String(equippedWeapon !== undefined && equippedWeapon > EXCLUSIVE_WEAPON_ID_ABOVE);
    // 2슬롯 히어로도 같은 식 (교체했을 때의 DPM 계산용)
    secondEquippedWeapon = readDictionary(equip.eqWeaponDic).get(context.slot2HeroId ?? -1);
    values.exclusiveEquipped2 = String(secondEquippedWeapon !== undefined && secondEquippedWeapon > EXCLUSIVE_WEAPON_ID_ABOVE);
  });

  // 받은 전용 무기 초월 미션: 무기마다 받은 가장 높은 ★, 받은 보상의 공격력 % 를 곱한 합
  runSection(notes, '전용 무기 초월 미션', () => {
    const missionRows = tableRows(tables.ContentMission).filter((row) => received.has(Number(row.missionId)));
    const receivedStar = new Map<string, number>();
    for (const row of missionRows) {
      if (row.missionType !== WEAPON_TRANSCEND_MISSION_TYPE || row.rwdStat !== ATTACK_PERCENT_STAT) continue;
      receivedStar.set(row.groupId, Math.max(receivedStar.get(row.groupId) ?? 0, Number(row.condValue0)));
    }
    for (const weaponId of [...exclusiveIds].sort()) {
      values[`exclusiveMissionReceivedStar_${weaponId}`] = String(receivedStar.get(weaponId) ?? 0);
    }
    const transcendLog = missionRows
      .filter((row) => row.contentType === WEAPON_TRANSCEND_CONTENT_TYPE && row.rwdStat === ATTACK_PERCENT_STAT)
      .reduce((sum, row) => sum + multiplierLogFromPercent(Number(row.rwdStatVal)), 0);
    values.weaponTotalAtk = percentTextFromMultiplierLog(transcendLog);
  });

  // 무기 옵션: 전용 무기마다 (exclusiveOption*_<무기>_<칸> 무기마다 따로). 예전 1슬롯 · 2슬롯 칸은 비운다.
  // SSS 옵션 수 (얼티밋 1020 · 1021) 는 1슬롯 · 2슬롯 장착 무기 기준 그대로
  runSection(notes, '무기 옵션', () => {
    const weaponOptionDic = readDictionary(equip.psWeaponOptionDic);
    const optionsOf = (weaponId: number | undefined) => {
      const weaponOptions = weaponId === undefined ? undefined : weaponOptionDic.get(weaponId);
      return weaponOptions ? [...readDictionary(weaponOptions).values()][0]?.diceOptions ?? [] : [];
    };
    const sssCount = (weaponId: number | undefined) => {
      // 얼티밋 1020 · 1021: 전용 무기 (번호 ≥ 1000) 옵션 중 등급 번호 > 6 (SSS 이상) 개수 (게임 코드 m2690, sss-grade-count-2026-11-01.md)
      const isExclusive = weaponId !== undefined && weaponId >= SSS_OPTION.EXCLUSIVE_WEAPON_MIN_ID;
      return String(isExclusive ? optionsOf(weaponId).filter((option) => option.grade > SSS_OPTION.GRADE_ABOVE).length : 0);
    };
    const [firstSssField, secondSssField] = CONSTS.dpm.SWAP.SSS_OPTION_COUNT_FIELDS;
    values[firstSssField] = sssCount(equippedWeapon);
    values[secondSssField] = sssCount(secondEquippedWeapon);
    for (const [firstPrefix, secondPrefix] of CONSTS.dpm.SWAP.OPTION_FIELD_PAIRS) {
      for (let index = 1; index <= CONSTS.dpm.SWAP.OPTION_ROWS; index++) {
        values[`${firstPrefix}${index}`] = '';
        values[`${secondPrefix}${index}`] = '';
      }
    }
    for (const weaponId of weaponOptionDic.keys()) {
      if (weaponId < SSS_OPTION.EXCLUSIVE_WEAPON_MIN_ID) continue;
      const id = String(weaponId);
      for (let index = 1; index <= CONSTS.heroWeaponCardPet.weapon.OPTION_ROWS; index++) {
        values[exclusiveOptionStatField(id, index)] = '';
        values[exclusiveOptionValueField(id, index)] = '';
      }
      optionsOf(weaponId).forEach((option, index) => {
        values[exclusiveOptionStatField(id, index + 1)] = option.statType;
        const value = diceValue(diceRows, WEAPON_DICE_ID, option);
        if (value === undefined) notes.push(`무기 옵션 값을 찾지 못했어요 (${option.statType})`);
        else values[exclusiveOptionValueField(id, index + 1)] = String(value);
      });
    }
  });

  // 일반 무기 강화 레벨
  runSection(notes, '일반 무기', () => {
    const jobWeaponIds = new Set(tableRows(tables.WeaponJob).map((row) => row.weaponId));
    for (const entry of readDictionary(equip.psJobWeaponDic).values()) {
      if (jobWeaponIds.has(String(entry.weaponId))) values[`normalWeaponLevel_${entry.weaponId}`] = String(entry.enhLv);
    }
  });

  // 무기 링크: 직업별 레벨, 초월
  runSection(notes, '무기 링크', () => {
    for (const [key, level] of readDictionary(equip.weaponLinkData.symbolLvDic)) {
      values[`weaponLink_${WEAPON_LINK_JOBS[key - 1]}Level`] = String(level);
    }
    values.weaponLinkStar = String(equip.weaponLinkData.transcendLv);
  });

  // 펫: 보유 펫 등급_별, 쓰는 프리셋의 슬롯·리더·옵션
  runSection(notes, '펫', () => {
    const petRows = groupBy(tableRows(tables.Pet), (row) => row.petId);
    for (const [petId, pet] of readDictionary(equip.petDataDic)) {
      const row = petRows.get(String(petId))?.[pet.lv];
      if (row) values[`pet_${petId}`] = `${row.grade}_${row.star}`;
      else notes.push(`계산기에 없는 펫이에요 (번호 ${petId}, ${pet.lv}단계)`);
    }
    const petPreset = readDictionary(equip.equipPetDataDic).get(context.presetKey);
    const petOptions = readDictionary(equip.petOptionDic);
    petPreset?.slotList.forEach((entry, index) => {
      const slot = index + 1;
      values[`petSlot${slot}`] = String(entry.petId);
      if (entry.petId === petPreset.leaderId) values.petLeader = String(slot);
      const byOption = petOptions.get(entry.petId);
      const options = byOption ? readDictionary(byOption).get(entry.optionId)?.diceOptions ?? [] : [];
      options.forEach((option, optionIndex) => {
        const number = optionIndex + 1;
        values[`petOption${slot}_${number}Stat`] = option.statType;
        const value = diceValue(diceRows, String(option.diceId), option);
        if (value === undefined) notes.push(`펫 옵션 값을 찾지 못했어요 (펫 ${entry.petId}, ${option.statType})`);
        else values[`petOption${slot}_${number}Value`] = String(value);
      });
    });
  });

  return { values, notes };
}
