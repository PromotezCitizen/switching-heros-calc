"""직업 스킬 수치표를 계산기용 JSON 으로 내보낸다 (stat-data.js 에 없는 표).

사용: uv run python stat-calc/scripts/export_skill.py
입력: claude-docs/server_tables/Skill261313.txt (서버 표 원본, 행 목록 JSON)
      claude-docs/server_tables/Localized264913.txt (스킬 이름 skill_name_<skillId> 의 kr)
출력: stat-calc/public/data/tables/Skill.json  { label, columns, rows }  (값은 전부 문자열, 원본 그대로)
  - 직업 스킬 (BuffSkill · ActiveSkill, 레벨이 있는 40개) 만. 히어로 스킬 (ChangeSkill · CharSkill) 은 레벨이 없어 뺀다
  - 데미지 % = damage + damageUp × (레벨 − 1)  (claude-docs/react-port/skill-table-plan.md, 화면 대조 확인)
  - all_ss_stats_value = SS 세트효과 규칙 원문 (예: 3_10_30_100, 뜻은 아직 확인 못 함)
입력: claude-docs/server_tables/SkillRune210536.txt (스킬 옵션 표), Localized 의 skill_rune_desc_<type> (옵션 문구 kr)
출력: stat-calc/public/data/tables/SkillRune.json  { label, columns, rows }
  - 스킬마다 옵션 후보 12행. rNo = 저장 데이터 diceOptions[].rNo, gradeSS = 최고 등급 값 (문구의 {0})
  - desc = Localized 문구 (없으면 표 desc)
입력: claude-docs/server_tables/SkillPerk234674.txt (스킬 문양 표), Localized 의 skill_perk_desc_<perkType> (문양 문구 kr)
출력: stat-calc/public/data/tables/SkillPerk.json  { label, columns, rows }
  - 스킬마다 해금 레벨 targetLv (60 ~ 120, 10마다) 별 후보 2행. val1~3 = 문구의 {0}~{2}
  - desc = Localized 문구에 스킬 이름과 val1~3 을 넣은 글
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TABLE_DIR = PROJECT_ROOT / 'claude-docs' / 'server_tables'
INPUT_PATH = TABLE_DIR / 'Skill261313.txt'
LOCALIZED_PATH = TABLE_DIR / 'Localized264913.txt'
OUTPUT_PATH = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables' / 'Skill.json'
RUNE_INPUT_PATH = TABLE_DIR / 'SkillRune210536.txt'
RUNE_OUTPUT_PATH = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables' / 'SkillRune.json'
RUNE_COLUMNS = ['rNo', 'skillId', 'type', 'gradeSS', 'desc']
RUNE_DESC_PREFIX = 'skill_rune_desc_'
PERK_INPUT_PATH = TABLE_DIR / 'SkillPerk234674.txt'
PERK_OUTPUT_PATH = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables' / 'SkillPerk.json'
PERK_VALUE_COLUMNS = ['val1', 'val2', 'val3']
PERK_COLUMNS = ['skillId', 'targetLv', 'perkType', *PERK_VALUE_COLUMNS, 'desc']
PERK_DESC_PREFIX = 'skill_perk_desc_'
PERK_SKILL_NAME_PLACEHOLDER = '{skillName}'


def perk_text(template: str, skill_name: str, row: dict) -> str:
    """문양 문구의 {skillName} · {0}~{2} 를 채운다"""
    text = template.replace(PERK_SKILL_NAME_PLACEHOLDER, skill_name)
    for index, column in enumerate(PERK_VALUE_COLUMNS):
        text = text.replace(f'{{{index}}}', row.get(column, ''))
    return text
JOB_SKILL_TYPES = {'BuffSkill', 'ActiveSkill'}
SOURCE_COLUMNS = [
    'skillId', 'skillType', 'job', 'skillGrade', 'damage', 'damageUp',
    'value1', 'value2', 'value3', 'buffDuration', 'buffPer', 'coolTime', 'all_ss_stats_value',
]
COLUMNS = ['skillId', 'name', *SOURCE_COLUMNS[1:]]


def main() -> None:
    rows = json.loads(INPUT_PATH.read_text(encoding='utf-8'))
    localized = json.loads(LOCALIZED_PATH.read_text(encoding='utf-8'))
    names = {row['key']: row.get('kr', '') for row in localized if row.get('key', '').startswith('skill_name_')}
    rune_descs = {row['key']: row.get('kr', '') for row in localized if row.get('key', '').startswith(RUNE_DESC_PREFIX)}
    perk_descs = {row['key']: row.get('kr', '') for row in localized if row.get('key', '').startswith(PERK_DESC_PREFIX)}
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

    runes = json.loads(RUNE_INPUT_PATH.read_text(encoding='utf-8'))
    rune_table = {
        'label': '스킬 옵션',
        'columns': RUNE_COLUMNS,
        'rows': [
            [row['rNo'], row['skillId'], row['type'], row['gradeSS'], rune_descs.get(f"{RUNE_DESC_PREFIX}{row['type']}") or row.get('desc', '')]
            for row in runes
        ],
    }
    RUNE_OUTPUT_PATH.write_text(json.dumps(rune_table, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'SkillRune: {len(rune_table["rows"])} rows, {RUNE_OUTPUT_PATH.stat().st_size:,} bytes')

    perks = json.loads(PERK_INPUT_PATH.read_text(encoding='utf-8'))
    perk_rows = []
    missing_descs = set()
    for row in perks:
        template = perk_descs.get(f"{PERK_DESC_PREFIX}{row['perkType']}")
        if template is None:
            missing_descs.add(row['perkType'])
            template = row['perkType']
        skill_name = names.get(f"skill_name_{row['skillId']}", row.get('skillName', ''))
        perk_rows.append([row['skillId'], row['targetLv'], row['perkType'], *(row.get(column, '') for column in PERK_VALUE_COLUMNS),
                          perk_text(template, skill_name, row)])
    PERK_OUTPUT_PATH.write_text(json.dumps({'label': '스킬 문양', 'columns': PERK_COLUMNS, 'rows': perk_rows}, ensure_ascii=False, separators=(',', ':')),
                                encoding='utf-8')
    print(f'SkillPerk: {len(perk_rows)} rows, {PERK_OUTPUT_PATH.stat().st_size:,} bytes, 문구 없음 {sorted(missing_descs)}')


if __name__ == '__main__':
    main()
