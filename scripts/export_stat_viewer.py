"""스탯 모아 보기 페이지 데이터를 내보낸다 (계산기 수치표 public/data/tables 는 건드리지 않는다).

사용: uv run python stat-calc/scripts/export_stat_viewer.py  (먼저 uv run python build_stat_data.py)
입력: htmls/stat-data.js (window.STAT_DATA = {...};)
출력:
  stat-calc/public/data/statMeta.json                   tables 를 뺀 나머지 (sources, stats, families, excluded, unrelated, masteryNames, labels, warnings)
  stat-calc/public/data/statViewerTables/<표 이름>.json  출처가 가리키는 원본 표 (label · columns · columnLabels · levelFormat · unresolved · rows)
출처의 행 번호는 stat-data.js 를 만든 표 기준이라, 다른 스크립트가 갱신하는 계산기 수치표와 어긋날 수 있어 표를 따로 둔다
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
INPUT_PATH = PROJECT_ROOT / 'htmls' / 'stat-data.js'
OUTPUT_DIR = PROJECT_ROOT / 'stat-calc' / 'public' / 'data'
TABLE_DIR_NAME = 'statViewerTables'
JS_PREFIX = 'window.STAT_DATA = '
JS_SUFFIX = ';'


def write_json(path: Path, value) -> None:
    """임시 파일에 쓴 뒤 바꿔 넣는다 (개발 서버가 쓰는 도중의 빈 파일을 읽지 않게)"""
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False), encoding='utf-8')
    temporary.replace(path)


def main() -> None:
    text = INPUT_PATH.read_text(encoding='utf-8').strip()
    assert text.startswith(JS_PREFIX) and text.endswith(JS_SUFFIX), 'stat-data.js 형식이 다름'
    data = json.loads(text[len(JS_PREFIX):-len(JS_SUFFIX)])
    table_dir = OUTPUT_DIR / TABLE_DIR_NAME
    table_dir.mkdir(parents=True, exist_ok=True)
    for name, table in data['tables'].items():
        path = table_dir / f'{name}.json'
        write_json(path, table)
        print(f'{name}: {len(table["rows"])} rows, {path.stat().st_size:,} bytes')
    meta = {key: value for key, value in data.items() if key != 'tables'}
    meta_path = OUTPUT_DIR / 'statMeta.json'
    write_json(meta_path, meta)
    print(f'statMeta: keys={list(meta)} {meta_path.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
