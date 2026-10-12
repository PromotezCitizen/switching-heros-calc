/**
 * 무기 (기존 stat-calc-sources.js buildWeapon / normalWeaponPossessEffect / renderWeapon) + 전용 무기
 * (stat-calc-core.js weaponEffect, stat-calc.html weaponTranscendLines / calcTabGroups 의 전용 무기 묶음) → 효과 줄
 */
import { CONSTS } from '../../../CONSTS';
import type { StatTables, TableRow } from '../../../data/statTables';
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import { slotHeroName } from '../hero/character';
import { exclusiveWeapons, ownedExclusiveLevel, ownedExclusiveStar } from '../hero/roster';
import { exclusiveMissionReceivedStarField, exclusiveOwnedStarField } from '../hero/rosterFields';
import { integerFieldValue } from '../trainingRelic/fieldNumbers';
import {
  RELIC_MAX_GRADE_FIELD,
  RELIC_TABLE,
  relicGradeAllowed,
  relicGrades,
  normalWeaponLevel,
  relicLevelFieldId,
  relicRows,
  relicValue,
} from '../trainingRelic/relic';
import { heroByName, numberValue, rowsOf, screenLog, unique, type SourceLabel } from './shared';

const { JOBS } = CONSTS.heroWeaponCardPet;
const {
  OPTION_ROWS,
  OPTION_UNLOCK_LEVELS,
  MIN_EXCLUSIVE_LEVEL,
  PERCENT_LOG_OFFSET,
  TRANSCEND_STATS,
  TRANSCEND_MISSION,
  EQUIP_WEAPON_RELIC_STAT_PREFIX,
  EQUIP_WEAPON_RELIC_STAT_SUFFIX,
} = CONSTS.heroWeaponCardPet.weapon;
const PERCENT_DIVISOR = CONSTS.common.PERCENT_DIVISOR;

export const HERO_NAME_FIELD = 'charName';
export const EXCLUSIVE_STAR_FIELD = 'weaponStar';
export const EXCLUSIVE_LEVEL_FIELD = 'weaponLevel';
/** 1슬롯 히어로가 전용 무기를 꼈는지 ('true' = 낌, 그 밖 = 안 낌. 기본 안 낌) */
export const EXCLUSIVE_EQUIPPED_FIELD = 'exclusiveEquipped';
export const LINK_STAR_FIELD = 'weaponLinkStar';
/** 표 WeaponLink 에서 초월 단계 행의 jobType */
const LINK_TRANSCEND_JOB = 'None';
export const NORMAL_EQUIP_FIELD = 'normalWeaponAtk';
export const SOUL_FORGE_FIELD = 'soulForgeLevel';
const SOUL_FORGE_TABLE = 'SoulForge';

export function linkLevelField(job: string): string {
  return `weaponLink_${job}Level`;
}
export function optionStatField(index: number): string {
  return `weaponOptionStat${index}`;
}
export function optionValueField(index: number): string {
  return `weaponOptionValue${index}`;
}

export interface NormalWeaponPossess {
  weaponCount: number;
  stat: string;
  /** 곱한 배율 (log10) */
  multiplierLog: number;
  /** 한 줄의 % 값 (M − 1) × 100 의 log10 */
  percentLog: number;
}

/**
 * 일반 무기 보유 효과 (서버 표 WeaponJob): 무기마다 (보유 기본 + 보유 강화당 × 실제 강화 레벨) % 를 × (1 + v/100) 로 곱함
 * (게임 m6836 @306b564 보유 루프, calc0113.py 391~397). 강화 레벨은 무기 탭의 무기별 칸 값이고, 칸이 비어 있으면 최대 레벨
 * ("전부 만렙" 가정, 사용자 결정). 곱한 배율 M 을 한 줄의 % 값 (M − 1) × 100 으로 바꿔 넣는다
 */
export function normalWeaponPossessEffect(tables: StatTables, values: CalcValues = {}): NormalWeaponPossess | null {
  const rows = rowsOf(tables, 'WeaponJob');
  if (!rows.length) return null;
  const multiplierLog = rows.reduce((sum, row) => {
    const percent = Number(row.possAbilVal1) + Number(row.possAbilEnh1) * normalWeaponLevel(values, row);
    return sum + Math.log10(1 + percent / PERCENT_DIVISOR);
  }, 0);
  return {
    weaponCount: rows.length,
    stat: rows[0].possAbil1,
    multiplierLog,
    percentLog: Math.log10(Math.pow(10, multiplierLog) - 1) + PERCENT_LOG_OFFSET,
  };
}

export interface WeaponTotalAtk {
  /** 곱한 보상 미션 수 */
  missionCount: number;
  /** 한 줄의 % 값 (M − 1) × 100 의 log10 */
  percentLog: number;
}

/**
 * 전용 무기 하나에서 받은 초월 미션 ★: "받은 초월 미션 ★" 칸 (전용 무기 표) 값, 칸이 비어 있으면 초월 ★ 까지 받은 것으로 친다
 * (게임은 받은 미션 번호 목록 _receivedIds 로 계산 — calc0113.py 323~328)
 */
export function receivedMissionStar(values: CalcValues, weaponId: string): number {
  const received = values[exclusiveMissionReceivedStarField(weaponId)];
  if (received !== undefined && String(received).trim() !== '') return Math.max(Math.floor(Number(received)) || 0, 0);
  return Number(values[exclusiveOwnedStarField(weaponId)]) || 0;
}

/**
 * 무기 누적 능력치 공격력 % (claude-docs/react-port/weapon-total-source.md): 전용 무기마다 초월 미션 (표 ContentMission,
 * missionType WeaponChar_Trans) 중 condValue0 ≤ 받은 초월 미션 ★ (receivedMissionStar) 인 공격력 보상을 (1 + v/100) 로 모두 곱한 배율 M → (M − 1) × 100.
 * 초월 미션 효과는 보유 효과 (게임 도움말 TransMission_Help_0001) 라 장착 여부와 상관없이 전용 무기 표에 넣은 무기 전부.
 * 받은 ★ 가 없으면 받은 보상이 없어 null (줄 없음)
 */
export function weaponTotalAtk(values: CalcValues, tables: StatTables): WeaponTotalAtk | null {
  // 받은 ★ 칸이 비어 있으면 초월 ★ 도달 = 받음으로 가정한다 (몬스터 처치 미션이 밀린 계정은 실제보다 클 수 있어 칸으로 고칠 수 있음)
  const starOfWeapon = new Map(
    exclusiveWeapons(tables).map((weapon) => [weapon.weaponId, receivedMissionStar(values, weapon.weaponId)]),
  );
  let missionCount = 0;
  let multiplierLog = 0;
  for (const row of rowsOf(tables, TRANSCEND_MISSION.TABLE)) {
    const star = starOfWeapon.get(row.groupId) ?? 0;
    if (
      row.missionType === TRANSCEND_MISSION.MISSION_TYPE &&
      row.rwdStat === TRANSCEND_MISSION.REWARD_STAT &&
      Number(row.condValue0) <= star
    ) {
      missionCount++;
      multiplierLog += Math.log10(1 + Number(row.rwdStatVal) / PERCENT_DIVISOR);
    }
  }
  if (!missionCount) return null;
  return { missionCount, percentLog: Math.log10(Math.pow(10, multiplierLog) - 1) + PERCENT_LOG_OFFSET };
}

/** 1슬롯 히어로에게 전용 무기가 있는지 (WeaponChar 표에 그 히어로 행이 있음) */
export function hasExclusiveWeapon(values: CalcValues, tables: StatTables): boolean {
  const hero = heroByName(tables, slotHeroName(values, tables));
  return !!hero && rowsOf(tables, 'WeaponChar').some((row) => row.charId === hero.charId);
}

/**
 * 히어로가 전용 무기를 끼면 일반 무기 장착 효과는 적용되지 않음 (앱 코드: 장착 무기 번호 999 이하만 일반 무기 — 유력).
 * 전용 무기가 있고 "전용 무기 장착" 을 켰을 때만 전용 무기를 쓰는 것으로 본다
 */
export function usesExclusiveWeapon(values: CalcValues, tables: StatTables): boolean {
  return values[EXCLUSIVE_EQUIPPED_FIELD] === 'true' && hasExclusiveWeapon(values, tables);
}

/** 전용 무기 초월 ★ 선택지 (WeaponChar 표의 별, 작은 것부터) */
export function exclusiveStarChoices(tables: StatTables): string[] {
  return unique(rowsOf(tables, 'WeaponChar').map((row) => row.star)).sort((left, right) => Number(left) - Number(right));
}

export interface ExclusiveWeaponEffect {
  percent: number;
  maxLv: number;
  level: number;
}

/**
 * 전용 무기 장착 효과 공격력 % = 기본 + 강화당 × 레벨 (게임 화면 확인: 빙결의 숨결 ★12 +3400 = 390.41F%).
 * 기존 코드 그대로 무기 번호 없이 별 단계로 WeaponChar 첫 행을 고른다 (28종 공통이라고 봄)
 */
export function exclusiveWeaponEffect(tables: StatTables, star: string, level: number): ExclusiveWeaponEffect | null {
  const row = rowsOf(tables, 'WeaponChar').find((record) => record.star === String(star));
  if (!row) return null;
  const maxLv = Number(row.maxLv);
  const clamped = Math.min(Math.max(level, MIN_EXCLUSIVE_LEVEL), maxLv);
  return { percent: Number(row.eqAbilVal1) + Number(row.eqAbilEnh1) * clamped, maxLv, level: clamped };
}

/** 1슬롯 히어로 전용 무기의 초월 ★: 전용 무기 표 (그 무기 줄) 값을 먼저, 없으면 예전 칸 */
export function exclusiveStarOfHero(values: CalcValues, tables: StatTables): string {
  const hero = heroByName(tables, slotHeroName(values, tables));
  return (hero && ownedExclusiveStar(values, tables, hero.charId)) || values[EXCLUSIVE_STAR_FIELD] || '';
}

/** 1슬롯 히어로 전용 무기의 강화 레벨: 전용 무기 표 (그 무기 줄) 값을 먼저, 없으면 예전 칸 */
export function exclusiveLevelOfHero(values: CalcValues, tables: StatTables): string {
  const hero = heroByName(tables, slotHeroName(values, tables));
  return (hero && ownedExclusiveLevel(values, tables, hero.charId)) || values[EXCLUSIVE_LEVEL_FIELD] || '';
}

/**
 * 1슬롯 히어로가 전용 무기 weaponId 를 장착했을 때 그 무기의 초월 ★ (입력 칸 값). 다른 무기이거나 장착 안 했으면 0.
 * 전투 중 초월 효과 (WeaponTranscend statType 10001 이상) 는 장착 + ★ 도달이 둘 다 필요 (게임 m16508, exclusive-weapon-transcend.md 1절)
 */
export function equippedExclusiveStar(values: CalcValues, tables: StatTables, weaponId: string): number {
  if (!usesExclusiveWeapon(values, tables)) return 0;
  const hero = heroByName(tables, slotHeroName(values, tables));
  const weaponRow = rowsOf(tables, 'WeaponChar').find((row) => row.charId === hero?.charId);
  if (weaponRow?.weaponId !== weaponId) return 0;
  return Number(exclusiveStarOfHero(values, tables)) || 0;
}

/** 입력 칸 값으로 전용 무기 장착 효과 (강화 레벨 빈칸 = 1) */
export function exclusiveWeaponEffectFromValues(values: CalcValues, tables: StatTables): ExclusiveWeaponEffect | null {
  return exclusiveWeaponEffect(
    tables,
    exclusiveStarOfHero(values, tables),
    Number(exclusiveLevelOfHero(values, tables)) || MIN_EXCLUSIVE_LEVEL,
  );
}

/**
 * 전용 무기 장착 효과에 곱하는 배수 = 1슬롯 히어로 직업의 유물 `_per_<직업>_EquipWeapon` (유물 45) 마다 (1 + 유물 값 / 100).
 * 그 유물이 없거나 안 가졌으면 1. 근거: 게임 m2680 (gap-atk-increase-provider.md 4-3, 유물 45 Lv40 = 100 → 2배)
 */
export function equipWeaponRelicMultiplier(values: CalcValues, tables: StatTables): number {
  const hero = heroByName(tables, slotHeroName(values, tables));
  if (!hero) return 1;
  const relicStat = `${EQUIP_WEAPON_RELIC_STAT_PREFIX}${hero.job}${EQUIP_WEAPON_RELIC_STAT_SUFFIX}`.toLowerCase();
  if (!tables[RELIC_TABLE]) return 1;
  const grades = relicGrades(tables);
  return relicRows(tables)
    .filter(
      (row) =>
        row.statType.toLowerCase() === relicStat &&
        relicGradeAllowed(grades, row.grade, values[RELIC_MAX_GRADE_FIELD]),
    )
    .reduce((multiplier, row) => {
      const level = Math.min(integerFieldValue(values, relicLevelFieldId(row.relicId)), Number(row.maxLv));
      return level > 0 ? multiplier * (1 + relicValue(row, level) / PERCENT_DIVISOR) : multiplier;
    }, 1);
}

/** 전용 무기 장착 효과 + 초월 공통 효과 (고른 ★ 이하, statType 1~4 만). 장착 효과는 유물 배수 (equipWeaponRelicMultiplier) 를 곱한 값 */
export function exclusiveWeaponLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  const lines: Line[] = [];
  const weaponRows = rowsOf(tables, 'WeaponChar');
  const equipStat = weaponRows[0]?.eqAbil1;
  const effect = exclusiveWeaponEffectFromValues(values, tables);
  if (effect && equipStat && usesExclusiveWeapon(values, tables)) {
    lines.push({
      source: label('calc.weapon.sources.exclusive'),
      stat: equipStat,
      value: effect.percent * equipWeaponRelicMultiplier(values, tables),
    });
  }
  const hero = heroByName(tables, slotHeroName(values, tables));
  if (!hero) return lines;
  const weaponRow = weaponRows.find((row) => row.charId === hero.charId);
  if (!weaponRow) return lines;
  // 초월 스탯 줄은 그 히어로가 전용 무기를 장착했을 때만 (게임 @306b564: 장착 무기 번호 999 이하면 초월 루프 없음, exclusive-weapon-transcend.md 1절)
  if (!usesExclusiveWeapon(values, tables)) return lines;
  const star = Number(exclusiveStarOfHero(values, tables)) || 0;
  for (const row of rowsOf(tables, 'WeaponTranscend')) {
    const stat = TRANSCEND_STATS[row.statType];
    if (row.weaponType === weaponRow.weaponId && Number(row.star) <= star && stat) {
      lines.push({ source: label('calc.weapon.sources.transcend', { star: row.star }), stat, value: Number(row.val1) });
    }
  }
  return lines;
}

/** 웨폰 링크 초월 행 (표 WeaponLink 의 None 행, lv = 초월 ★ — 이 계정 ★1 = lv1 만 화면과 확인) */
function linkTranscendRow(values: CalcValues, tables: StatTables) {
  const star = numberValue(values, LINK_STAR_FIELD);
  return star > 0
    ? rowsOf(tables, 'WeaponLink').find((row) => row.jobType === LINK_TRANSCEND_JOB && Number(row.lv) === star)
    : undefined;
}

/**
 * 웨폰 링크 직업 하나의 화면 값 log10(%) = log10(그 직업 행의 레벨 값 × (1 + 초월 강화 % / 100)).
 * 같은 레벨이라도 직업 행마다 저장된 값이 다르므로 (예: 192 검사 81,820 / 격투가 81,800) 직업 행을 따로 읽는다.
 * 레벨이 비었거나 표에 없으면 null
 */
export function weaponLinkLog(values: CalcValues, tables: StatTables, job: string): number | null {
  const level = numberValue(values, linkLevelField(job));
  if (level <= 0) return null;
  const jobRow = rowsOf(tables, 'WeaponLink').find((row) => row.jobType === job && Number(row.lv) === level);
  if (!jobRow) return null;
  const transcendRow = linkTranscendRow(values, tables);
  const multiplier = 1 + (transcendRow ? Number(transcendRow.statVal1) : 0) / PERCENT_DIVISOR;
  return Math.log10(Number(jobRow.statVal1) * multiplier);
}

/** 무기 탭 (웨폰 링크·누적 능력치·일반 무기·무기 옵션). 소울포지는 탭 따로 (soulForgeLines) */
export function weaponTabLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  const lines: Line[] = [];
  for (const job of JOBS) {
    const log = weaponLinkLog(values, tables, job);
    if (log !== null) {
      lines.push({
        source: label('calc.weapon.sources.link', { job: label(`calc.weapon.jobs.${job}`) }),
        stat: `_per_${job}_AttackDamage`,
        log,
      });
    }
  }
  // 초월 행의 "공격력 N% 증가" (화면 문구). 직업 값과 따로 전체 공격력에 들어가는지는 확인 못 함 (전에는 화면 값 칸으로 넣던 줄)
  const transcendRow = linkTranscendRow(values, tables);
  if (transcendRow && Number(transcendRow.statVal2) > 0) {
    lines.push({ source: label('calc.weapon.sources.linkStar'), stat: transcendRow.statType2, value: Number(transcendRow.statVal2) });
  }
  const totalAtk = weaponTotalAtk(values, tables);
  if (totalAtk) lines.push({ source: label('calc.weapon.sources.total'), stat: TRANSCEND_MISSION.REWARD_STAT, log: totalAtk.percentLog });
  const equipLog = screenLog(values, NORMAL_EQUIP_FIELD);
  if (equipLog !== null && !usesExclusiveWeapon(values, tables)) {
    lines.push({ source: label('calc.weapon.sources.normalEquip'), stat: '_per_attackDamage', log: equipLog });
  }
  const possess = normalWeaponPossessEffect(tables, values);
  if (possess) {
    lines.push({
      source: label('calc.weapon.sources.possess', { count: possess.weaponCount }),
      stat: possess.stat,
      log: possess.percentLog,
    });
  }
  const openSlots = openOptionSlots(values, tables);
  for (let index = 1; index <= openSlots; index++) {
    const stat = values[optionStatField(index)];
    const log = screenLog(values, optionValueField(index));
    if (stat && log !== null) lines.push({ source: label('calc.weapon.sources.option', { index }), stat, log });
  }
  return lines;
}

/**
 * 열린 무기 옵션 칸 수: 옵션은 전용 무기에 붙으므로 1슬롯 히어로가 전용 무기를 꼈을 때만,
 * 그 무기 강화 레벨이 칸마다 정해진 레벨 (앱 상수 weapon_dice_slot_lock) 이상인 칸까지
 */
export function openOptionSlots(values: CalcValues, tables: StatTables): number {
  if (!usesExclusiveWeapon(values, tables)) return 0;
  const level = Number(exclusiveLevelOfHero(values, tables)) || MIN_EXCLUSIVE_LEVEL;
  return Math.min(OPTION_UNLOCK_LEVELS.filter((unlockLevel) => level >= unlockLevel).length, OPTION_ROWS);
}

/** 소울포지 슬롯 하나가 켜졌는지 넣는 칸 (슬롯 번호 statIdx 마다, 'true' = 활성. 게임 저장의 slotDataDic 에 있고 활성 횟수가 1 이상) */
export function soulForgeSlotField(statIdx: string): string {
  return `soulForgeSlot_${statIdx}`;
}

/** 소울포지 한 레벨의 표 행 (표 순서 그대로: 첫 행 = 기본 행 statIdx 비어 있음, 그 뒤 = 슬롯 행) */
export function soulForgeLevelRows(tables: StatTables, level: number) {
  return rowsOf(tables, SOUL_FORGE_TABLE).filter((row) => Number(row.lv) === level);
}

/** 슬롯 행인가 (statIdx 가 1 이상) */
function isSoulForgeSlotRow(row: TableRow): boolean {
  return Number(row.statIdx) >= 1;
}

/**
 * 소울포지 (탭 따로): 게임 m6913 @3077214 (모드 0, stat-provider-formulas.md 3-20절 — 흐름 확정 · 열 이름 대응 유력).
 * (가) 레벨 1 ~ 현재 − 1 (낮은 레벨은 슬롯 상관없이 전부): 그 레벨 마지막 행의 bonusValue = d9. 기본 행은 statValue 그대로,
 *      슬롯 행은 d9 × statValue 를 각각 줄로.
 * (나) 현재 레벨: 목록이 기본 행 + 슬롯 행 1개 이상일 때만. 켜진 슬롯 수 k 를 세고, 켜진 슬롯 행마다
 *      statValue × (k >= 1 이면 목록[k] 의 bonusValue, 아니면 1). 현재 레벨의 기본 행은 넣지 않음 (다음 레벨이 되면 (가) 에서 들어감).
 * 레벨이 비었으면 줄 없음. 슬롯은 레벨 칸 아래 "슬롯 켜짐" 칸 (기본 꺼짐) 에서 켠다
 */
export function soulForgeLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  const lines: Line[] = [];
  const soulForgeLevel = numberValue(values, SOUL_FORGE_FIELD);
  for (let level = 1; level < soulForgeLevel; level++) {
    const rows = soulForgeLevelRows(tables, level);
    if (!rows.length) continue;
    const lastBonus = Number(rows[rows.length - 1].bonusValue) || 0;
    for (const row of rows) {
      const value = isSoulForgeSlotRow(row) ? lastBonus * Number(row.statValue) : Number(row.statValue);
      if (row.statType && value) lines.push({ source: label('calc.weapon.sources.soulForge', { level }), stat: row.statType, value });
    }
  }
  const currentRows = soulForgeLevelRows(tables, soulForgeLevel);
  if (soulForgeLevel >= 1 && currentRows.length >= 2) {
    const slotRows = currentRows.slice(1);
    const activeRows = slotRows.filter((row) => values[soulForgeSlotField(row.statIdx)] === 'true');
    const activeCount = activeRows.length;
    const multiplier = activeCount >= 1 ? Number(currentRows[activeCount].bonusValue) || 1 : 1;
    for (const row of activeRows) {
      const value = Number(row.statValue) * multiplier;
      if (row.statType && value) {
        lines.push({ source: label('calc.weapon.sources.soulForgeSlot', { level: soulForgeLevel, count: activeCount }), stat: row.statType, value });
      }
    }
  }
  return lines;
}

/** 소울포지 레벨 최대 (표 SoulForge 의 lv 최대) */
export function maxSoulForgeLevel(tables: StatTables): number {
  return rowsOf(tables, 'SoulForge').reduce((max, row) => Math.max(max, Number(row.lv)), 0);
}

/** 무기 탭 줄 + 전용 무기 줄 (기존 HTML 에서는 "무기" 탭과 계산 탭의 "전용 무기" 묶음으로 나뉘어 있었음) */
export function weaponLines(values: CalcValues, tables: StatTables, label: SourceLabel): Line[] {
  return [...weaponTabLines(values, tables, label), ...exclusiveWeaponLines(values, tables, label)];
}
