import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { qualForm, qualPatch } from './qualification-form';

const STORED = {
  student_name: 'سهيلة',
  age: 9,
  gender: 'female',
  tz: 'Asia/Riyadh',
  available_days: [4, 0],
  preferred_from: '16:00',
  preferred_to: '18:00',
};

describe('qualification form (R-LEAD-03)', () => {
  it('reads any jsonb shape: strings for inputs, sorted days, unknown gender dropped', () => {
    const form = qualForm(STORED);
    expect(form).toMatchObject({ student_name: 'سهيلة', age: '9', gender: 'female', available_days: [0, 4] });
    expect(qualForm(null)).toMatchObject({ student_name: '', gender: '', available_days: [] });
    expect(qualForm({ gender: 'x', available_days: 'mon' })).toMatchObject({ gender: '', available_days: [] });
  });

  it('nothing changed → an empty patch', () => {
    const form = qualForm(STORED);
    expect(qualPatch(form, form)).toEqual({ ok: true, patch: {} });
  });

  it('sends only what changed: age as a number, an emptied field as null', () => {
    const before = qualForm(STORED);
    const after = { ...before, age: '10', goal: ' ختم جزء عم ', student_name: '  ' };
    expect(qualPatch(after, before)).toEqual({
      ok: true,
      patch: { age: 10, goal: 'ختم جزء عم', student_name: null },
    });
  });

  it('days and the time range are structured values, cleared with null', () => {
    const before = qualForm(STORED);
    expect(qualPatch({ ...before, available_days: [] }, before)).toEqual({ ok: true, patch: { available_days: null } });
    expect(qualPatch({ ...before, available_days: [0, 4, 5] }, before)).toEqual({
      ok: true,
      patch: { available_days: [0, 4, 5] },
    });
  });

  it('refuses an end before the start, an impossible age and an unknown zone', () => {
    const before = qualForm(STORED);
    expect(qualPatch({ ...before, preferred_to: '15:00' }, before)).toEqual({
      ok: false,
      errors: { preferred_to: t.common.endBeforeStart },
    });
    expect(qualPatch({ ...before, age: '200' }, before)).toEqual({ ok: false, errors: { age: t.settings.invalid } });
    expect(qualPatch({ ...before, tz: 'Mars/Base' }, before)).toEqual({
      ok: false,
      errors: { tz: t.common.invalidTimeZone },
    });
  });
});
