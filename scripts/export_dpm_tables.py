"""DPM 시간 모델용 서버 표 2개를 계산기용 JSON 으로 내보낸다 (스킬 옵션 표는 export_skill.py 의 SkillRune.json).

사용: uv run python stat-calc/scripts/export_dpm_tables.py
입력: claude-docs/server_tables/Skill261313.txt, Vip241428.txt
출력 (stat-calc/public/data/tables/, { label, columns, rows }, 값은 문자열 원본):
  - CharSkill.json: 전용 스킬 (skillType CharSkill) 행. buffDuration = 발동 조건 종류 (1 = 일반 공격 N번마다),
    buffPer = N, coolTime = 스킬 단계 (claude-docs/mastery-optimizer-design.md 4-1)
  - ChangeSkill.json: 교체 스킬 (skillType ChangeSkill) 행. 대미지 한 번 = 공격력 × damage / 100, coolTime 은 쿨타임이 아니라 단계,
    value1~3 은 히어로마다 뜻이 다름 (claude-docs/react-port/skill-gaps-2026-11-05.md 1절, hero-skills-*-2026-11-05.md)
  - Vip.json: VIP 레벨별 game_speed_up 값 (buffType01~ 중 game_speed_up 인 칸의 buffVal),
    stage_boss_time_up 값 (보스 전투 시간 +초, 그 레벨 행에만 있고 쌓임),
    mastery_point_up 값 (특성 포인트 +, 그 레벨 행에만 있고 쌓임: VIP 13 → 50 + 100 = 150, 화면 · 저장 데이터와 일치)
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TABLE_DIR = PROJECT_ROOT / 'claude-docs' / 'server_tables'
OUTPUT_DIR = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables'
CHAR_SKILL_COLUMNS = ['skillId', 'job', 'buffDuration', 'buffPer', 'coolTime', 'damage', 'value1', 'value2', 'value3']
GAME_SPEED_BUFF = 'game_speed_up'
BOSS_TIME_BUFF = 'stage_boss_time_up'
MASTERY_POINT_BUFF = 'mastery_point_up'
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
    write('ChangeSkill', '교체 스킬', CHAR_SKILL_COLUMNS,
          [[row.get(column, '') for column in CHAR_SKILL_COLUMNS] for row in skills if row.get('skillType') == 'ChangeSkill'])
    vip_rows = []
    for row in load('Vip241428.txt'):
        values = {GAME_SPEED_BUFF: '0', BOSS_TIME_BUFF: '0', MASTERY_POINT_BUFF: '0'}
        for slot in range(1, VIP_BUFF_SLOTS + 1):
            buff = row.get(f'buffType{slot:02d}')
            if buff in values:
                values[buff] = row.get(f'buffVal{slot:02d}', '0')
        vip_rows.append([row['lv'], values[GAME_SPEED_BUFF], values[BOSS_TIME_BUFF], values[MASTERY_POINT_BUFF]])
    write('Vip', 'VIP 게임 속도 · 보스 전투 시간 · 특성 포인트', ['lv', 'gameSpeedUp', 'bossTimeUp', 'masteryPointUp'], vip_rows)


if __name__ == '__main__':
    main()
