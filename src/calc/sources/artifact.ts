/** 연성 "능력치 합계" 화면 목록 (명중 제외) → 효과 줄. 값은 화면 표기 그대로 받는다 */
import type { Line } from '../combine';
import { parseGameNumber } from '../gameNumber';

/** 줄의 출처는 번역 키로 담고, 표에 보일 때 번역한다 */
export const ARTIFACT_SOURCE_PREFIX = 'calc.artifact.sources.';

export interface ArtifactTotalField {
  /** 저장소 칸 이름 (기존 HTML 의 data-key 와 같음) */
  id: string;
  stat: string;
}

export const ARTIFACT_TOTAL_FIELDS: ArtifactTotalField[] = [
  { id: 'artifactTotalAtk', stat: '_per_attackDamage' },
  { id: 'artifactTotalHp', stat: '_per_hp' },
  // 게임 목록 3번째 줄 명중은 계산과 관계없어 칸을 두지 않는다 (사용자 지시 "연성 명중 칸 삭제")
  { id: 'artifactTotalSmite', stat: 'smite' },
  { id: 'artifactTotalBarrier', stat: 'barrier' },
  { id: 'artifactTotalDoubleAttack', stat: 'doubleAttack' },
  { id: 'artifactTotalSuperCritical', stat: 'superCritical' },
  // 관통·스킬 콤보는 장비에 옵션이 있을 때만 목록에 보인다. 자리는 유니크 옵션 표 순서 (연타 → 슈퍼 치명타 → 관통 → 스위칭 부스트 → 스킬 콤보) 를 따른 추정
  { id: 'artifactTotalSpearAttack', stat: 'spearAttack' },
  { id: 'artifactTotalSwitchingBoost', stat: 'switchingBoost' },
  { id: 'artifactTotalSkillCombo', stat: 'skillCombo' },
  { id: 'artifactTotalCharSkill', stat: '_per_CharSkillDamage' },
  { id: 'artifactTotalChangeSkill', stat: '_per_ChangeSkillDamage' },
  { id: 'artifactTotalCritDmg', stat: '_per_criticalDmg' },
  { id: 'artifactTotalBuffSkill', stat: '_per_BuffSkillDamage' },
  { id: 'artifactTotalActiveSkill', stat: '_per_ActiveSkillDamage' },
  { id: 'artifactTotalNormal', stat: '_per_NormalMonsterDamage' },
  { id: 'artifactTotalBoss', stat: '_per_BossMonsterDamage' },
  { id: 'artifactTotalHero', stat: '_per_HeroMonsterDamage' },
];

/** fieldTexts: 칸 이름 → 입력한 글. 읽을 수 없는 칸은 줄을 만들지 않는다 */
export function artifactLines(
  fieldTexts: Record<string, string>,
  sourceLabel: (fieldId: string) => string,
): Line[] {
  const lines: Line[] = [];
  for (const field of ARTIFACT_TOTAL_FIELDS) {
    const parsed = parseGameNumber(fieldTexts[field.id]);
    if (parsed) lines.push({ source: sourceLabel(field.id), stat: field.stat, log: parsed.log });
  }
  return lines;
}
