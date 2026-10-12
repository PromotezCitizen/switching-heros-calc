"""웨폰 링크 수치표를 계산기용 JSON 으로 내보낸다 (stat-data.js 에 없는 표).

사용: uv run python react/scripts/export_weapon_link.py
입력: claude-docs/server_tables/WeaponLink255879.txt (서버 표 원본, 행 목록 JSON)
출력: react/public/data/tables/WeaponLink.json  { label, columns, rows }  (값은 전부 문자열, 원본 그대로, 비용 열은 뺌)
  - 직업 행 (Swordsman·Fighter·Archer·Mage, lv 1~7500): statVal1 = 그 직업 히어로 공격력 %
  - None 행 (초월 단계 lv 1~75): statVal1 = 무기의 상징 능력치 강화 % (_multiply_WeaponLink), statVal2 = 공격력 % (_per_attackDamage)
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
INPUT_PATH = PROJECT_ROOT / 'claude-docs' / 'server_tables' / 'WeaponLink255879.txt'
OUTPUT_PATH = PROJECT_ROOT / 'react' / 'public' / 'data' / 'tables' / 'WeaponLink.json'
COLUMNS = ['jobType', 'lv', 'statType1', 'statVal1', 'statType2', 'statVal2']


def main() -> None:
    rows = json.loads(INPUT_PATH.read_text(encoding='utf-8'))
    table = {
        'label': '웨폰 링크',
        'columns': COLUMNS,
        'rows': [[row.get(column, '') for column in COLUMNS] for row in rows],
    }
    OUTPUT_PATH.write_text(json.dumps(table, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'WeaponLink: {len(table["rows"])} rows, {OUTPUT_PATH.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
