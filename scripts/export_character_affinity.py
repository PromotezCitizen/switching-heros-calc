"""히어로 호감도 수치표를 계산기용 JSON 으로 내보낸다 (stat-data.js 에 없는 표).

사용: uv run python stat-calc/scripts/export_character_affinity.py
입력: claude-docs/server_tables/CharacterAffinity258077.txt (서버 표 원본, 행 목록 JSON)
출력: stat-calc/public/data/tables/CharacterAffinity.json  { label, columns, rows }  (값은 전부 문자열, 원본 그대로)
  - 히어로 (charId) 마다 lv 0~15, statVal1 = 공격력 % (_per_attackDamage), statVal2 = 체력 % (_per_hp). 그 레벨까지의 누적 값
  - exp = 그 레벨에서 다음 레벨로 가는 데 필요한 호감도 경험치 (저장 데이터의 누적 경험치로 레벨을 셀 때 씀)
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
INPUT_PATH = PROJECT_ROOT / 'claude-docs' / 'server_tables' / 'CharacterAffinity258077.txt'
OUTPUT_PATH = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables' / 'CharacterAffinity.json'
COLUMNS = ['charId', 'lv', 'statType1', 'statVal1', 'statType2', 'statVal2', 'exp']


def main() -> None:
    rows = json.loads(INPUT_PATH.read_text(encoding='utf-8'))
    table = {
        'label': '히어로 호감도',
        'columns': COLUMNS,
        'rows': [[row.get(column, '') for column in COLUMNS] for row in rows],
    }
    OUTPUT_PATH.write_text(json.dumps(table, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'CharacterAffinity: {len(table["rows"])} rows, {OUTPUT_PATH.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
