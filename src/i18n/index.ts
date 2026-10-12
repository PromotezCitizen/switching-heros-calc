import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './ko.json';

/**
 * 탭별 번역 조각: src/i18n/calc/<이름>.ko.json 의 내용이 translation.calc.<이름> 아래로 들어간다
 * (예: calc/diary.ko.json → 키 calc.diary.title)
 */
const calcFragments = import.meta.glob<Record<string, unknown>>('./calc/*.ko.json', {
  eager: true,
  import: 'default',
});
const fragmentEntries = Object.entries(calcFragments).map(([path, content]) => {
  const name = /\/([^/]+)\.ko\.json$/.exec(path)?.[1] ?? path;
  return [name, content] as const;
});
const translation = {
  ...ko,
  calc: { ...ko.calc, ...Object.fromEntries(fragmentEntries) },
};

void i18n.use(initReactI18next).init({
  resources: { ko: { translation } },
  lng: 'ko',
  fallbackLng: 'ko',
  /** 줄의 출처 문구에 ':' 와 '.' 가 들어가도 키로 쪼개지 않는다 (키는 calc.xxx.yyy 형태만 쓰고 점은 그대로 구분자) */
  nsSeparator: false,
  interpolation: { escapeValue: false },
});

export default i18n;
