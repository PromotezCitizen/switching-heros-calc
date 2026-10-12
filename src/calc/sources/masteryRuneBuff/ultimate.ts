/**
 * 얼티밋 특성 줄: "_pow_스탯_장착 펫 속성 수 / 편성 히어로 성별·속성 수 / 장착 스킬 종류 수" = × 값^개수,
 * "_per_스탯_HaveCostumeCnt" = 값 × 보유 코스튬 수, "_per_스탯_던전 기록" = 값 × 클리어 단계,
 * "_per_스탯_TargetUnit*" = 1슬롯 히어로 전투 특화가 같을 때 그 스탯, 개수 조건이 없는 "_per_스탯" = 그 스탯 줄.
 * 확률 150%·200% 초과 얼티밋은 버프 탭 (chances.ts chanceUltimateLines) 이 만든다.
 * 아티팩트 유니크 옵션 수·스킬 문양 수 등 개수나 조건을 모르는 얼티밋은 줄 대신 이름만 돌려준다.
 * 기존 stat-calc.html equippedPetCounts·ultimateLines (755~785), renderEquipCounts 개수 부분 (404~429).
 */
import { CONSTS } from '../../../CONSTS';
import { tableRows, type RawTable, type StatTables } from '../../../data/statTables';
import { heroFirstRow, slotHeroName } from '../hero/character';
import { integerFieldValue } from '../trainingRelic/fieldNumbers';
import { relicLinkFieldId } from '../trainingRelic/relic';
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import { multiplierPercentLog } from './buff';
import { masteryLevel, masteryTraits, traitName, traitValue } from './mastery';
import type { SourceLabel } from './sourceLabel';

const {
  ULTIMATE_PET_COUNT_KEYS,
  ULTIMATE_HERO_ATTRIBUTE_COUNT_KEYS,
  ULTIMATE_SKILL_COUNT_KEYS,
  ULTIMATE_DUNGEON_RECORD_KEYS,
  ULTIMATE_TARGET_UNIT_KEYS,
  CHANCE_ULTIMATES,
  ULTIMATE_HIDDEN_COUNT_STATS,
  COSTUME_COUNT_KEY,
  COSTUME_COUNT_FIELD,
  PET_SLOT_FIELD_PREFIX,
  HERO_FIELDS,
} = CONSTS.masteryRuneBuff;
const PET_SLOTS = CONSTS.heroWeaponCardPet.pet.SLOTS;
/** _pow_ / _per_ + 스탯 (밑줄 없는 한 단어) + 개수·조건 꼬리말 (없으면 개수 조건 없는 단순 스탯) */
const ULTIMATE_STAT_PATTERN = /^_(pow|per)_([A-Za-z]+)(?:_(\w+))?$/;
/** 얼티밋 "남자/여자 히어로 1명마다" 의 수 이름 → Character 표 gender 값 */
const ULTIMATE_GENDER_COUNT_KEYS: Record<string, string> = { EqMaleHeroCnt: '1', EqFemaleHeroCnt: '2' };
const SAME_GENDER_KEY = 'EqSameGenderHero';
const DIFFERENT_GENDER_KEY = 'EqDiffGenderHero';
const GENDER_PAIR_PATTERN = new RegExp(`^_per_(\\w+?)_(${SAME_GENDER_KEY}|${DIFFERENT_GENDER_KEY})$`);
const SAME_ATTRIBUTE_KEY = 'EqSameAttHero';
const DIFFERENT_ATTRIBUTE_KEY = 'EqDiffAttHero';
const ATTRIBUTE_PAIR_PATTERN = new RegExp(`^_per_(\\w+?)_(${SAME_ATTRIBUTE_KEY}|${DIFFERENT_ATTRIBUTE_KEY})$`);

const petAttributeCache = new WeakMap<RawTable, Map<string, string>>();

/** 펫 번호 → 속성 (같은 번호가 여러 행이면 나중 행, 기존과 같음) */
function petAttributes(petTable: RawTable): Map<string, string> {
  let attributes = petAttributeCache.get(petTable);
  if (!attributes) {
    attributes = new Map(tableRows(petTable).map((row) => [row.petId, row.attribute]));
    petAttributeCache.set(petTable, attributes);
  }
  return attributes;
}

/**
 * 펫 탭의 장착 펫 칸 (petSlot<번호>) 값을 칸 번호 순으로.
 * 칸 이름 목록 전체를 훑지 않고 칸 번호로 하나씩 읽는다 (읽은 칸만 구독하도록)
 */
export function equippedPetIds(values: CalcValues): string[] {
  const petIds: string[] = [];
  for (let slot = 1; slot <= PET_SLOTS; slot += 1) {
    const petId = values[PET_SLOT_FIELD_PREFIX + slot];
    if (petId !== undefined) petIds.push(petId);
  }
  return petIds;
}

/** 장착 펫 id 목록 → 속성별 수 (표에 없는 id 는 건너뜀) */
export function equippedPetCounts(petIds: readonly string[], petTable: RawTable): Record<string, number> {
  const attributes = petAttributes(petTable);
  const counts: Record<string, number> = {};
  for (const petId of petIds) {
    const attribute = attributes.get(petId);
    if (attribute !== undefined) counts[attribute] = (counts[attribute] ?? 0) + 1;
  }
  return counts;
}

/** 보유 코스튬 수 (음수·숫자 아님은 0) */
export function costumeCount(values: CalcValues): number {
  return Math.max(Number(values[COSTUME_COUNT_FIELD]) || 0, 0);
}

export interface UltimateResult {
  lines: Line[];
  /** 개수 대응을 몰라 줄을 만들지 않은 얼티밋 특성 이름 */
  skipped: string[];
}

/**
 * 1·2슬롯 히어로의 성별 번호 (Character 표 gender, 1 = 남 · 2 = 여, 앱 코드 확인). 비었거나 히어로 표에서 보유가 아닌 슬롯은 뺀다
 */
export function formationHeroGenders(values: CalcValues, tables: StatTables): string[] {
  return HERO_FIELDS.map((field) => heroFirstRow(tables, slotHeroName(values, tables, field))?.gender).filter(
    (gender): gender is string => !!gender,
  );
}

/** 1·2슬롯 히어로의 속성 (Character 표 attribute). 비었거나 히어로 표에서 보유가 아닌 슬롯은 뺀다 */
export function formationHeroAttributes(values: CalcValues, tables: StatTables): string[] {
  return HERO_FIELDS.map((field) => heroFirstRow(tables, slotHeroName(values, tables, field))?.attribute).filter(
    (attribute): attribute is string => !!attribute,
  );
}

/** 1·2슬롯 두 히어로가 다 있을 때 값이 같은지 / 다른지 (한 명이면 둘 다 아님) */
export function formationPair(formationValues: readonly string[]): { same: boolean; different: boolean } {
  const full = formationValues.length === HERO_FIELDS.length;
  const same = full && formationValues.every((value) => value === formationValues[0]);
  return { same, different: full && !same };
}

/** 1슬롯 히어로의 전투 특화 (Character 표 targetUnit: Boss / Normal / Hero). 비었으면 undefined */
export function slotHeroTargetUnit(values: CalcValues, tables: StatTables): string | undefined {
  return heroFirstRow(tables, slotHeroName(values, tables, HERO_FIELDS[0]))?.targetUnit || undefined;
}

/** 줄을 만들 때 다른 탭에서 가져오는 개수·조건 */
export interface UltimateContext {
  /** 스킬 탭 장착 5칸의 skillType 별 수 (equippedSkillTypeCounts) */
  skillTypeCounts?: Record<string, number>;
  /** 1슬롯 히어로의 전투 특화 (slotHeroTargetUnit) */
  targetUnit?: string;
}

/**
 * 스탯 이름만 보고 계산할 수 있는 얼티밋인지 (개수·조건 값과 상관없음).
 * 확률 문턱 얼티밋 (CHANCE_ULTIMATES) 은 다른 탭 줄로 확률을 계산하는 버프 탭이 줄을 만든다
 */
export function ultimateComputable(statName: string): boolean {
  if (CHANCE_ULTIMATES[statName]) return true;
  if (GENDER_PAIR_PATTERN.test(statName) || ATTRIBUTE_PAIR_PATTERN.test(statName)) return true;
  const match = ULTIMATE_STAT_PATTERN.exec(statName);
  if (!match) return false;
  const [, kind, , countKey] = match;
  // 개수 조건이 없는 단순 스탯 (예: 전용 스킬 데미지 n% 증가). 이름에 개수가 안 붙었지만 개수를 곱하는 것은 제외
  if (!countKey) return kind === 'per' && !ULTIMATE_HIDDEN_COUNT_STATS.includes(statName);
  if (kind === 'pow') {
    return Boolean(
      ULTIMATE_HERO_ATTRIBUTE_COUNT_KEYS[countKey] ||
        ULTIMATE_GENDER_COUNT_KEYS[countKey] ||
        ULTIMATE_PET_COUNT_KEYS[countKey] ||
        ULTIMATE_SKILL_COUNT_KEYS[countKey],
    );
  }
  return countKey === COSTUME_COUNT_KEY || Boolean(ULTIMATE_DUNGEON_RECORD_KEYS[countKey] || ULTIMATE_TARGET_UNIT_KEYS[countKey]);
}

/** 켠 얼티밋 중 계산하지 못하는 것의 이름 (특성 레벨 칸만 읽는다) */
export function skippedUltimateNames(values: CalcValues, masteryTable: RawTable, sourceLabel: SourceLabel): string[] {
  return masteryTraits(masteryTable)
    .filter((trait) => trait.ultimate && masteryLevel(values, trait) > 0 && !ultimateComputable(trait.statName))
    .map((trait) => traitName(trait, sourceLabel));
}

export function ultimateLines(
  values: CalcValues,
  masteryTable: RawTable,
  petTable: RawTable,
  petIds: readonly string[],
  sourceLabel: SourceLabel,
  heroGenders: readonly string[] = [],
  heroAttributes: readonly string[] = [],
  context: UltimateContext = {},
): UltimateResult {
  const result: UltimateResult = { lines: [], skipped: [] };
  const petCounts = equippedPetCounts(petIds, petTable);
  const costumes = costumeCount(values);
  const genderPair = formationPair(heroGenders);
  const attributePair = formationPair(heroAttributes);
  const skillTypeCounts = context.skillTypeCounts ?? {};
  for (const trait of masteryTraits(masteryTable)) {
    if (!trait.ultimate) continue;
    const level = masteryLevel(values, trait);
    if (!(level > 0)) continue;
    const name = traitName(trait, sourceLabel);
    // 조건 모양이 아니거나 개수를 모르는 얼티밋은 계산하지 못한다
    if (!ultimateComputable(trait.statName)) {
      result.skipped.push(name);
      continue;
    }
    // 확률 문턱 얼티밋은 버프 탭 줄 (chanceUltimateLines)
    if (CHANCE_ULTIMATES[trait.statName]) continue;
    const value = traitValue(trait, level);
    // 같은 / 다른 성별·속성 히어로 장착 시 스킬 데미지: 1·2슬롯 두 히어로를 비교 (두 명 다 있을 때만)
    const pairMatch = GENDER_PAIR_PATTERN.exec(trait.statName) ?? ATTRIBUTE_PAIR_PATTERN.exec(trait.statName);
    if (pairMatch) {
      const [, stat, pairKey] = pairMatch;
      const applies =
        (pairKey === SAME_GENDER_KEY && genderPair.same) ||
        (pairKey === DIFFERENT_GENDER_KEY && genderPair.different) ||
        (pairKey === SAME_ATTRIBUTE_KEY && attributePair.same) ||
        (pairKey === DIFFERENT_ATTRIBUTE_KEY && attributePair.different);
      if (applies) result.lines.push({ source: name, stat: `_per_${stat}`, value });
      continue;
    }
    const [, kind, target, countKey] = ULTIMATE_STAT_PATTERN.exec(trait.statName) as RegExpExecArray;
    const stat = `_per_${target}`;
    if (!countKey) {
      result.lines.push({ source: name, stat: trait.statName, value });
    } else if (kind === 'pow') {
      // × 값^개수: 불·물·땅 / 남자·여자 히어로 (편성 = 1·2슬롯), 장착 펫 속성, 장착 스킬 종류
      let count: number;
      let labelKey = 'calc.ultimate.heroSource';
      if (ULTIMATE_HERO_ATTRIBUTE_COUNT_KEYS[countKey]) {
        count = heroAttributes.filter((attribute) => attribute === ULTIMATE_HERO_ATTRIBUTE_COUNT_KEYS[countKey]).length;
      } else if (ULTIMATE_GENDER_COUNT_KEYS[countKey]) {
        count = heroGenders.filter((gender) => gender === ULTIMATE_GENDER_COUNT_KEYS[countKey]).length;
      } else if (ULTIMATE_PET_COUNT_KEYS[countKey]) {
        count = petCounts[ULTIMATE_PET_COUNT_KEYS[countKey]] ?? 0;
        labelKey = 'calc.ultimate.petSource';
      } else {
        count = skillTypeCounts[ULTIMATE_SKILL_COUNT_KEYS[countKey]] ?? 0;
        labelKey = 'calc.ultimate.skillSource';
      }
      if (count) {
        result.lines.push({
          source: sourceLabel(labelKey, { name, value, count }),
          stat,
          log: multiplierPercentLog(count * Math.log10(value)),
        });
      }
    } else if (countKey === COSTUME_COUNT_KEY) {
      if (costumes) {
        result.lines.push({
          source: sourceLabel('calc.ultimate.costumeSource', { name, count: costumes }),
          stat,
          value: value * costumes,
        });
      }
    } else if (ULTIMATE_DUNGEON_RECORD_KEYS[countKey]) {
      // 던전 클리어 단계 × 값 % (유물 연동 칸의 던전 기록)
      const record = integerFieldValue(values, relicLinkFieldId(ULTIMATE_DUNGEON_RECORD_KEYS[countKey]));
      if (record) {
        result.lines.push({
          source: sourceLabel('calc.ultimate.dungeonSource', { name, count: record }),
          stat,
          value: value * record,
        });
      }
    } else if (context.targetUnit === ULTIMATE_TARGET_UNIT_KEYS[countKey]) {
      // 전투 특화 히어로 스탯: 계산하는 히어로 (1슬롯) 의 전투 특화가 같을 때만
      result.lines.push({ source: sourceLabel('calc.ultimate.targetUnitSource', { name }), stat, value });
    }
  }
  return result;
}

export interface UltimateCounts {
  /** 장착 펫 속성 → 수 (펫 칸 순서대로 처음 나온 순) */
  petAttributes: Record<string, number>;
  /** 1·2슬롯 히어로의 성별 번호 → 수 */
  heroGenders: Record<string, number>;
  /** 1·2슬롯 히어로의 속성 → 수 */
  heroAttributes: Record<string, number>;
}

/** 얼티밋 특성 개수 안내 (참고용, 앱 코드상 화면 증가 % 에 이미 포함). 히어로는 이름으로 캐릭터 표 첫 행을 찾음 */
export function ultimateCounts(values: CalcValues, petTable: RawTable, characterTable: RawTable): UltimateCounts {
  const counts: UltimateCounts = {
    petAttributes: equippedPetCounts(equippedPetIds(values), petTable),
    heroGenders: {},
    heroAttributes: {},
  };
  const characters = tableRows(characterTable);
  for (const field of HERO_FIELDS) {
    const name = (values[field] ?? '').trim();
    const hero = characters.find((row) => row.name === name);
    if (!hero) continue;
    counts.heroGenders[hero.gender] = (counts.heroGenders[hero.gender] ?? 0) + 1;
    counts.heroAttributes[hero.attribute] = (counts.heroAttributes[hero.attribute] ?? 0) + 1;
  }
  return counts;
}
