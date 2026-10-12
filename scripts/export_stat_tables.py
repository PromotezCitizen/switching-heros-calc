"""계산식 확인기가 쓰는 수치표와 스탯 메타 정보를 JSON 으로 나눠 내보낸다.

사용: uv run python react/scripts/export_stat_tables.py
입력: htmls/stat-data.js (window.STAT_DATA = {...};)
출력:
  react/public/data/tables/<표 이름>.json   { columns: [...], rows: [[...]] }  (값은 전부 문자열, 원본 그대로)
  react/public/data/statMeta.json           tables 를 뺀 나머지 (sources, stats, families, excluded, unrelated, masteryNames, labels, warnings)
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
INPUT_PATH = PROJECT_ROOT / 'htmls' / 'stat-data.js'
OUTPUT_DIR = PROJECT_ROOT / 'react' / 'public' / 'data'
JS_PREFIX = 'window.STAT_DATA = '
JS_SUFFIX = ';'


def main() -> None:
    text = INPUT_PATH.read_text(encoding='utf-8').strip()
    assert text.startswith(JS_PREFIX) and text.endswith(JS_SUFFIX), 'stat-data.js 형식이 다름'
    data = json.loads(text[len(JS_PREFIX):-len(JS_SUFFIX)])
    table_dir = OUTPUT_DIR / 'tables'
    table_dir.mkdir(parents=True, exist_ok=True)
    for name, table in data['tables'].items():
        path = table_dir / f'{name}.json'
        path.write_text(json.dumps(table, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'{name}: {len(table["rows"])} rows, {path.stat().st_size:,} bytes')
    meta = {key: value for key, value in data.items() if key != 'tables'}
    meta_path = OUTPUT_DIR / 'statMeta.json'
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'statMeta: keys={list(meta)} {meta_path.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
