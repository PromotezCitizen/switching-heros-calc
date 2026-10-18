"""DPM 시간 모델용 서버 표 2개를 계산기용 JSON 으로 내보낸다 (스킬 옵션 표는 export_skill.py 의 SkillRune.json).

사용: uv run python stat-calc/scripts/export_dpm_tables.py
입력: claude-docs/server_tables/Skill261313.txt, Vip241428.txt
출력 (stat-calc/public/data/tables/, { label, columns, rows }, 값은 문자열 원본):
  - CharSkill.json: 전용 스킬 (skillType CharSkill) 행. buffDuration = 발동 조건 종류 (1 = 일반 공격 N번마다),
    buffPer = N, coolTime = 스킬 단계 (claude-docs/mastery-optimizer-design.md 4-1)
  - Vip.json: VIP 레벨별 game_speed_up 값 (buffType01~ 중 game_speed_up 인 칸의 buffVal)
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TABLE_DIR = PROJECT_ROOT / 'claude-docs' / 'server_tables'
OUTPUT_DIR = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables'
CHAR_SKILL_COLUMNS = ['skillId', 'job', 'buffDuration', 'buffPer', 'coolTime', 'damage', 'value1', 'value2', 'value3']
GAME_SPEED_BUFF = 'game_speed_up'
VIP_BUFF_SLOTS = 9


def load(name: str) -> list[dict]:
    return json.loads((TABLE_DIR / name).read_text(encoding='utf-8'))


def write(name: str, label: str, columns: list[str], rows: list[list[str]]) -> None:
    path = OUTPUT_DIR / f'{name}.json'
    path.write_text(json.dumps({'label': label, 'columns': columns, 'rows': rows}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{name}: {len(rows)} rows, {path.stat().st_size:,} bytes')


def main() -> None:
    skills = load('Skill261313.txt')
    write('CharSkill', '전용 스킬', CHAR_SKILL_COLUMNS,
          [[row.get(column, '') for column in CHAR_SKILL_COLUMNS] for row in skills if row.get('skillType') == 'CharSkill'])
    vip_rows = []
    for row in load('Vip241428.txt'):
        speed = '0'
        for slot in range(1, VIP_BUFF_SLOTS + 1):
            if row.get(f'buffType{slot:02d}') == GAME_SPEED_BUFF:
                speed = row.get(f'buffVal{slot:02d}', '0')
        vip_rows.append([row['lv'], speed])
    write('Vip', 'VIP 게임 속도', ['lv', 'gameSpeedUp'], vip_rows)


if __name__ == '__main__':
    main()
