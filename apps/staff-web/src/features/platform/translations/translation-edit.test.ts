import type { TranslationKeyRow } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { changesFor, draftProblems, draftsOf, effectiveText } from './translation-edit';

const row: TranslationKeyRow = {
  key: 'translations.count',
  section: 'translations',
  ar: 'عدد النصوص: {n}',
  en: 'Texts: {n}',
  arOverride: null,
  enOverride: 'Strings: {n}',
};

describe('translation editor logic', () => {
  it('shows the override when there is one, else the bundled text', () => {
    expect(effectiveText(row, 'ar')).toBe(row.ar);
    expect(effectiveText(row, 'en')).toBe('Strings: {n}');
    expect(draftsOf(row)).toEqual({ ar: row.ar, en: 'Strings: {n}' });
  });

  it('nothing to send when nothing changed (or a draft is blank)', () => {
    expect(changesFor(row, draftsOf(row))).toEqual([]);
    expect(changesFor(row, { ar: '  ', en: 'Strings: {n}' })).toEqual([]);
  });

  it('a changed locale is a PUT of the trimmed text', () => {
    expect(changesFor(row, { ar: ' النصوص: {n} ', en: 'Strings: {n}' })).toEqual([
      { locale: 'ar', key: row.key, value: 'النصوص: {n}' },
    ]);
  });

  it('typing the original back over an override restores it', () => {
    expect(changesFor(row, { ar: row.ar, en: 'Texts: {n}' })).toEqual([{ locale: 'en', key: row.key, value: null }]);
  });

  it('flags drafts that dropped a placeholder', () => {
    expect(draftProblems(row, { ar: 'عدد النصوص', en: 'Texts: {n}' })).toEqual({ ar: ['{n}'] });
    expect(draftProblems(row, draftsOf(row))).toEqual({});
  });
});
