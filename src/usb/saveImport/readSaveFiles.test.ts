import { describe, expect, it } from 'vitest';
import { SAVE_FILE_KINDS } from '@/usb/saveImport/importSave';
import { missingSaveKinds, saveFileFor, saveFileNames } from '@/usb/saveImport/readSaveFiles';

describe('저장 파일 고르기 (USB · 폴더 공통)', () => {
  const all = SAVE_FILE_KINDS.map((kind) => `data_a_20261106_${kind}.json`);

  it('저장 파일 이름만 남기고 이름순', () => {
    expect(saveFileNames(['desktop.ini', 'data_a_2_Char.json', 'data_a_1_Char.json', 'other.json'])).toEqual(['data_a_1_Char.json', 'data_a_2_Char.json']);
  });

  it('종류가 다 있으면 없는 종류 없음, 빠지면 그 종류', () => {
    expect(missingSaveKinds(all)).toEqual([]);
    expect(missingSaveKinds(all.filter((name) => !name.endsWith('_Equip.json')))).toEqual(['Equip']);
  });

  it('종류 파일은 이름 끝 _<종류>.json 으로 찾는다', () => {
    expect(saveFileFor(all, 'Char')).toBe('data_a_20261106_Char.json');
  });
});
