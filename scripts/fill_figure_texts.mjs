/**
 * 피규어 이름 · 효과 이름을 서버 번역 표에서 꺼내 stat-calc/src/i18n/calc/figure.ko.json 에 채운다 (있는 값은 새 값으로 바꿈).
 *
 * 사용: node stat-calc/scripts/fill_figure_texts.mjs   (D:\collectionidle 에서)
 * 입력: stat-calc/public/data/tables/FigureStat.json, claude-docs/server_tables/Localized<번호>.txt (번호가 가장 큰 것)
 * 출력: figure.ko.json 의
 *   - names.<피규어 번호>       = item_name_Figure_<번호>
 *   - effects.<효과 종류>       = 0_<효과 종류> (짧은 효과 이름, 예: "슈프림 치명타 확률")
 *   - targetHero.hp · attackDamage = 0__per_targetHero_hp · _attackDamage ("{0}의 체력 증가" → {{hero}})
 * 그리고 stat-calc/src/calc/sources/providers/figureImages.json 에 피규어 번호 → 그림 이름 (Item 표 imgName, 예: "1": "Figure_47")
 * Python 이 없는 PC 에서도 돌리려고 node 로 만들었다 (fill_missing_names.py 와 같은 일)
 */
import console from 'node:console';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const TABLE_PATH = join(ROOT, 'stat-calc', 'public', 'data', 'tables', 'FigureStat.json');
const I18N_PATH = join(ROOT, 'stat-calc', 'src', 'i18n', 'calc', 'figure.ko.json');
const SERVER_DIR = join(ROOT, 'claude-docs', 'server_tables');
const IMAGES_PATH = join(ROOT, 'stat-calc', 'src', 'calc', 'sources', 'providers', 'figureImages.json');
const TARGET_HERO = /^_per_targetHero\d+_(hp|attackDamage)$/i;
const EMPTY_STATS = new Set(['', 'None']);

function latestLocalized() {
  const files = readdirSync(SERVER_DIR)
    .filter((name) => /^Localized\d+\.txt$/.test(name))
    .sort((left, right) => Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]));
  const file = files.at(-1);
  console.log(`번역 표: ${file}`);
  return new Map(JSON.parse(readFileSync(join(SERVER_DIR, file), 'utf8')).map((row) => [row.key, row.kr]));
}

const localized = latestLocalized();
const table = JSON.parse(readFileSync(TABLE_PATH, 'utf8'));
const column = (name) => table.columns.indexOf(name);
const ids = [...new Set(table.rows.map((row) => row[column('figureid')]))];
const stats = new Set();
for (const row of table.rows) {
  for (const slot of [1, 2, 3]) {
    const stat = row[column(`statType${slot}`)];
    if (!EMPTY_STATS.has(stat) && !TARGET_HERO.test(stat)) stats.add(stat);
  }
}

const i18n = JSON.parse(readFileSync(I18N_PATH, 'utf8'));
const names = {};
const missingNames = [];
for (const id of ids) {
  const name = localized.get(`item_name_Figure_${id}`);
  if (name) names[id] = name;
  else missingNames.push(id);
}
const effects = {};
const missingEffects = [];
for (const stat of [...stats].sort()) {
  const text = localized.get(`0_${stat}`)?.trim();
  if (text) effects[stat] = text;
  else missingEffects.push(stat);
}
const heroText = (stat) => (localized.get(`0__per_targetHero_${stat}`) ?? '').replace('{0}', '{{hero}}').trim();
i18n.names = names;
i18n.effects = effects;
i18n.targetHero = { hp: heroText('hp'), attackDamage: heroText('attackDamage') };
writeFileSync(I18N_PATH, `${JSON.stringify(i18n, null, 2)}\n`);

// 피규어 그림: 아이템 표 (Item<번호>.txt 가장 큰 것) 의 item_name_Figure_<번호> 행 imgName (예: 1번 → Figure_47). 그림 번호 ≠ 피규어 번호
const itemFiles = readdirSync(SERVER_DIR)
  .filter((name) => /^Item\d+\.txt$/.test(name))
  .sort((left, right) => Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]));
const items = JSON.parse(readFileSync(join(SERVER_DIR, itemFiles.at(-1)), 'utf8'));
const images = {};
for (const row of items) {
  const match = /^item_name_Figure_(\d+)$/.exec(row.textNameKey ?? '');
  if (match && row.imgName) images[match[1]] = row.imgName;
}
writeFileSync(IMAGES_PATH, `${JSON.stringify(images, null, 2)}\n`);
console.log(`그림 ${Object.keys(images).length} / ${ids.length} (${itemFiles.at(-1)})`);
console.log(`이름 ${Object.keys(names).length} / ${ids.length}, 없음: ${missingNames.join(', ') || '-'}`);
console.log(`효과 ${Object.keys(effects).length} / ${stats.size}, 없음 (계산기 스탯 설명으로 대신): ${missingEffects.join(', ') || '-'}`);
