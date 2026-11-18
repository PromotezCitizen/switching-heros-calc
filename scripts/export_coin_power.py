"""코인 파워 표를 계산기가 읽는 JSON 으로 내보낸다 (레벨, 스탯 2쌍).

사용: uv run python -I stat-calc/scripts/export_coin_power.py
입력: claude-docs/app_dump/new_5.81/specs/CoinPower.txt (5.81 앱 내장 표, JSON 목록)
출력: stat-calc/public/data/tables/CoinPower.json  { label, columns, rows }  (값은 전부 문자열, 원본 그대로. 1E+308 을 넘는 값이 있다)
근거: claude-docs/react-port/code-changes-5.81-2026-11-18.md 5-2
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE = PROJECT_ROOT / 'claude-docs' / 'app_dump' / 'new_5.81' / 'specs' / 'CoinPower.txt'
OUTPUT = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables' / 'CoinPower.json'
COLUMNS = ['coinLevel', 'statType1', 'statValue1', 'statType2', 'statValue2']


def main() -> None:
    records = json.loads(SOURCE.read_text(encoding='utf-8'))
    rows = [[record[column] for column in COLUMNS] for record in records]
    table = {'label': '코인 파워', 'columns': COLUMNS, 'unresolved': False, 'levelFormat': None, 'rows': rows}
    temporary = OUTPUT.with_suffix('.tmp')
    temporary.write_text(json.dumps(table, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    temporary.replace(OUTPUT)
    print(f'{OUTPUT.name}: {len(rows)}행')


if __name__ == '__main__':
    main()
