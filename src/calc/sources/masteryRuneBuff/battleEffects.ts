/**
 * 계산기에 줄이 없던 전투 효과 (claude-docs/react-port/battle-missing-effects-2026-11-01.md, 2026-11-01 사용자 "넣어라"):
 * - 스위칭 부스트 발동 버프 (특성 33 계열) · 과잉 전환 (206): 교체 등장 때 걸린다 → 교체 켜짐 비율 (swapUptimePercent) 을 곱한다
 * - 에이카 전용 무기 ★12 (보스 적중 시 공격력) · ★1 (보스 받는 피해, 무한 체력 보스 제외)
 * 버프 탭 줄이다 (전투 중 몫)
 */
import { CONSTS } from '@/CONSTS';
import type { Line } from '@/calc/combine';
import type { CalcValues } from '@/calc/types';
import type { RawTable, StatTables } from '@/data/statTables';
import { equippedExclusiveStar } from '@/calc/sources/heroWeaponCardPet/weapon';
import { rowsOf } from '@/calc/sources/heroWeaponCardPet/shared';
import type { Chances } from '@/calc/sources/masteryRuneBuff/chances';
import { learnedTraitValue, masteryTraits, plainNumber } from '@/calc/sources/masteryRuneBuff/mastery';
import type { SourceLabel } from '@/calc/sources/masteryRuneBuff/sourceLabel';
import { summaryTarget } from '@/calc/sources/summary/summary';
import { swapCycle } from '@/dpm/swapCycle';

const { STATS, SWAP_UPTIME_FIELD, SWITCHING_BOOST, EXCLUSIVE_BATTLE, MAGIC_GUARD } = CONSTS.masteryRuneBuff;
const { PROBABILITY_MAX, DAMAGE_TARGET_FIELD, AEIKA_WEAPON } = CONSTS.dpm;
const PERCENT = 100;
const BOSS_TARGET = 'boss';

/** 교체 켜짐 비율 (0 ~ 1). 칸이 없거나 0 이면 교체 없음 */
function swapUptime(values: CalcValues): number {
  return Math.min(Math.max(Number(values[SWAP_UPTIME_FIELD]) || 0, 0), PERCENT) / PERCENT;
}

/** 필드에 서 있는 한 번 (교체 간격) 중 지속시간이 덮는 비율 (교체 간격을 모르면 1) */
function stintShare(tables: StatTables, seconds: number): number {
  const stint = swapCycle(tables)?.fullSeconds;
  return stint && stint > 0 ? Math.min(seconds / stint, 1) : 1;
}

/** 스위칭 부스트 발동 버프 · 과잉 전환 줄 */
export function switchingBoostLines(
  values: CalcValues,
  tables: StatTables,
  masteryTable: RawTable,
  chances: Chances,
  sourceLabel: SourceLabel,
): Line[] {
  const uptime = swapUptime(values);
  const chance = chances.switchingBoost ?? 0;
  // 확률 100 미만이면 효과 0 (사용자 결정), 교체가 없으면 발동하지 않는다
  if (!(uptime > 0) || chance < PROBABILITY_MAX) return [];
  const traits = masteryTraits(masteryTable);
  const lines: Line[] = [];
  const addDamage = learnedTraitValue(traits, values, SWITCHING_BOOST.ADD_DAMAGE_STAT);
  const power = addDamage > 0 ? Math.pow(1 + addDamage / PERCENT, Math.floor(chance / SWITCHING_BOOST.POWER_STEP)) : 1;
  const seconds = SWITCHING_BOOST.BASE_SECONDS + learnedTraitValue(traits, values, SWITCHING_BOOST.ADD_DURATION_STAT);
  const share = uptime * stintShare(tables, seconds);
  lines.push({
    source: sourceLabel('calc.buff.battle.switchingBoostSource', { chance: plainNumber(chance), seconds, percent: plainNumber(share * PERCENT) }),
    stat: STATS.ATTACK_PERCENT,
    value: SWITCHING_BOOST.BUFF_PERCENT * power * share,
  });
  const over = learnedTraitValue(traits, values, SWITCHING_BOOST.OVER_STAT);
  if (over > 0 && chance > PROBABILITY_MAX) {
    lines.push({
      source: sourceLabel('calc.buff.battle.switchingOverSource', { chance: plainNumber(chance), percent: plainNumber(uptime * PERCENT) }),
      stat: STATS.ATTACK_PERCENT,
      value: over * uptime,
    });
  }
  return lines;
}

/**
 * 매직 가드 전환율 문턱 · 생성 효과 줄 (312 · 313 · 314, consts MAGIC_GUARD). magicGuardOn = 기본 항 0x105 가 0 이 아님
 * (0 이면 게임 m2137 이 보호막을 만들지 않고 끝나 아무 효과도 없다)
 */
export function magicGuardLines(
  values: CalcValues,
  tables: StatTables,
  masteryTable: RawTable,
  chances: Chances,
  magicGuardOn: boolean,
  sourceLabel: SourceLabel,
): Line[] {
  if (!magicGuardOn) return [];
  const traits = masteryTraits(masteryTable);
  const lines: Line[] = [];
  const rate = chances[MAGIC_GUARD.CHANCE] ?? 0;
  if (rate > MAGIC_GUARD.OVER_THRESHOLD) {
    const over = learnedTraitValue(traits, values, MAGIC_GUARD.OVER_DAMAGE_STAT);
    if (over > 0) {
      lines.push({
        source: sourceLabel('calc.buff.battle.magicGuardOverSource', { chance: plainNumber(rate), threshold: MAGIC_GUARD.OVER_THRESHOLD }),
        stat: STATS.ATTACK_PERCENT,
        value: over,
      });
    }
    const steps = Math.floor((rate - MAGIC_GUARD.OVER_THRESHOLD) / MAGIC_GUARD.OVER_STEP);
    const perStep = learnedTraitValue(traits, values, MAGIC_GUARD.OVER_STEP_DAMAGE_STAT);
    if (steps > 0 && perStep > 0) {
      lines.push({
        source: sourceLabel('calc.buff.battle.magicGuardStepSource', { chance: plainNumber(rate), steps }),
        stat: STATS.ATTACK_PERCENT,
        value: perStep * steps,
      });
    }
  }
  // 314 마력 발산: 보호막이 생길 때 5초 (교체 등장마다). 교체가 없으면 넣지 않는다
  const burst = learnedTraitValue(traits, values, MAGIC_GUARD.BURST_DAMAGE_STAT);
  const share = swapUptime(values) * stintShare(tables, MAGIC_GUARD.BURST_SECONDS);
  if (burst > 0 && share > 0) {
    lines.push({
      source: sourceLabel('calc.buff.battle.magicGuardBurstSource', { seconds: MAGIC_GUARD.BURST_SECONDS, percent: plainNumber(share * PERCENT) }),
      stat: STATS.ATTACK_PERCENT,
      value: burst * share,
    });
  }
  return lines;
}

function transcendRow(tables: StatTables, statType: string) {
  return rowsOf(tables, 'WeaponTranscend').find((row) => row.weaponType === EXCLUSIVE_BATTLE.WEAPON_ID && row.statType === statType);
}

/** 에이카 전용 무기 ★12 · ★1 전투 줄 (1슬롯 = 필드 히어로가 에이카 무기를 꼈을 때) */
export function exclusiveBattleLines(values: CalcValues, tables: StatTables, sourceLabel: SourceLabel): Line[] {
  const star = equippedExclusiveStar(values, tables, EXCLUSIVE_BATTLE.WEAPON_ID);
  const uptime = swapUptime(values);
  if (!(star > 0) || !(uptime > 0)) return [];
  const lines: Line[] = [];
  // ★12: 보스 대상일 때 공격력 % (교체 스킬이 맞히는 동안, 필드에 있는 동안으로 봄)
  const bossHit = transcendRow(tables, EXCLUSIVE_BATTLE.BOSS_HIT_STAT_TYPE);
  if (star >= EXCLUSIVE_BATTLE.BOSS_HIT_STAR && bossHit && summaryTarget(values) === BOSS_TARGET) {
    lines.push({
      source: sourceLabel('calc.buff.battle.exclusiveBossHitSource', { star: EXCLUSIVE_BATTLE.BOSS_HIT_STAR }),
      stat: STATS.ATTACK_PERCENT,
      value: Number(bossHit.val2) * uptime,
    });
  }
  // ★1: 받는 피해 % (val3) 를 val2 초 — 체력이 유한한 보스 대상 (스테이지 보스 · 속성 던전 보스) 만
  const taken = transcendRow(tables, EXCLUSIVE_BATTLE.TAKEN_DAMAGE_STAT_TYPE);
  if (star >= EXCLUSIVE_BATTLE.TAKEN_DAMAGE_STAR && taken && AEIKA_WEAPON.CURRENT_HP_TARGETS.includes(values[DAMAGE_TARGET_FIELD] ?? '')) {
    const share = uptime * stintShare(tables, Number(taken.val2) || 0);
    lines.push({
      source: sourceLabel('calc.buff.battle.exclusiveTakenSource', { star: EXCLUSIVE_BATTLE.TAKEN_DAMAGE_STAR, percent: plainNumber(share * PERCENT) }),
      stat: EXCLUSIVE_BATTLE.BOSS_DAMAGE_STAT,
      value: (Number(taken.val3) || 0) * share,
    });
  }
  return lines;
}
