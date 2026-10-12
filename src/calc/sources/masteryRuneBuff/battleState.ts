/**
 * 전투 중 최대 상태 몫 (사용자 결정: 중첩·켜짐은 최대 상태, 입력 칸 없음). 게임 식은 combat0113.py 44~149 (기계어 정리
 * claude-docs/react-port/x10101-1057-gamecode.md 2절, crit-dmg-atkspeed-gamecode.md), 화면 4시점 일치 확인.
 * 두 줄 묶음 모두 버프 탭 줄이다 (전투 밖 프로필 대조에서는 버프 탭을 빼므로 이 몫이 같이 빠진다):
 * - battleStatLines: 공격속도 204·13·9·58, 치명타 확률 309, 치명타 데미지 연쇄 작렬 109 — 합 계열. 확률 계산 (chancesWithBattleState) 이 먼저 읽는다
 * - battleDamageLines: 흘러넘치는 체력 63, 과충전 연타 102, 한계 돌파 108, 초과된 힘 202, 무자비 폭주 307 — 확률이 문턱을 넘어야 하므로
 *   확률 (chances) 을 받아 공격력 % 줄을 만든다
 */
import { CONSTS } from '../../../CONSTS';
import type { RawTable, StatTables } from '../../../data/statTables';
import type { Line } from '../../combine';
import type { CalcValues } from '../../types';
import { chancesFromLines, type Chances } from './chances';
import { learnedTraitValue, masteryTraits, plainNumber } from './mastery';
import type { SourceLabel } from './sourceLabel';

const { STATS, BATTLE, DOUBLE_ATTACK_THRESHOLD } = CONSTS.masteryRuneBuff;
const PERCENT_DIVISOR = CONSTS.common.PERCENT_DIVISOR;

/** 복리 중첩 % = ((1 + 값 / 100) ^ 중첩 − 1) × 100. 예: 값 10, 10중첩 → 159.37 */
export function compoundPercent(value: number, stacks: number = BATTLE.COMPOUND_STACKS): number {
  return (Math.pow(1 + value / PERCENT_DIVISOR, stacks) - 1) * PERCENT_DIVISOR;
}

/**
 * 특성 탭에 넣는 전투 중 최대 상태 줄 (합 계열):
 * - 공격속도: 관통의 맹공 204 (복리 10중첩) + 추진력 13 (고정 +50) + 야성 강화 9 + 우격다짐 58
 * - 치명타 확률: 약점 사냥 309 (복리 10중첩)
 * - 치명타 데미지: 연쇄 작렬 109 (복리 10중첩, 기본 120 에 더하는 합 계열)
 * 특성을 안 찍었으면 줄 없음
 */
export function battleStatLines(values: CalcValues, masteryTable: RawTable, sourceLabel: SourceLabel): Line[] {
  const traits = masteryTraits(masteryTable);
  const lines: Line[] = [];
  const add = (stat: string, value: number, sourceKey: string, params: Record<string, string | number> = {}) => {
    if (value) lines.push({ source: sourceLabel(sourceKey, params), stat, value });
  };
  add(
    STATS.ATTACK_SPEED,
    compoundPercent(learnedTraitValue(traits, values, STATS.SPEAR_ATTACK_SPEED_UP)),
    'calc.buff.battle.spearAttackSpeedSource',
    { stacks: BATTLE.COMPOUND_STACKS },
  );
  // 13 추진력: 표 값은 발동 확률이라 공격속도에는 고정 50 (찍었을 때만)
  add(
    STATS.ATTACK_SPEED,
    learnedTraitValue(traits, values, STATS.DOUBLE_ATTACK_SPEED_UP) ? BATTLE.DOUBLE_ATTACK_SPEED_UP_PERCENT : 0,
    'calc.buff.battle.doubleAttackSpeedSource',
  );
  add(STATS.ATTACK_SPEED, learnedTraitValue(traits, values, STATS.BERSERK_ADD_SPEED), 'calc.buff.battle.berserkSpeedSource');
  add(STATS.ATTACK_SPEED, learnedTraitValue(traits, values, STATS.SMITE_ADD_SPEED), 'calc.buff.battle.smiteSpeedSource');
  add(
    STATS.CRITICAL_RATE,
    compoundPercent(learnedTraitValue(traits, values, STATS.SMITE_CRITICAL_RATE_UP)),
    'calc.buff.battle.smiteCriticalRateSource',
    { stacks: BATTLE.COMPOUND_STACKS },
  );
  add(
    STATS.CRITICAL_DAMAGE_SUM,
    compoundPercent(learnedTraitValue(traits, values, STATS.SUPER_CRITICAL_CHAIN)),
    'calc.buff.battle.superCriticalChainSource',
    { stacks: BATTLE.COMPOUND_STACKS },
  );
  return lines;
}

/**
 * 버프 탭의 확률: 다른 탭 줄 + 전투 중 최대 상태 줄 (공격속도·치명타 확률·치명타 데미지) 로 계산한다.
 * 연타 속도 과열·슈퍼 치명타 꿰뚫기 단계가 전투 중 공격속도·치명타 확률을 먹기 때문이다 (combat0113.py 63~67).
 * 돌려주는 battleLines 는 버프 탭 줄에 그대로 넣는다 (전투 밖 프로필 대조에서 버프 탭을 빼면 이 몫도 같이 빠진다)
 */
export function chancesWithBattleState(
  otherLines: Line[],
  values: CalcValues,
  tables: StatTables,
  masteryTable: RawTable,
  sourceLabel: SourceLabel,
): { chances: Chances; battleLines: Line[] } {
  const battleLines = battleStatLines(values, masteryTable, sourceLabel);
  return { chances: chancesFromLines([...otherLines, ...battleLines], values, tables), battleLines };
}

/**
 * 버프 탭에 넣는 전투 중 최대 상태 공격력 % 줄 (곱 계열). chances = 다른 탭 줄 + 전투 중 줄로 계산한 확률.
 * - 63 흘러넘치는 체력: 체력 가득이면 값 % (사용자 결정: 항상 켜짐)
 * - 102 과충전 연타: 연타 100% 초과면 값 %
 * - 108 한계 돌파: floor((슈퍼 치명타 − 100) / 10) 단계 × 값 % (0단계면 없음)
 * - 202 초과된 힘: 관통 100% 초과면 값 %
 * - 307 무자비 폭주: 무자비 100% 초과면 값 % (대상 상태이상 조건은 넣지 않음, 사용자 결정)
 */
export function battleDamageLines(
  values: CalcValues,
  masteryTable: RawTable,
  sourceLabel: SourceLabel,
  chances: Chances,
): Line[] {
  const traits = masteryTraits(masteryTable);
  const lines: Line[] = [];
  const add = (value: number, sourceKey: string, params: Record<string, string | number> = {}) => {
    if (value) lines.push({ source: sourceLabel(sourceKey, params), stat: STATS.ATTACK_PERCENT, value });
  };
  add(learnedTraitValue(traits, values, STATS.BARRIER_FULL_DAMAGE), 'calc.buff.battle.barrierFullSource');
  const doubleAttack = chances.doubleAttack ?? 0;
  if (doubleAttack > DOUBLE_ATTACK_THRESHOLD) {
    add(learnedTraitValue(traits, values, STATS.OVERCHARGE), 'calc.buff.battle.overchargeSource', {
      chance: plainNumber(doubleAttack),
      threshold: DOUBLE_ATTACK_THRESHOLD,
    });
  }
  const superCritical = chances.superCritical ?? 0;
  const overSteps = Math.floor(
    (superCritical - BATTLE.SUPER_CRITICAL_OVER_THRESHOLD) / BATTLE.SUPER_CRITICAL_OVER_STEP,
  );
  if (overSteps > 0) {
    add(
      learnedTraitValue(traits, values, STATS.SUPER_CRITICAL_OVER_DAMAGE) * overSteps,
      'calc.buff.battle.superCriticalOverSource',
      { chance: plainNumber(superCritical), steps: overSteps },
    );
  }
  const spearAttack = chances.spearAttack ?? 0;
  if (spearAttack > BATTLE.SPEAR_ATTACK_THRESHOLD) {
    add(learnedTraitValue(traits, values, STATS.SPEAR_ATTACK_OVER_DAMAGE), 'calc.buff.battle.spearOverSource', {
      chance: plainNumber(spearAttack),
      threshold: BATTLE.SPEAR_ATTACK_THRESHOLD,
    });
  }
  const smite = chances.smite ?? 0;
  if (smite > BATTLE.SMITE_THRESHOLD) {
    add(learnedTraitValue(traits, values, STATS.SMITE_OVER_DAMAGE), 'calc.buff.battle.smiteOverSource', {
      chance: plainNumber(smite),
      threshold: BATTLE.SMITE_THRESHOLD,
    });
  }
  return lines;
}
