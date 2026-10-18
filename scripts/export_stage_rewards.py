"""서버 표 Stage 의 층별 1마리 기본 보상(골드=EXP, 정수)을 log10 값으로 내보낸다.

사용: uv run python stat-calc/scripts/export_stage_rewards.py
입력: claude-docs/server_tables/Stage<번호>.txt 중 번호가 가장 큰 것 (최신 표)
출력: stat-calc/public/data/stageRewards.json  { count, gold: [...], ess: [...] }  (인덱스 0 = 1층)
"""
import json
import math
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TABLE_DIR = PROJECT_ROOT / 'claude-docs' / 'server_tables'
OUTPUT_PATH = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'stageRewards.json'
LOG_DECIMALS = 5


def latest_stage_table() -> Path:
    tables = [(int(re.search(r'(\d+)$', path.stem).group(1)), path) for path in TABLE_DIR.glob('Stage*.txt')]
    return max(tables)[1]


def log10_of(text: str) -> float:
    """'1.32E+138' 같은 글을 10^308 을 넘어도 log10 값으로 바꾼다."""
    mantissa_text, exponent_text = text.upper().split('E') if 'E' in text.upper() else (text, '0')
    return math.log10(float(mantissa_text)) + int(exponent_text)


def main() -> None:
    source = latest_stage_table()
    rows = json.loads(source.read_text(encoding='utf-8'))
    for index, row in enumerate(rows):
        assert int(row['stage']) == index + 1, f'층 번호가 순서와 다름: {index + 1} / {row["stage"]}'
        assert row['gold'] == row['exp'], f'{index + 1}층 골드와 EXP 가 다름'
    payload = {
        'count': len(rows),
        'gold': [round(log10_of(row['gold']), LOG_DECIMALS) for row in rows],
        'ess': [round(log10_of(row['alchemyPoint']), LOG_DECIMALS) for row in rows],
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, separators=(',', ':')), encoding='utf-8')
    print(f'{source.name} {len(rows)}층 -> {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
