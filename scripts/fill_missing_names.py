"""계산기 표의 새 행 (서버 최신 표로 바꾸며 생긴 행) 중 번역 이름이 없는 것을 서버 번역 표로 채운다.

사용: uv run python -I stat-calc/scripts/fill_missing_names.py
입력: stat-calc/public/data/tables/<표>.json, claude-docs/server_tables/Localized<번호>.txt (번호가 가장 큰 것)
출력: stat-calc/src/i18n/calc/<이름>.ko.json 의 names 에 빠진 번호만 더함 (있는 이름은 그대로)
  - 특성: Mastery 의 rNo → mastery_name_<rNo>
  - 유물: Relic 의 relicId → relic_name_<relicId>
"""
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TABLE_DIR = PROJECT_ROOT / 'stat-calc' / 'public' / 'data' / 'tables'
I18N_DIR = PROJECT_ROOT / 'stat-calc' / 'src' / 'i18n' / 'calc'
SERVER_DIR = PROJECT_ROOT / 'claude-docs' / 'server_tables'
# (계산기 표, 번호 열, 번역 파일, 번역 표 키 앞부분)
TARGETS = [
    ('Mastery', 'rNo', 'mastery', 'mastery_name_'),
    ('Relic', 'relicId', 'relic', 'relic_name_'),
]


def latest_localized() -> dict[str, str]:
    files = sorted(SERVER_DIR.glob('Localized*.txt'), key=lambda path: int(re.sub(r'\D', '', path.stem)))
    rows = json.loads(files[-1].read_text(encoding='utf-8'))
    print(f'번역 표: {files[-1].name}')
    return {row['key']: row['kr'] for row in rows}


def main() -> None:
    localized = latest_localized()
    for table_name, id_column, i18n_name, key_prefix in TARGETS:
        table = json.loads((TABLE_DIR / f'{table_name}.json').read_text(encoding='utf-8'))
        index = table['columns'].index(id_column)
        ids = [row[index] for row in table['rows']]
        i18n_path = I18N_DIR / f'{i18n_name}.ko.json'
        i18n = json.loads(i18n_path.read_text(encoding='utf-8'))
        names = i18n.setdefault('names', {})
        added, not_found = [], []
        for row_id in ids:
            if row_id in names:
                continue
            text = localized.get(key_prefix + row_id)
            if text:
                names[row_id] = text
                added.append(row_id)
            else:
                not_found.append(row_id)
        # 원래 파일의 줄바꿈 (CRLF / LF) 을 그대로 따른다 (바뀐 이름 줄만 변경 비교에 뜨게)
        line_end = '\r\n' if b'\r\n' in i18n_path.read_bytes() else '\n'
        i18n_path.write_bytes((json.dumps(i18n, ensure_ascii=False, indent=2) + '\n').replace('\n', line_end).encode('utf-8'))
        print(f'{table_name}: 행 {len(ids)}, 이름 더함 {len(added)} {added[:6]}…, 번역 표에도 없음 {len(not_found)} {not_found[:6]}')


if __name__ == '__main__':
    main()
