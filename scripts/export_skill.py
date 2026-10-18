"""직업 스킬 수치표를 계산기용 JSON 으로 내보낸다 (stat-data.js 에 없는 표).

사용: uv run python stat-calc/scripts/export_skill.py
입력: claude-docs/server_tables/Skill261313.txt (서버 표 원본, 행 목록 JSON)
      claude-docs/server_tables/Localized264913.txt (스킬 이름 skill_name_<skillId> 의 kr)
출력: stat-calc/public/data/tables/Skill.json  { label, columns, rows }  (값은 전부 문자열, 원본 그대로)
  - 직업 스킬 (BuffSkill · ActiveSkill, 레벨이 있는 40개) 만. 히어로 스킬 (ChangeSkill · CharSkill) 은 레벨이 없어 뺀다
  - 데미지 % = damage + damageUp × (레벨 − 1)  (claude-docs/react-port/skill-table-plan.md, 화면 대조 확인)
  - all_ss_stats_value = SS 세트효과 규칙 원문 (예: 3_10_30_100, 뜻은 아직 확인 못 함)
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TABLE_DIR = PROJECT_ROOT / 'claude-docs' / 'server_tables'
INPUT_PATH = TABLE_DIR / 'Skill261313.txt'
LOCALIZED_PATH = TABLE_DIR / 'Localized264913.txt'
OUTPUT_PATH = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables' / 'Skill.json'
JOB_SKILL_TYPES = {'BuffSkill', 'ActiveSkill'}
SOURCE_COLUMNS = [
    'skillId', 'skillType', 'job', 'skillGrade', 'damage', 'damageUp',
    'value1', 'value2', 'value3', 'buffDuration', 'buffPer', 'coolTime', 'all_ss_stats_value',
]
COLUMNS = ['skillId', 'name', *SOURCE_COLUMNS[1:]]


def main() -> None:
    rows = json.loads(INPUT_PATH.read_text(encoding='utf-8'))
    names = {
        row['key']: row.get('kr', '')
        for row in json.loads(LOCALIZED_PATH.read_text(encoding='utf-8'))
        if row.get('key', '').startswith('skill_name_')
    }
    job_rows = [row for row in rows if row.get('skillType') in JOB_SKILL_TYPES]
    table = {
        'label': '직업 스킬',
        'columns': COLUMNS,
        'rows': [
            [row['skillId'], names.get(f"skill_name_{row['skillId']}", ''), *(row.get(column, '') for column in SOURCE_COLUMNS[1:])]
            for row in job_rows
        ],
    }
    OUTPUT_PATH.write_text(json.dumps(table, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    missing = [row[0] for row in table['rows'] if not row[1]]
    print(f'Skill: {len(table["rows"])} rows, {OUTPUT_PATH.stat().st_size:,} bytes, 이름 없음 {missing}')


if __name__ == '__main__':
    main()
