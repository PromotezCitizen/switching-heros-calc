"""코어 특성 · 피규어 · 속성 룬 연구실 표를 계산기가 읽는 JSON 으로 내보낸다 (필요한 열만).

사용: uv run python -I stat-calc/scripts/export_provider_tables.py
입력: claude-docs/server_tables/<이름><번호>.txt 중 번호가 가장 큰 것 (서버 표 덤프, JSON 목록)
출력: stat-calc/public/data/tables/<계산기 표 이름>.json  { label, columns, rows }  (값은 전부 문자열, 원본 그대로)
근거: claude-docs/react-port/stat-provider-formulas.md 10-4 (코어 특성 T1271) · 10-5 (피규어 T1276) · 3-3 (속성 룬 연구실 T1262 (다))
"""
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
INPUT_DIR = PROJECT_ROOT / 'claude-docs' / 'server_tables'
OUTPUT_DIR = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables'

CORE_MASTERY_SLOTS = 13
FIGURE_SLOTS = 3
EMPTY_STATS = ('', 'None')

# (서버 표 이름, 계산기 표 이름, 라벨, 열 목록, 행을 거르는 조건 (없으면 전부))
TABLES = [
    (
        'CoreMastery',
        'CoreMastery',
        '코어 특성',
        ['lv'] + [f'{kind}{index}' for index in range(1, CORE_MASTERY_SLOTS + 1) for kind in ('statType', 'statValue')],
        None,
    ),
    (
        'FigureStat',
        'FigureStat',
        '피규어',
        ['figureid', 'grade', 'level'] + [f'{kind}{index}' for index in range(1, FIGURE_SLOTS + 1) for kind in ('statType', 'statValue')],
        None,
    ),
    (
        'Lab',
        'AttributeRuneLab',
        '속성 룬 연구실',
        ['attType', 'lv', 'rwdStat', 'rwdValue'],
        lambda record: record['attType'] not in EMPTY_STATS and record['rwdStat'] not in EMPTY_STATS,
    ),
]


def latest_input(name: str) -> Path:
    pattern = re.compile(rf'^{name}(\d+)\.txt$')
    candidates = [(int(match.group(1)), path) for path in INPUT_DIR.iterdir() if (match := pattern.match(path.name))]
    assert candidates, f'{name} 표 덤프가 없음'
    return max(candidates)[1]


def main() -> None:
    for server_name, table_name, label, columns, keep in TABLES:
        source = latest_input(server_name)
        records = json.loads(source.read_text(encoding='utf-8'))
        rows = [[record[column] for column in columns] for record in records if keep is None or keep(record)]
        table = {'label': label, 'columns': columns, 'unresolved': False, 'levelFormat': None, 'rows': rows}
        path = OUTPUT_DIR / f'{table_name}.json'
        path.write_text(json.dumps(table, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'{source.name}: {len(rows)} rows -> {path} ({path.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
