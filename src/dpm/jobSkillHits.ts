/** 직업 스킬 시전 1번의 적중 구조: 궁수 5개 → 검사 10개 순으로 찾고, 어느 쪽에도 없으면 지원하지 않는 스킬 */
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { archerSkillHits, type SkillHits } from '@/dpm/archerSkillHits';
import { swordsmanSkillHits } from '@/dpm/swordsmanSkillHits';

export function jobSkillHits(values: CalcValues, tables: StatTables, skillId: string, targets: number): SkillHits {
  const archer = archerSkillHits(values, tables, skillId, targets);
  return archer.supported ? archer : swordsmanSkillHits(values, tables, skillId, targets);
}
