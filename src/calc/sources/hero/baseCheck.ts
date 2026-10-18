/**
 * 기본값 확인: 프로필 창의 공격력·체력 (화면 값) 대 수치표 히어로 기본값.
 * 기존 stat-calc.html renderBaseCheck (605~615) 의 계산 부분. 화면·React 와 무관한 순수 함수
 */
import { CONSTS } from '@/CONSTS';
import type { StatTables } from '@/data/statTables';
import type { CalcValues } from '@/calc/types';
import { profileLog } from '@/calc/sources/textLines/profile';
import { heroBase } from '@/calc/sources/hero/character';

const { BASE_CHECK_TOLERANCE_LOG } = CONSTS.hero;

export interface BaseCheckRow {
  /** 'atk' | 'hp' (프로필 칸 이름과 같음) */
  stat: 'atk' | 'hp';
  /** 수치표 기본값 (log10) */
  tableLog: number;
  /** 화면 값 (log10). 빈칸·읽을 수 없으면 null */
  screenLog: number | null;
  same: boolean;
}

const CHECK_STATS = ['atk', 'hp'] as const;

/** 1슬롯 히어로를 안 골랐거나 표에 없으면 null */
export function baseCheck(values: CalcValues, tables: StatTables): BaseCheckRow[] | null {
  const base = heroBase(values, tables);
  if (!base) return null;
  return CHECK_STATS.map((stat) => {
    const screenLog = profileLog(values, stat);
    return {
      stat,
      tableLog: base[stat],
      screenLog,
      same: screenLog !== null && Math.abs(base[stat] - screenLog) < BASE_CHECK_TOLERANCE_LOG,
    };
  });
}
