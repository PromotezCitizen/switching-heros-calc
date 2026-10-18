/**
 * 저장 데이터 (Char + Default 의 프리셋 번호) → 히어로·수집 입력 칸 값.
 * 식별 정보 (_uid 등) 는 읽지 않는다. 읽는 키는 CharSave · DefaultPreset 에 적은 것뿐.
 */
import { CONSTS } from '@/CONSTS';
import { tableRows, type StatTables, type TableRow } from '@/data/statTables';
import { groupBy, readDictionary, runSection, type SaveDictionary, type SaveImportResult } from '@/usb/saveImport/saveDictionary';
import { multiplierLogFromPercent, percentTextFromMultiplierLog } from '@/usb/saveImport/saveText';

const { LIBRARY_DICE_ID, LIBRARY_OPTION_KEY, PET_REGION_ATTRIBUTES } = CONSTS.usb;

interface LibraryOption {
  statType: string;
  grade: string;
  unitLv: number;
}

export interface CharSave {
  _presetDic: SaveDictionary<number, { slot1: number; slot2: number }>;
  charList: { id: number; gradeLv: number; awakeLv: number }[];
  affinityExpDic: SaveDictionary<number, number>;
  _libraryData: {
    _subLvDic: SaveDictionary<string, number>;
    _optionDic: SaveDictionary<number, { list: LibraryOption[] }>;
  };
  diaryData: { tabIdx: number; levelBySlotId: SaveDictionary<number, number> };
  heroMineData: { lv: number; eqList: number[] };
  _cosDic: SaveDictionary<number, { lv: number }>;
  iconIdList: number[];
  petRegionData: { regions: { attIdx?: number; lv: number }[] };
}


/** 누적 호감도 경험치 → 호감도 레벨 (레벨마다 그 레벨의 exp 를 다 채우면 다음 레벨) */
function affinityLevel(rows: TableRow[], exp: number): number {
  let level = 0;
  let remaining = exp;
  for (const row of rows) {
    const need = Number(row.exp || 0);
    if (!(need > 0 && remaining >= need)) break;
    remaining -= need;
    level = Number(row.lv) + 1;
  }
  return level;
}

export function charValues(char: CharSave, presetKey: number, tables: StatTables): SaveImportResult {
  const values: Record<string, string> = {};
  const notes: string[] = [];

  // 히어로 표: 히어로마다 등급 단계 (gradeLv 1 부터) 순서대로 행이 있다
  const rowsByHero = groupBy(tableRows(tables.Character), (row) => row.charId);
  const heroName = (charId: number) => rowsByHero.get(String(charId))?.[0]?.name ?? '';

  // 쓰는 프리셋의 1·2 슬롯 히어로
  runSection(notes, '히어로 프리셋', () => {
    const preset = readDictionary(char._presetDic).get(presetKey);
    if (!preset) throw new Error(`사용 중인 프리셋(${presetKey})을 찾지 못했어요`);
    values.charName = heroName(preset.slot1);
    values.charName2 = heroName(preset.slot2);
  });

  // 보유 히어로: 등급·별·각성·호감도
  runSection(notes, '보유 히어로', () => {
    const affinityRowsByHero = groupBy(tableRows(tables.CharacterAffinity), (row) => row.charId);
    for (const rows of affinityRowsByHero.values()) rows.sort((left, right) => Number(left.lv) - Number(right.lv));
    const affinityExp = readDictionary(char.affinityExpDic);
    for (const hero of char.charList) {
      const id = String(hero.id);
      const row = rowsByHero.get(id)?.[hero.gradeLv - 1];
      if (!row) {
        notes.push(`계산기에 없는 히어로예요 (번호 ${id})`);
        continue;
      }
      values[`heroOwnedGrade_${id}`] = row.grade;
      values[`heroOwnedStar_${id}`] = row.star;
      if (hero.awakeLv) values[`heroOwnedAwaken_${id}`] = String(hero.awakeLv);
      const level = affinityLevel(affinityRowsByHero.get(id) ?? [], affinityExp.get(hero.id) ?? 0);
      if (level) values[`heroOwnedAffinity_${id}`] = String(level);
    }
  });

  // 히어로의 기록: 직업별 레벨 + 계승 옵션 (주사위 표 값 = 최소 + 단계 × 단위)
  runSection(notes, '히어로의 기록', () => {
    for (const [job, level] of readDictionary(char._libraryData._subLvDic)) {
      values[`library_${job}`] = String(Math.trunc(level));
    }
    const diceRows = tableRows(tables.DiceOption).filter((row) => row.diceId === LIBRARY_DICE_ID);
    const options = readDictionary(char._libraryData._optionDic).get(LIBRARY_OPTION_KEY)?.list ?? [];
    options.forEach((option, index) => {
      const slot = index + 1;
      values[`inheritStat${slot}`] = option.statType;
      const dice = diceRows.find((row) => row.statType === option.statType && row.grade === option.grade);
      if (dice) values[`inheritValue${slot}`] = String(Number(dice.statMin) + Number(dice.statUnit) * option.unitLv);
      else notes.push(`계산기에 없는 전승 능력이에요 (${option.statType} ${option.grade})`);
    });
  });

  // 일기장
  runSection(notes, '일기장', () => {
    values.diaryBook = String(char.diaryData.tabIdx);
    for (const [slot, level] of readDictionary(char.diaryData.levelBySlotId)) values[`diarySlotLevel${slot}`] = String(level);
  });

  // 광산: 레벨, 배치한 히어로들의 각성 합
  runSection(notes, '광산', () => {
    const awakenByHero = new Map(char.charList.map((hero) => [hero.id, hero.awakeLv]));
    values.mineLevel = String(char.heroMineData.lv);
    values.mineAwakenLevel = String(char.heroMineData.eqList.reduce((sum, hero) => sum + (awakenByHero.get(hero) ?? 0), 0));
  });

  // 코스튬: 보유 코스튬 레벨 값을 곱한 공격력 %, 보유 수
  runSection(notes, '코스튬', () => {
    const costumeRows = new Map(tableRows(tables.Costume).map((row) => [`${row.cosId}/${row.lv}`, row]));
    const costumes = readDictionary(char._cosDic);
    let costumeLog = 0;
    for (const [cosId, costume] of costumes) {
      const row = costumeRows.get(`${cosId}/${costume.lv}`);
      if (row) costumeLog += multiplierLogFromPercent(Number(row.statVal));
    }
    values.costumeAtk = percentTextFromMultiplierLog(costumeLog);
    values.costumeCount = String(costumes.size);
  });

  // 프로필 아이콘: 보유 아이콘 값을 곱한 공격력 %
  runSection(notes, '프로필 아이콘', () => {
    const iconRows = new Map(tableRows(tables.Icon).map((row) => [row.iconId, row]));
    const iconLog = char.iconIdList.reduce((sum, iconId) => {
      const row = iconRows.get(String(iconId));
      return row ? sum + multiplierLogFromPercent(Number(row.statValue)) : sum;
    }, 0);
    values.profileIconAtk = percentTextFromMultiplierLog(iconLog);
  });

  // 펫 지역: 속성별 레벨
  runSection(notes, '펫 지역', () => {
    for (const region of char.petRegionData.regions) {
      const attribute = region.attIdx === undefined ? undefined : PET_REGION_ATTRIBUTES[region.attIdx];
      if (attribute) values[`petRegionLevel_${attribute}`] = String(region.lv);
    }
  });

  return { values, notes };
}
