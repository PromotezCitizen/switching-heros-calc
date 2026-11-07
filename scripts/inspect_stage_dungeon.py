"""Stage 표 열 · 크기와 속성 던전 행 (불·물·땅) 이 같은지 본다 (조사용).
사용: uv run python -I stat-calc/scripts/inspect_stage_dungeon.py
"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
TABLE_DIR = Path(__file__).resolve().parents[2] / 'claude-docs' / 'server_tables'

stage = json.loads((TABLE_DIR / 'Stage261299.txt').read_text(encoding='utf-8'))
print('Stage 행', len(stage), '열', list(stage[0].keys()))
print('첫 행', stage[0])
print('마지막 행', stage[-1])

rewards = json.loads((TABLE_DIR / 'DungeonReward261297.txt').read_text(encoding='utf-8'))
by_type = {}
for row in rewards:
    if row['dungeonType'].startswith('DungeonAttribute'):
        by_type.setdefault(row['dungeonType'], {})[row['difficulty']] = (row['dungeonVal1'], row['dungeonVal2'], row['dungeonVal3'])
types = list(by_type)
base = by_type[types[0]]
for other in types[1:]:
    diff = [key for key in base if by_type[other].get(key) != base[key]]
    print(other, '와', types[0], '다른 난이도 수', len(diff), diff[:3])
