/** 직업 스킬 시전 1번의 적중 구조: 궁수 → 검사 → 격투가 → 마법사 순으로 찾고, 어느 쪽에도 없으면 지원하지 않는 스킬 */
import type { CalcValues } from '@/calc/types';
import type { StatTables } from '@/data/statTables';
import { archerSkillHits, type SkillHits } from '@/dpm/archerSkillHits';
import { fighterSkillHits } from '@/dpm/fighterSkillHits';
import { mageSkillHits } from '@/dpm/mageSkillHits';
import { swordsmanSkillHits } from '@/dpm/swordsmanSkillHits';

/** statusCount = 대상에 걸린 상태이상 수 ("상태이상인 적에게" 조건 문양용, 없으면 0) */
export function jobSkillHits(values: CalcValues, tables: StatTables, skillId: string, targets: number, statusCount = 0): SkillHits {
  const finders = [
    () => archerSkillHits(values, tables, skillId, targets),
    () => swordsmanSkillHits(values, tables, skillId, targets),
    () => fighterSkillHits(values, tables, skillId, targets, statusCount),
    () => mageSkillHits(values, tables, skillId, targets, statusCount),
  ];
  let result: SkillHits = { supported: false, hits: 0, coefficientFactor: 1 };
  for (const find of finders) {
    result = find();
    if (result.supported) return result;
  }
  return result;
}
