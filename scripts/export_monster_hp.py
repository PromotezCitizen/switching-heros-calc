"""대상 체력 조건 피해 계산용 몬스터 체력을 log10 값으로 내보낸다.

사용: uv run python stat-calc/scripts/export_monster_hp.py
입력: claude-docs/server_tables/Stage<번호>.txt (최신), DungeonReward261297.txt (속성 던전 행)
출력: stat-calc/public/data/monsterHp.json
  - stage: { count, monHp: [...], bossHp: [...] }  층별 일반 몬스터 체력 · 보스 체력 배수의 log10 (인덱스 0 = 1층)
  - attributeDungeon: { count, stage: [...], hpMultiplier: [...], kind: [...] }  속성 던전 층별 (인덱스 0 = 1층, 난이도 = 4000 + 층)
    stage = dungeonVal1 (Stage 번호), hpMultiplier = log10(dungeonVal2), kind = dungeonVal3 (1 일반 · 2 보스 · 3 히어로).
    불 · 물 · 땅 세 던전의 값이 같아 불 행만 쓴다 (claude-docs/react-port/hero-dungeon-monster.md)
"""
import json
from pathlib import Path

from export_stage_rewards import LOG_DECIMALS, latest_stage_table, log10_of

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TABLE_DIR = PROJECT_ROOT / 'claude-docs' / 'server_tables'
DUNGEON_REWARD_PATH = TABLE_DIR / 'DungeonReward261297.txt'
OUTPUT_PATH = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'monsterHp.json'
ATTRIBUTE_DUNGEON_TYPES = ('DungeonAttributeFire', 'DungeonAttributeWater', 'DungeonAttributeEarth')
ATTRIBUTE_DIFFICULTY_BASE = 4000


def attribute_dungeon_rows() -> list[dict]:
    rewards = json.loads(DUNGEON_REWARD_PATH.read_text(encoding='utf-8'))
    by_type: dict[str, dict[int, dict]] = {name: {} for name in ATTRIBUTE_DUNGEON_TYPES}
    for row in rewards:
        if row['dungeonType'] in by_type:
            by_type[row['dungeonType']][int(row['difficulty'])] = row
    fire = by_type[ATTRIBUTE_DUNGEON_TYPES[0]]
    for name in ATTRIBUTE_DUNGEON_TYPES[1:]:
        for difficulty, row in fire.items():
            other = by_type[name][difficulty]
            assert (other['dungeonVal1'], other['dungeonVal2'], other['dungeonVal3']) == (row['dungeonVal1'], row['dungeonVal2'], row['dungeonVal3']), \
                f'{name} {difficulty} 값이 불 던전과 다름'
    rows = [fire[difficulty] for difficulty in sorted(fire)]
    for floor, row in enumerate(rows, start=1):
        assert int(row['difficulty']) == ATTRIBUTE_DIFFICULTY_BASE + floor, f'속성 던전 난이도가 4000 + 층이 아님: {row["difficulty"]}'
    return rows


def main() -> None:
    source = latest_stage_table()
    stage_rows = json.loads(source.read_text(encoding='utf-8'))
    for index, row in enumerate(stage_rows):
        assert int(row['stage']) == index + 1, f'층 번호가 순서와 다름: {index + 1} / {row["stage"]}'
    dungeon_rows = attribute_dungeon_rows()
    payload = {
        'stage': {
            'count': len(stage_rows),
            'monHp': [round(log10_of(row['monHp']), LOG_DECIMALS) for row in stage_rows],
            'bossHp': [round(log10_of(row['bossHp']), LOG_DECIMALS) for row in stage_rows],
        },
        'attributeDungeon': {
            'count': len(dungeon_rows),
            'stage': [int(row['dungeonVal1']) for row in dungeon_rows],
            'hpMultiplier': [round(log10_of(row['dungeonVal2']), LOG_DECIMALS) for row in dungeon_rows],
            'kind': [int(row['dungeonVal3']) for row in dungeon_rows],
        },
    }
    OUTPUT_PATH.write_text(json.dumps(payload, separators=(',', ':')), encoding='utf-8')
    print(f'{source.name} {len(stage_rows)}층, 속성 던전 {len(dungeon_rows)}층 -> {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
