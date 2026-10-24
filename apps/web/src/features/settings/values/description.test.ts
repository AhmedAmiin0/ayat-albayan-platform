import type { Permission } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { entryOf } from '@/test/entries-fixture';
import { canEditDescription, editorStart, shownDescription, textIn, type DescribeRights } from './description';

const bundle = { settings: { hints: { horizon: 'نص الترجمة' } } };
const HINT = 'settings.hints.horizon';
const base = entryOf('booking_horizon_weeks', { hintKey: HINT });

const rights = (held: readonly Permission[], baseAdmin = false): DescribeRights => ({ can: (p) => held.includes(p), baseAdmin });

describe('textIn', () => {
  it('reads a dotted path; a missing, blank or non-string path is undefined', () => {
    expect(textIn(bundle, HINT)).toBe('نص الترجمة');
    expect(textIn(bundle, 'settings.hints')).toBeUndefined();
    expect(textIn(bundle, 'settings.nope.x')).toBeUndefined();
    expect(textIn({ a: '  ' }, 'a')).toBeUndefined();
    expect(textIn(bundle, null)).toBeUndefined();
  });
});

describe('shownDescription (docs/26 §3 display order)', () => {
  it('Arabic: the admin description first, then t(hintKey), then the seeded text', () => {
    const input = { hintKey: HINT, locale: 'ar' as const, bundle };
    expect(shownDescription({ ...input, entry: { ...base, description: 'وصف المدير', descriptionSeed: 'بذرة' } })).toBe('وصف المدير');
    expect(shownDescription({ ...input, entry: { ...base, descriptionSeed: 'بذرة' } })).toBe('نص الترجمة');
    expect(shownDescription({ ...input, entry: { ...base, hintKey: 'x.y', descriptionSeed: 'بذرة' }, hintKey: 'x.y' })).toBe('بذرة');
    expect(shownDescription({ ...input, entry: undefined })).toBe('نص الترجمة');
  });

  it('English: t(hintKey) only, never the Arabic description', () => {
    const entry = { ...base, description: 'وصف المدير', descriptionSeed: 'بذرة' };
    expect(shownDescription({ entry, hintKey: HINT, locale: 'en', bundle: { settings: { hints: { horizon: 'English hint' } } } })).toBe('English hint');
    expect(shownDescription({ entry: { ...entry, hintKey: null }, hintKey: null, locale: 'en', bundle })).toBeUndefined();
  });

  it('the editor starts from the Arabic text (in English: the stored or seeded Arabic)', () => {
    expect(editorStart({ entry: base, hintKey: HINT, locale: 'ar', bundle })).toBe('نص الترجمة');
    expect(editorStart({ entry: { ...base, descriptionSeed: 'بذرة' }, hintKey: HINT, locale: 'en', bundle })).toBe('بذرة');
    expect(editorStart({ entry: { ...base, hintKey: null }, hintKey: null, locale: 'ar', bundle })).toBe('');
  });
});

describe('canEditDescription', () => {
  it('a config row needs settings.write; no API row or a retired one is never editable', () => {
    expect(canEditDescription(base, rights(['settings.write']))).toBe(true);
    expect(canEditDescription(base, rights(['settings.read']))).toBe(false);
    expect(canEditDescription(undefined, rights(['settings.write']))).toBe(false);
    expect(canEditDescription({ ...base, retired: true }, rights(['settings.write']))).toBe(false);
  });

  it('owned rows need the owning module’s right', () => {
    const gate = entryOf('messaging_enabled');
    expect(gate.ownedBy).toBe('messages_gate');
    expect(canEditDescription(gate, rights(['settings.write']))).toBe(true);
    const comms = entryOf('comms_source');
    expect(comms.ownedBy).toBe('communications');
    expect(canEditDescription(comms, rights(['settings.write']))).toBe(false);
    expect(canEditDescription(comms, rights(['numbers.manage']))).toBe(true);
    const google = entryOf('google_sync_enabled');
    expect(google.ownedBy).toBe('google_sync');
    expect(canEditDescription(google, rights(['settings.write']))).toBe(false);
    expect(canEditDescription(google, rights([], true))).toBe(true);
  });
});
