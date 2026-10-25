import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { conflictBy, conflictText } from './conflict-text';
import { valueText } from './value-format';

const c = t.settingsValues.conflict;
const conflict = { code: 'conflict' as const, key: 'fx_fresh_hours', current: 6, version: 3, updatedAt: '2026-10-23T09:58:00Z', updatedByName: 'سارة' };
const now = new Date('2026-10-23T10:00:00Z');

describe('conflictText', () => {
  it('«تغيّرت هذه القيمة إلى 6 قبل دقيقتين بواسطة سارة. قيمتك: 8.» with the values in words (gender-neutral)', () => {
    const text = conflictText({ key: 'fx_fresh_hours', conflict, mine: 8, now });
    expect(text.startsWith(c.body.split('{value}')[0] ?? '')).toBe(true);
    expect(text).toContain('بواسطة سارة');
    expect(text).not.toMatch(/^غيّر/);
    expect(text).toContain(valueText('fx_fresh_hours', 6));
    expect(text).toContain(valueText('fx_fresh_hours', 8));
    expect(text).not.toMatch(/[{}]/);
    expect(text).toMatch(/دقيق/); // the relative time
  });

  it('no name: «مستخدم آخر»; no time: the sentence reads without it', () => {
    const bare = { ...conflict, updatedByName: null, updatedAt: null };
    expect(conflictBy(bare)).toBe(c.someone);
    const text = conflictText({ key: 'fx_fresh_hours', conflict: bare, mine: 8 });
    expect(text).toContain(c.someone);
    expect(text).not.toMatch(/[{}]|\s{2}/);
  });
});
