"""기존 htmls/stat-calc.html 에 같은 입력을 넣고 히어로의 기록·무기·몬스터 카드·펫·광산 줄을 읽어
src/calc/sources/heroWeaponCardPet/expectedFromHtml.ts (vitest 기대값) 로 쓴다.

실행: uv run --with playwright python stat-calc/scripts/expected_hero_weapon_card_pet.py
기존 페이지는 claude-docs/serve_htmls.py 가 띄운 http://127.0.0.1:8765 를 쓴다 (계정 기본값 파일은 빈 값으로 바꿔 끼움).
"""
import json
import pathlib

from playwright.sync_api import sync_playwright

CHROMIUM = 'C:/Users/han/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'
ROOT = pathlib.Path(__file__).resolve().parents[2]
PAGE_URL = 'http://127.0.0.1:8765/stat-calc.html'
EMPTY_DEFAULTS = 'window.STAT_CALC_DEFAULTS = {calc: {}, mastery: {}};'
OUT = ROOT / 'stat-calc' / 'src' / 'calc' / 'sources' / 'heroWeaponCardPet' / 'expectedFromHtml.ts'
TABLES = ROOT / 'stat-calc' / 'public' / 'data' / 'tables'


def table_rows(name):
    table = json.loads((TABLES / f'{name}.json').read_text(encoding='utf-8'))
    return [dict(zip(table['columns'], row)) for row in table['rows']]


AILMENT_PET = next(row for row in table_rows('Pet') if row['leaderStatType'].startswith('pet_hero_'))

# 입력 순서 = HTML 에 넣는 순서 (고른 카드·펫에 따라 목록이 바뀌는 칸은 뒤에). 마지막 원소 True = 넣을 수 없어도 됨 (기존 화면 선택지에 없음)
SCENARIOS = {
    'libraryLow': [
        ('library_Swordsman', '27'), ('library_Fighter', '25'), ('library_Archer', '30'), ('library_Mage', '26'),
        ('inheritStat1', '_per_attackDamage'), ('inheritValue1', '600%'),
        ('inheritStat2', '_per_hp'), ('inheritValue2', '50%'),
    ],
    'libraryHigh': [
        ('library_Swordsman', '160'), ('library_Fighter', '170'), ('library_Archer', '165'), ('library_Mage', '161'),
        ('inheritStat1', '_per_attackDamage'), ('inheritValue1', '600%'),
        ('inheritStat8', '_per_criticalDmg'), ('inheritValue8', '1.2A%'),
    ],
    'weaponWithHero': [
        ('charName', '에이카'),
        ('weaponLink_SwordsmanValue', '900%'), ('weaponLink_MageValue', '1.2A%'), ('weaponLink_ArcherLevel', '30'),
        ('weaponLinkStar', '3'), ('weaponLinkSymbol', '900%'), ('weaponLinkAtk', '900%'),
        ('normalWeaponAtk', '11.58B%'), ('soulForgeLevel', '3'),
        ('weaponOptionStat1', '_per_attackDamage'), ('weaponOptionValue1', '600%'),
        ('weaponOptionStat8', '_per_hp'), ('weaponOptionValue8', '2.5B%'),
        ('weaponStar', '12'), ('weaponLevel', '3400'),
    ],
    'weaponNoHero': [
        ('normalWeaponAtk', '11.58B%'), ('soulForgeLevel', '1'), ('weaponStar', '5'), ('weaponLevel', '99999'),
    ],
    'card': [
        ('cardSlot1', '25'), ('cardSlotGrade1', 'SSS_2'),
        ('cardSetPick1_1', '1'), ('cardSetPick1_2', '1'), ('cardSetPick1_3', '2'), ('cardSetPick1_4', '3'),
        ('cardSlot2', '1'), ('cardSlotGrade2', 'B_3'), ('cardSetPick2_1', '1'),
        ('cardSlot3', '13'), ('cardSetPick3_5', '2'),
        ('cardSlot4', '25'), ('cardSlotGrade4', 'SSS_1'), ('cardSetPick4_1', '1'), ('cardSetPick4_2', '1'), ('cardSetPick4_3', '1'),
        ('cardSlot5', '25'), ('cardSlotGrade5', 'R_15'),
        ('relicLink_cardSetBonus', '380'),
        ('stickerSetCount_1', '4'), ('stickerSetLevel_1', '5'),
    ],
    'pet': [
        ('pet_1', 'C_2'), ('pet_101', 'SSS_1'), ('pet_201', 'B_1'),
        ('petSlot1', '101'), ('petSlot2', '1'), ('petSlot3', '201'), ('petLeader', '1'),
        ('petOption1_1Stat', '_per_WaterHero_CharSkillDamage'), ('petOption1_1Value', '50%'),
        ('petOption1_6Stat', '_per_WaterHero_Hp'), ('petOption1_6Value', '1.5A%'),
        ('petOption2_1Stat', '_per_FireHero_AttackDamage'), ('petOption2_1Value', '30%'),
        ('petOption2_2Stat', '_per_FireHero_Hp'), ('petOption2_2Value', '20%'),
        ('petOption3_1Stat', '_per_EarthHero_Hp'), ('petOption3_1Value', '10%'),
    ],
    'petAilmentLeader': [
        (f"pet_{AILMENT_PET['petId']}", f"{AILMENT_PET['grade']}_{AILMENT_PET['star']}"),
        ('petSlot2', AILMENT_PET['petId']), ('petLeader', '2'),
    ],
    'mine': [('mineAtk', '36.8a'), ('mineHp', '1.5B%'), ('mineLevel', '5'), ('mineAwakenLevel', '12')],
}

SET_FIELDS = """(entries) => {
  const failed = [];
  for (const [id, value] of entries) {
    const element = document.getElementById(id);
    if (!element) { failed.push(id + ' (칸 없음)'); continue; }
    element.value = value;
    if (element.value !== value) { failed.push(id + '=' + value); continue; }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return failed;
}"""

# 계산 탭 쪽 줄 묶음 (전용 무기·광산) 은 html 안 함수라 render() 의 concat 인자로 잡는다
CAPTURE = """() => {
  const sources = window.StatCalcSources;
  const original = sources.render;
  sources.render = function () {
    const groups = original.apply(this, arguments);
    const concat = groups.concat.bind(groups);
    groups.concat = function (extra) { window.__htmlGroups = extra; return concat(extra); };
    return groups;
  };
}"""

READ = """() => {
  const groups = {};
  for (const group of window.StatCalcSources.render()) groups[group.label] = group.lines;
  for (const group of window.__htmlGroups || []) groups[group.label] = group.lines;
  const text = (id) => (document.getElementById(id) || {}).textContent || '';
  const sss = /장착 SSS (\\d+)장/.exec(text('sourceSummary'));
  return { groups, libraryMainLevel: text('libraryMainLevel'), weaponResult: text('weaponResult'),
    possess: text('normalWeaponPossessValue'), equipNote: text('normalWeaponEquipNote'), sssCards: sss ? Number(sss[1]) : null,
    weaponLevel: document.getElementById('weaponLevel').value };
}"""

GROUP_LABELS = {'library': ['히어로의 기록'], 'weapon': ['무기', '전용 무기'], 'card': ['몬스터 카드'], 'pet': ['펫'], 'mine': ['광산']}


def run():
    result = {}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=CHROMIUM)
        page = browser.new_page()
        page.route('**/stat-calc-defaults.js', lambda route: route.fulfill(body=EMPTY_DEFAULTS, content_type='application/javascript'))
        for name, entries in SCENARIOS.items():
            page.goto(PAGE_URL)
            page.evaluate('localStorage.clear()')
            page.goto(PAGE_URL)
            page.evaluate(CAPTURE)
            failed = page.evaluate(SET_FIELDS, [list(entry) for entry in entries])
            read = page.evaluate(READ)
            tab = next(key for key in GROUP_LABELS if name.startswith(key))
            lines = [line for label in GROUP_LABELS[tab] for line in read['groups'].get(label, [])]
            result[name] = {
                'values': {entry[0]: entry[1] for entry in entries},
                'notAccepted': failed,
                'lines': lines,
                'screen': {key: read[key] for key in ['libraryMainLevel', 'weaponResult', 'possess', 'equipNote', 'sssCards', 'weaponLevel']},
            }
            print(name, len(lines), 'lines, not accepted:', failed)
        browser.close()
    OUT.write_text(
        '/** 기존 htmls/stat-calc.html 에 같은 입력을 넣어 읽은 줄 (scripts/expected_hero_weapon_card_pet.py 가 만든 파일, 손으로 고치지 않는다) */\n'
        'export const EXPECTED_FROM_HTML = ' + json.dumps(result, ensure_ascii=False, indent=2) + ' as const;\n',
        encoding='utf-8')


run()
