/**
 * 교체 스킬 (ChangeSkill, 공격 종류 3) 시전 1번의 적중 수 (판정 한 번의 계수가 곱해지는 횟수의 기대값 = 판정 수 × 맞는 적 수).
 * 교체로 들어올 때 1번 실행된다. 대미지 한 번 = 공격력 × 행 damage / 100 (damageUp · 직업 스킬 옵션 · SS 세트 없음, damage-pipeline.md 3-4).
 * 판정 구조 근거 (사용자 지시 2026-11-05 "진행", 조사 문서 claude-docs/react-port):
 *   skill-gaps-2026-11-05.md 1절 (티르 · 에이카), hero-skills-swordsman / fighter / archer / mage-2026-11-05.md.
 * targets = 한 판정에 맞는 적 수 (계산기의 "스킬 한 번에 맞는 적 수", 보스 · 히어로 대상은 1). "모든 적" · 반지름 판정은 targets 로 본다.
 * 무기 초월 ★ 효과 (횟수 · 지속 늘림) 는 넣지 않았다. 조사가 "추정" 인 몫은 estimates 에 표시한다.
 */
import { CONSTS } from '@/CONSTS';
import type { TableRow } from '@/data/statTables';

const { CHANGE_SKILL } = CONSTS.dpm;

export interface ChangeSkillHits {
  supported: boolean;
  hits: number;
  estimates?: string[];
}

const UNSUPPORTED: ChangeSkillHits = { supported: false, hits: 0 };

function values(row: TableRow): [number, number, number, number] {
  return [Number(row.value1) || 0, Number(row.value2) || 0, Number(row.value3) || 0, Number(row.damage) || 0];
}

/** 판정 하나에 맞는 적 수가 targets 인 판정 n 번 */
type HitRule = (row: TableRow, targets: number) => ChangeSkillHits;

const found = (hits: number, estimates?: string[]): ChangeSkillHits => ({ supported: true, hits, ...(estimates ? { estimates } : {}) });
const estimated = (hits: number) => found(hits, [CHANGE_SKILL.ESTIMATE_CODE]);
/** 정수 몫 int(a / b) (b 가 0 이면 0) */
const intDiv = (a: number, b: number) => (b > 0 ? Math.floor(a / b + CHANGE_SKILL.FLOAT_EPSILON) : 0);

/** 행 번호 → 판정 규칙 (같은 히어로의 단계 1 · 2 · 3 · 각성 행이 같은 규칙) */
const RULES: Record<string, HitRule> = {};
function rule(skillIds: string[], hitRule: HitRule): void {
  for (const skillId of skillIds) RULES[skillId] = hitRule;
}

// ── 검사 ──
// 루나: 돌진 베기 1 + 월광 베기 4판정 + 산산조각 1판정 × value1 (단계 1 · 2 는 value1 이 비어 0)
rule(['1001', '1002', '1003'], (row, targets) => {
  const [value1] = values(row);
  return found((CHANGE_SKILL.LUNA_DASH + CHANGE_SKILL.LUNA_MOON_HITS + value1) * targets);
});
// 린: 수룡 value1 마리 (각성 11004 는 10마리), 자리마다 반지름 6 안 적 1번. 11005 는 10마리 + 거대 수룡 1번 (계수 × value1 / 100, 사실상 모든 적)
rule(['1004', '1005', '1006'], (row, targets) => found(values(row)[0] * targets));
rule(['11004'], (_row, targets) => found(CHANGE_SKILL.LIN_AWAKEN_DRAGONS * targets));
rule(['11005'], (row, targets) => found((CHANGE_SKILL.LIN_AWAKEN_DRAGONS + values(row)[0] / CONSTS.dpm.PERCENT_DIVISOR) * targets));
// 카이토: value1 방향, 방향마다 수룡 쌍 상자 (한 번만 모드) 가 한 적 1번 — 상자 수는 프리팹 값이라 1 로 추정
rule(['1007', '1008', '1009'], (row, targets) => estimated(values(row)[0] * targets));
// 라스칼: value1 번 타격, 타격마다 반지름 3.5 안 적 1번
rule(['1010', '1011', '1012'], (row, targets) => found(values(row)[0] * targets));
// 페니: 화염 상자를 value1 초 동안 value2 초 간격으로 판정
rule(['1013', '1014', '1015'], (row, targets) => {
  const [value1, value2] = values(row);
  return found(intDiv(value1, value2) * targets);
});
// 카엘: 0.5 · 1.5 · 2.5초에 3번, 모든 적
rule(['1016', '1017', '1018'], (_row, targets) => found(CHANGE_SKILL.KAEL_HITS * targets));
// 티르: 칼 int(value1 / value2) 자루지만 마지막 칼을 쏜 직후 게이트가 꺼져 판정은 한 자루 적다, 칼마다 모든 적 1번
rule(['1019', '1020', '1021'], (row, targets) => {
  const [value1, value2] = values(row);
  return found(Math.max(intDiv(value1, value2) - 1, 0) * targets);
});

// ── 격투가 ──
// 셴: 드래곤 value2 마리, 드래곤마다 이동 판정 2~4번 (추정 3) + 마지막 × value1 판정 1번
rule(['1101', '1102', '1103'], (row, targets) => {
  const [value1, value2] = values(row);
  return estimated(value2 * (CHANGE_SKILL.SHEN_MOVE_HITS + value1) * targets);
});
// 마리: 단계 수만큼 빔, 빔마다 약 10판정 (끝 시각을 못 읽어 9~11, 추정)
rule(['1104', '1105', '1106'], (row, targets) => estimated((Number(row.coolTime) || 0) * CHANGE_SKILL.MARI_BEAM_HITS * targets));
// 레이: 토네이도 value3 개, 토네이도마다 value2 초 동안 value1 초 간격 판정 (각성 그림자 몫은 못 넣음)
rule(['1107', '1108', '1109'], (row, targets) => {
  const [value1, value2, value3] = values(row);
  return found(value3 * intDiv(value2, value1) * targets);
});
rule(['11107', '11108'], (row, targets) => {
  const [value1, value2, value3] = values(row);
  return estimated(value3 * intDiv(value2, value1) * targets);
});
// 파이크: 주먹 value1 발, 마지막 1발만 × value2
rule(['1110', '1111', '1112'], (row, targets) => {
  const [value1, value2] = values(row);
  return found((Math.max(value1 - 1, 0) + value2) * targets);
});
// 푸: (value1 + 1) 번 내려찍기
rule(['1113', '1114', '1115'], (row, targets) => found((values(row)[0] + 1) * targets));
// 로차: 모든 적에게 3번
rule(['1116', '1117', '1118'], (_row, targets) => found(CHANGE_SKILL.ROCHA_HITS * targets));
// 모모리: 파동 int(value2 / value1) 개, 파동 하나 1번 (추정), 반지름 6
rule(['1119', '1120', '1121'], (row, targets) => {
  const [value1, value2] = values(row);
  return estimated(intDiv(value2, value1) * targets);
});

// ── 궁수 ──
// 보니: 히어로 둘레 상자 1번 + 사방 화살 (한 적에게 닿는 화살 1발로 추정)
rule(['1201', '1202', '1203'], (_row, targets) => estimated(CHANGE_SKILL.BONNIE_HITS_PER_TARGET * targets));
// 바이슨: 3.3초 뒤부터 value1 초 동안 1초마다 모든 적
rule(['1204', '1205', '1206'], (row, targets) => found(values(row)[0] * targets));
// 리코: 무작위 적 자리 반지름 5.5 판정 value1 번
rule(['1207', '1208', '1209'], (row, targets) => found(values(row)[0] * targets));
// 크로우: 화살 value1 발, 착지점 반지름 4 폭발 1번
rule(['1210', '1211', '1212'], (row, targets) => found(values(row)[0] * targets));
// 아이작: 도약 2번, 상자마다 value1 번 판정
rule(['1213', '1214', '1215'], (row, targets) => found(CHANGE_SKILL.ISAAC_JUMPS * values(row)[0] * targets));
// 에이카: 화살 value1 개, 떨어진 자리 반지름 6 안 적 1번. 각성 11216 · 11217: value1 / value3 번, 1초 간격 모든 적
rule(['1216', '1217', '1218'], (row, targets) => found(values(row)[0] * targets));
rule(['11216', '11217'], (row, targets) => {
  const [value1, , value3] = values(row);
  return found(intDiv(value1, value3) * targets);
});
// 썬더 · 라야 · 미르: int(value1 / value2) 틱, 틱마다 모든 적
rule(['1219', '1220', '1221', '1222', '1223', '1224', '1225', '1226', '1227'], (row, targets) => {
  const [value1, value2] = values(row);
  return found(intDiv(value1, value2) * targets);
});

// ── 마법사 ──
// 데이지: 거미 value1 마리, 반지름 4. 각성 11301 · 11302: 작은 거미 12 + 큰 거미 3 · 5 마리 (큰 거미는 value1 %)
rule(['1301', '1302', '1303'], (row, targets) => found(values(row)[0] * targets));
rule(['11301', '11302'], (row, targets) => {
  const [value1, , , damage] = values(row);
  const big = row.skillId === '11301' ? CHANGE_SKILL.DAISY_BIG_SPIDERS[0] : CHANGE_SKILL.DAISY_BIG_SPIDERS[1];
  return found((CHANGE_SKILL.DAISY_SMALL_SPIDERS + (damage > 0 ? (big * value1) / damage : 0)) * targets);
});
// 제이드: 운석 value1 개, 반지름 5.85
rule(['1304', '1305', '1306'], (row, targets) => found(values(row)[0] * targets));
// 릴리: 블랙홀 int(value1 / value2) 번 판정
rule(['1307', '1308', '1309'], (row, targets) => {
  const [value1, value2] = values(row);
  return found(intDiv(value1, value2) * targets);
});
// 셰나: 나비 무리 value1 + value2 + value3 개 (유도, 무리당 최대 16번 — 한 적 1번으로 추정)
rule(['1310', '1311', '1312'], (row, targets) => {
  const [value1, value2, value3] = values(row);
  return estimated((value1 + value2 + value3) * targets);
});
// Dr.X: 플라스크 value1 개 (반지름 6 추정), 1315 는 value2 배 거대 플라스크 1개 더
rule(['1313', '1314', '1315'], (row, targets) => {
  const [value1, value2] = values(row);
  return estimated((value1 + value2) * targets);
});
// 리슈: int(value1 / value2) 틱, 틱마다 모든 적
rule(['1316', '1317', '1318'], (row, targets) => {
  const [value1, value2] = values(row);
  return found(intDiv(value1, value2) * targets);
});
// 루피아: 상어 value1 마리, 무작위 적 자리 반지름 10
rule(['1319', '1320', '1321'], (row, targets) => found(values(row)[0] * targets));
// 레비카: 폭발 int(value1) 번, 사실상 모든 적
rule(['1322', '1323', '1324'], (row, targets) => found(Math.floor(values(row)[0]) * targets));

export function changeSkillHits(row: TableRow | undefined, targets: number): ChangeSkillHits {
  if (!row) return UNSUPPORTED;
  const hitRule = RULES[row.skillId];
  return hitRule ? hitRule(row, targets) : UNSUPPORTED;
}
