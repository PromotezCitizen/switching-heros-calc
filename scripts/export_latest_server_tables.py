"""계산기 수치표 (stat-calc/public/data/tables/*.json) 를 서버 최신 표로 다시 채운다.

사용: uv run python stat-calc/scripts/export_latest_server_tables.py
입력: claude-docs/server_tables/<표 이름><번호>.txt (서버 표 원본, 행 목록 JSON) 중 번호가 가장 큰 것
출력: stat-calc/public/data/tables/<표 이름>.json 의 rows 만 바꾼다 (label · columns · columnLabels 등 나머지는 그대로)
  - 열은 기존 JSON 의 columns 그대로. 서버 표에 없는 열 (예: 특성 desc 처럼 문구 표에서 붙인 열) 은
    기존 JSON 에서 첫 열 값이 같은 행의 값을 가져오고, 없거나 비었으면 서버 번역 표 (LOCALIZED_COLUMNS) 에서,
    그래도 없으면 빈 글
  - 전용 스크립트로 만드는 표 (Skill = 직업 스킬만 + 이름 열) 는 건너뛴다
  - 새로 생긴 행은 번호를 출력하고, 화면에 쓰는 이름 (src/i18n/calc/*.ko.json names) · 아이콘이 없는 행은 경고한다
    (이름은 fill_missing_names.py 로 채움, 아이콘은 htmls/icons 에서 가져옴)
"""
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SERVER_DIR = PROJECT_ROOT / 'claude-docs' / 'server_tables'
TABLE_DIR = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables'
I18N_DIR = PROJECT_ROOT / 'stat-calc' / 'src' / 'i18n' / 'calc'
ICON_DIR = PROJECT_ROOT / 'stat-calc' / 'public' / 'icons'
SKIP_TABLES = {'Skill'}
# 서버 표에 없는 열을 채울 번역 표 키: {표: {열: 키 앞부분}} (키 = 앞부분 + 첫 열 값)
LOCALIZED_COLUMNS = {'Mastery': {'desc': 'mastery_desc_'}}
# 화면에 쓰는 이름 번역 파일 (names) 과 아이콘 경로 후보 ({id} = 첫 열 값)
NAME_FILES = {'Mastery': 'mastery', 'Relic': 'relic'}
ICON_PATTERNS = {'Mastery': ['Atlas_Characteristics/A_{id}.png', 'Atlas_Characteristics/UT_{id}.png']}


def latest_localized() -> dict[str, str]:
    path = latest_server_file('Localized')
    return {row['key']: row['kr'] for row in json.loads(path.read_text(encoding='utf-8'))} if path else {}


def warn_missing_assets(name: str, ids: list[str]) -> None:
    """화면에 쓰는 이름 · 아이콘이 없는 행을 알린다"""
    if name in NAME_FILES:
        names = json.loads((I18N_DIR / f'{NAME_FILES[name]}.ko.json').read_text(encoding='utf-8')).get('names', {})
        missing_names = [row_id for row_id in ids if row_id not in names]
        if missing_names:
            print(f'  경고: 이름 없는 행 {len(missing_names)}개 {missing_names[:8]} (fill_missing_names.py 실행)')
    if name in ICON_PATTERNS:
        missing_icons = [
            row_id for row_id in ids
            if not any((ICON_DIR / pattern.format(id=row_id)).exists() for pattern in ICON_PATTERNS[name])
        ]
        if missing_icons:
            print(f'  경고: 아이콘 없는 행 {len(missing_icons)}개 {missing_icons[:8]} (htmls/icons 에서 가져올 것)')


def latest_server_file(name: str) -> Path | None:
    candidates = []
    for path in SERVER_DIR.glob(f'{name}*.txt'):
        match = re.fullmatch(rf'{re.escape(name)}(\d+)', path.stem)
        if match:
            candidates.append((int(match.group(1)), path))
    return max(candidates)[1] if candidates else None


def main() -> None:
    localized = latest_localized()
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
        localized_columns = LOCALIZED_COLUMNS.get(name, {})

        def missing_value(column: str, row_id: str, old: list[str] | None) -> str:
            old_value = old[columns.index(column)] if old else ''
            if old_value or column not in localized_columns:
                return old_value
            return localized.get(localized_columns[column] + row_id, '')

        rows = []
        for row in source_rows:
            row_id = str(row.get(columns[0], ''))
            old = old_by_key.get(row_id)
            rows.append([
                str(row.get(column, '')) if column in source_columns else missing_value(column, row_id, old)
                for column in columns
            ])
        before = len(table['rows'])
        changed = rows != table['rows']
        table['rows'] = rows
        table_path.write_text(json.dumps(table, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        note = f', 서버에 없는 열 {missing} 은 기존 값 · 번역 표' if missing else ''
        print(f'{name}: {source.name} → 행 {before} → {len(rows)}{" (바뀜)" if changed else " (같음)"}{note}')
        new_ids = [row[0] for row in rows if row[0] not in old_by_key]
        if new_ids:
            print(f'  새 행 {len(new_ids)}개 {new_ids[:8]}')
        warn_missing_assets(name, [row[0] for row in rows])


if __name__ == '__main__':
    main()
