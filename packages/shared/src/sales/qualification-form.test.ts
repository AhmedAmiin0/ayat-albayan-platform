import { describe, expect, it } from 'vitest';
import { leadQualForm, leadQualPatch, type QualText } from './qualification-form.js';

const TEXT: QualText = {
  ageInvalid: 'age',
  invalidTimeZone: 'tz',
  invalidTime: 'time',
  endBeforeStart: 'end',
  error: 'error',
  phoneErrors: { missing_country_code: 'phone-cc' },
};
const STORED = { student_name: 'سهيلة', age: 9, gender: 'female', tz: 'Asia/Riyadh', available_days: [4, 0], preferred_from: '16:00', preferred_to: '18:00' };
const patchOf = (patch: Record<string, unknown>) => {
  const before = leadQualForm(STORED);
  return leadQualPatch({ ...before, ...patch }, before, TEXT);
};

describe('lead qualification form (R-LEAD-03)', () => {
  it('reads any jsonb shape: strings, sorted whole days, unknown enums dropped', () => {
    expect(leadQualForm(STORED)).toMatchObject({ student_name: 'سهيلة', age: '9', gender: 'female', available_days: [0, 4], city: '' });
    expect(leadQualForm(null)).toMatchObject({ student_name: '', gender: '', available_days: [] });
    expect(leadQualForm({ gender: 'x', filled_by: 'guardian', group_kind: 'nope', available_days: [1.5, 2] })).toMatchObject({
      gender: '',
      filled_by: 'guardian',
      group_kind: '',
      available_days: [2],
    });
  });

  it('sends only what changed: age as a number, emptied text and days as null', () => {
    expect(patchOf({})).toEqual({ ok: true, patch: {} });
    expect(patchOf({ age: '10', goal: ' ختم ', student_name: '  ', available_days: [] })).toEqual({
      ok: true,
      patch: { age: 10, goal: 'ختم', student_name: null, available_days: null },
    });
    expect(patchOf({ alt_phone: '0501234567', group_kind: 'group' })).toEqual({ ok: true, patch: { alt_phone: '+966501234567', group_kind: 'group' } });
  });

  it('errors use the injected words', () => {
    expect(patchOf({ preferred_to: '15:00' })).toEqual({ ok: false, errors: { preferred_to: 'end' } });
    expect(patchOf({ age: '200' })).toEqual({ ok: false, errors: { age: 'age' } });
    expect(patchOf({ tz: 'Mars/Base' })).toEqual({ ok: false, errors: { tz: 'tz' } });
    expect(patchOf({ alt_phone: '12345' })).toEqual({ ok: false, errors: { alt_phone: 'phone-cc' } });
    expect(patchOf({ preferred_from: '25:00', preferred_to: '' })).toEqual({ ok: false, errors: { preferred_from: 'time' } });
  });
});
