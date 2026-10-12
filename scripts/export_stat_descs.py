"""스탯 이름 → 설명 문구({0} 자리에 값)를 내보낸다.

사용: uv run python react/scripts/export_stat_descs.py
입력: htmls/stat-data.js (build_stat_data.py 가 만든 것, window.STAT_DATA = {...};)
출력: react/public/data/statDescriptions.json  { 스탯 이름: 설명 }  (설명이 있는 스탯만)
"""
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
INPUT_PATH = PROJECT_ROOT / 'htmls' / 'stat-data.js'
OUTPUT_PATH = PROJECT_ROOT / 'react' / 'public' / 'data' / 'statDescriptions.json'
JS_PREFIX = 'window.STAT_DATA = '
JS_SUFFIX = ';'


def main() -> None:
    text = INPUT_PATH.read_text(encoding='utf-8').strip()
    assert text.startswith(JS_PREFIX) and text.endswith(JS_SUFFIX), 'stat-data.js 형식이 다름'
    data = json.loads(text[len(JS_PREFIX):-len(JS_SUFFIX)])
    descriptions = {name: info['desc'] for name, info in data['stats'].items() if info.get('desc')}
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(descriptions, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{len(descriptions)} stats -> {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
