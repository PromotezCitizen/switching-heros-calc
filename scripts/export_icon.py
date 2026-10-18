"""프로필 아이콘 수치표를 계산기용 JSON 으로 내보낸다 (stat-data.js 에 없는 표).

사용: uv run python stat-calc/scripts/export_icon.py
입력: claude-docs/server_tables/Icon258061.txt (서버 표 원본, 행 목록 JSON)
출력: stat-calc/public/data/tables/Icon.json  { label, columns, rows }  (값은 전부 문자열, 원본 그대로)
  - 아이콘 (iconId) 마다 statType, statValue (%). 보유한 아이콘의 값을 곱해 프로필 아이콘 공격력을 셀 때 씀
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
INPUT_PATH = PROJECT_ROOT / 'claude-docs' / 'server_tables' / 'Icon258061.txt'
OUTPUT_PATH = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables' / 'Icon.json'
COLUMNS = ['iconId', 'statType', 'statValue']


def main() -> None:
    rows = json.loads(INPUT_PATH.read_text(encoding='utf-8'))
    table = {
        'label': '프로필 아이콘',
        'columns': COLUMNS,
        'rows': [[row.get(column, '') for column in COLUMNS] for row in rows],
    }
    OUTPUT_PATH.write_text(json.dumps(table, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Icon: {len(table["rows"])} rows, {OUTPUT_PATH.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
