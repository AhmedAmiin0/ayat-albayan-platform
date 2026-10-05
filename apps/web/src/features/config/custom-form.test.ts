import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { draftOf, emptyDraft, matchesCustom, parseDraft } from './custom-form';

const c = t.config.custom;
const draft = (over: object) => ({ ...emptyDraft(), key: 'promo.banner', value: '{"a":1}', ...over });

describe('custom entry draft', () => {
  it('turns valid boxes into the PUT body; a blank description becomes null, public defaults off', () => {
    expect(parseDraft(draft({ description: '  ' }))).toEqual({
      ok: true,
      key: 'promo.banner',
      body: { value: { a: 1 }, description: null, isPublic: false },
    });
    expect(parseDraft(draft({ value: '"hi"', description: 'شعار', isPublic: true }))).toMatchObject({
      ok: true,
      body: { value: 'hi', description: 'شعار', isPublic: true },
    });
  });

  it.each([
    ['a bad key', { key: 'Bad Key' }, { key: c.invalidKey }],
    ['a registry key', { key: 'messaging_enabled' }, { key: c.reservedKey }],
    ['broken JSON', { value: '{oops' }, { value: c.invalidJson }],
    ['null', { value: 'null' }, { value: c.nullValue }],
    ['a value over 8 KB', { value: JSON.stringify('x'.repeat(9000)) }, { value: c.tooLarge }],
    ['an empty value', { value: '' }, { value: c.invalidJson }],
  ])('rejects %s with its message', (_name, over, errors) => {
    expect(parseDraft(draft(over))).toEqual({ ok: false, errors });
  });

  it('edits start from the stored value, pretty-printed', () => {
    const d = draftOf({ key: 'k1', value: { a: 1 }, description: null, isPublic: true, updatedAt: 'T', updatedBy: null });
    expect(d).toEqual({ key: 'k1', value: '{\n  "a": 1\n}', description: '', isPublic: true });
  });

  it('search matches key or description, case-insensitively', () => {
    const e = { key: 'Promo', value: 1, description: 'شعار الصفحة', isPublic: false, updatedAt: 'T', updatedBy: null };
    expect(matchesCustom(e, 'promo')).toBe(true);
    expect(matchesCustom(e, 'الصفحة')).toBe(true);
    expect(matchesCustom(e, 'zzz')).toBe(false);
    expect(matchesCustom(e, '')).toBe(true);
  });
});
