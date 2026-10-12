"""계산기 수치표 (react/public/data/tables/*.json) 를 서버 최신 표로 다시 채운다.

사용: uv run python react/scripts/export_latest_server_tables.py
입력: claude-docs/server_tables/<표 이름><번호>.txt (서버 표 원본, 행 목록 JSON) 중 번호가 가장 큰 것
출력: react/public/data/tables/<표 이름>.json 의 rows 만 바꾼다 (label · columns · columnLabels 등 나머지는 그대로)
  - 열은 기존 JSON 의 columns 그대로. 서버 표에 없는 열 (예: 특성 desc 처럼 문구 표에서 붙인 열) 은
    기존 JSON 에서 첫 열 값이 같은 행의 값을 가져오고, 없으면 빈 글
  - 전용 스크립트로 만드는 표 (Skill = 직업 스킬만 + 이름 열) 는 건너뛴다
"""
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SERVER_DIR = PROJECT_ROOT / 'claude-docs' / 'server_tables'
TABLE_DIR = PROJECT_ROOT / 'react' / 'public' / 'data' / 'tables'
SKIP_TABLES = {'Skill'}


def latest_server_file(name: str) -> Path | None:
    candidates = []
    for path in SERVER_DIR.glob(f'{name}*.txt'):
        match = re.fullmatch(rf'{re.escape(name)}(\d+)', path.stem)
        if match:
            candidates.append((int(match.group(1)), path))
    return max(candidates)[1] if candidates else None


def main() -> None:
    for table_path in sorted(TABLE_DIR.glob('*.json')):
        name = table_path.stem
        if name in SKIP_TABLES:
            continue
        source = latest_server_file(name)
        if source is None:
            print(f'{name}: 서버 표 없음, 그대로')
            continue
        table = json.loads(table_path.read_text(encoding='utf-8'))
        columns = table['columns']
        source_rows = json.loads(source.read_text(encoding='utf-8'))
        source_columns = set().union(*(row.keys() for row in source_rows)) if source_rows else set()
        missing = [column for column in columns if column not in source_columns]
        old_by_key = {row[0]: row for row in table['rows']}
        rows = []
        for row in source_rows:
            old = old_by_key.get(str(row.get(columns[0], '')))
            rows.append([
                str(row.get(column, '')) if column in source_columns else (old[columns.index(column)] if old else '')
                for column in columns
            ])
        before = len(table['rows'])
        changed = rows != table['rows']
        table['rows'] = rows
        table_path.write_text(json.dumps(table, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        note = f', 서버에 없는 열 {missing} 은 기존 값' if missing else ''
        print(f'{name}: {source.name} → 행 {before} → {len(rows)}{" (바뀜)" if changed else " (같음)"}{note}')


if __name__ == '__main__':
    main()
