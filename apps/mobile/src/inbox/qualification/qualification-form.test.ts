import { t } from '@/lib/i18n';
import { qualForm, qualPatch, timeOptions } from './qualification-form';

const STORED = {
  student_name: 'سهيلة',
  age: 9,
  gender: 'female',
  tz: 'Asia/Riyadh',
  available_days: [4, 0],
  preferred_from: '16:00',
  preferred_to: '18:00',
};

test('reads any jsonb shape: strings for inputs, sorted days, unknown gender dropped', () => {
  expect(qualForm(STORED)).toMatchObject({ student_name: 'سهيلة', age: '9', gender: 'female', available_days: [0, 4] });
  expect(qualForm(null)).toMatchObject({ student_name: '', gender: '', available_days: [] });
  expect(qualForm({ gender: 'x', available_days: 'mon' })).toMatchObject({ gender: '', available_days: [] });
});

test('nothing changed → an empty patch', () => {
  const form = qualForm(STORED);
  expect(qualPatch(form, form)).toEqual({ ok: true, patch: {} });
});

test('sends only what changed: age as a number, an emptied field as null', () => {
  const before = qualForm(STORED);
  const after = { ...before, age: '10', goal: ' ختم جزء عم ', student_name: '  ' };
  expect(qualPatch(after, before)).toEqual({ ok: true, patch: { age: 10, goal: 'ختم جزء عم', student_name: null } });
});

test('days and the time range are structured values, cleared with null', () => {
  const before = qualForm(STORED);
  expect(qualPatch({ ...before, available_days: [] }, before)).toEqual({ ok: true, patch: { available_days: null } });
  expect(qualPatch({ ...before, available_days: [0, 4, 5] }, before)).toEqual({
    ok: true,
    patch: { available_days: [0, 4, 5] },
  });
  expect(qualPatch({ ...before, preferred_from: '', preferred_to: '' }, before)).toEqual({
    ok: true,
    patch: { preferred_from: null, preferred_to: null },
  });
});

test('refuses an end before the start, an impossible age and an unknown zone', () => {
  const before = qualForm(STORED);
  expect(qualPatch({ ...before, preferred_to: '15:00' }, before)).toEqual({
    ok: false,
    errors: { preferred_to: t.common.endBeforeStart },
  });
  expect(qualPatch({ ...before, age: '200' }, before)).toEqual({ ok: false, errors: { age: t.students.ageInvalid } });
  expect(qualPatch({ ...before, age: 'تسعة' }, before)).toEqual({ ok: false, errors: { age: t.students.ageInvalid } });
  expect(qualPatch({ ...before, tz: 'Mars/Base' }, before)).toEqual({ ok: false, errors: { tz: t.common.invalidTimeZone } });
});

test('the old form’s family questions: read, sent when changed, the other number as E.164', () => {
  const v1 = { city: 'جدة', filled_by: 'guardian', guardian_relation: 'الأب', group_kind: 'x', alt_phone: '+966552147730' };
  const before = qualForm(v1);
  expect(before).toMatchObject({ city: 'جدة', filled_by: 'guardian', guardian_relation: 'الأب', group_kind: '' });
  const after = { ...before, guardian_name: ' أبو سهيلة ', alt_phone: '٠٥٥١٢٣٤٥٦٧', group_kind: 'group' as const, notes: 'بعد العصر' };
  expect(qualPatch(after, before)).toEqual({
    ok: true,
    patch: { guardian_name: 'أبو سهيلة', alt_phone: '+966551234567', group_kind: 'group', notes: 'بعد العصر' },
  });
  expect(qualPatch({ ...before, filled_by: '', city: '' }, before)).toEqual({ ok: true, patch: { city: null, filled_by: null } });
  expect(qualPatch({ ...before, alt_phone: '0101234' }, before)).toEqual({
    ok: false,
    errors: { alt_phone: t.common.phoneErrors.missing_country_code },
  });
});

test('time choices: 30-minute steps to 23:59; a stored off-grid time stays pickable', () => {
  const all = timeOptions('');
  expect(all).toHaveLength(49);
  expect([all[0], all[1], all[32], all[48]]).toEqual(['00:00', '00:30', '16:00', '23:59']);
  expect(timeOptions('16:00')).toBe(all);
  expect(timeOptions('16:15')).toContain('16:15');
  expect(timeOptions('16:15').indexOf('16:15')).toBe(33);
});
