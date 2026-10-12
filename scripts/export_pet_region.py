"""펫 지역 표 (PetRegion) 에서 지역 레벨별 지역 특성 (traitAtk · traitHp) 만 JSON 으로 내보낸다.

사용: uv run python -I react/scripts/export_pet_region.py
입력: claude-docs/server_tables/PetRegion<번호>.txt 중 번호가 가장 큰 것 (서버 표 덤프, JSON 목록)
출력: react/public/data/tables/PetRegion.json  { label, columns: [regionLv, traitAtk, traitHp], rows: [[...]] }  (값은 전부 문자열, 원본 그대로)
근거: claude-docs/react-port/stat-provider-formulas.md 3-16절 (펫 지역 T1286)
"""
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
INPUT_DIR = PROJECT_ROOT / 'claude-docs' / 'server_tables'
OUTPUT_PATH = PROJECT_ROOT / 'react' / 'public' / 'data' / 'tables' / 'PetRegion.json'
FILE_PATTERN = re.compile(r'^PetRegion(\d+)\.txt$')
COLUMNS = ['regionLv', 'traitAtk', 'traitHp']


def latest_input() -> Path:
    candidates = [(int(match.group(1)), path) for path in INPUT_DIR.iterdir() if (match := FILE_PATTERN.match(path.name))]
    assert candidates, 'PetRegion 표 덤프가 없음'
    return max(candidates)[1]


def main() -> None:
    source = latest_input()
    records = json.loads(source.read_text(encoding='utf-8'))
    rows = [[record[column] for column in COLUMNS] for record in records]
    table = {'label': '펫 지역 지역 특성', 'columns': COLUMNS, 'unresolved': False, 'levelFormat': None, 'rows': rows}
    OUTPUT_PATH.write_text(json.dumps(table, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{source.name}: {len(rows)} rows -> {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
