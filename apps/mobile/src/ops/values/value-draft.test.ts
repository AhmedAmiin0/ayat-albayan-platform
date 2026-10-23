import { t } from '@/lib/i18n';
import { choicesOf, confirmOf, draftOf, editorOf, parseDraft, sameValue } from './value-draft';
import { outcomeOf } from './use-save-value';

describe('editorOf: scalars are edited on the phone, the rest stays on the web', () => {
  test.each([
    ['booking_horizon_weeks', 'int'],
    ['late_cancel_hours', 'nullableInt'],
    ['teachers_always_available', 'bool'],
    ['reporting_currency', 'choice'],
    ['academy_timezone', 'choice'],
    ['feedback_mode', 'choice'],
    ['academy_whatsapp_e164', 'text'],
    ['default_meeting_title', 'text'],
    ['academy_contact', 'readonly'],
    ['recording_consent_notice', 'readonly'],
    ['follow_up_hours', 'readonly'],
    ['messaging_enabled', 'readonly'],
  ] as const)('%s → %s', (key, kind) => expect(editorOf(key)).toBe(kind));
});

test('draftOf: a number that is off starts from its «on» value', () => {
  expect(draftOf('late_cancel_hours', null)).toEqual({ on: false, text: '24' });
  expect(draftOf('late_cancel_hours', 6)).toEqual({ on: true, text: '6' });
  expect(draftOf('meeting_link_auto', true)).toEqual({ on: true, text: '' });
  expect(draftOf('reporting_currency', 'SAR')).toEqual({ on: true, text: 'SAR' });
});

test('parseDraft checks with the API schema; Arabic-Indic digits are read', () => {
  expect(parseDraft('booking_horizon_weeks', { on: true, text: '٨' })).toEqual({ ok: true, value: 8 });
  expect(parseDraft('booking_horizon_weeks', { on: true, text: '' })).toEqual({ ok: false, error: t.settings.invalid });
  expect(parseDraft('booking_horizon_weeks', { on: true, text: '999' }).ok).toBe(false);
  expect(parseDraft('late_cancel_hours', { on: false, text: '24' })).toEqual({ ok: true, value: null });
  expect(parseDraft('meeting_link_auto', { on: false, text: '' })).toEqual({ ok: true, value: false });
  expect(parseDraft('academy_whatsapp_e164', { on: true, text: '+966 5000' })).toEqual({
    ok: false,
    error: t.settings.invalidPhone,
  });
  expect(parseDraft('academy_whatsapp_e164', { on: true, text: '+966 500 000 000' })).toEqual({
    ok: true,
    value: '+966500000000',
  });
});

test('choicesOf keeps a stored value outside the list first', () => {
  expect(choicesOf('feedback_mode', 'buttons')).toEqual(['buttons', 'link']);
  expect(choicesOf('reporting_currency', 'SAR')).toContain('EGP');
  expect(choicesOf('reporting_currency', 'GBP')[0]).toBe('GBP');
  expect(choicesOf('academy_timezone', 'Asia/Riyadh')[0]).toBe('Asia/Riyadh');
});

test('confirmOf: typed only for a number of days, plain for the switches', () => {
  expect(confirmOf('recording_retention_days', 90)).toBe('typed');
  expect(confirmOf('recording_retention_days', null)).toBeNull();
  expect(confirmOf('activity_retention_days', 30)).toBe('typed');
  expect(confirmOf('sales_auto_assign', true)).toBe('plain');
  expect(confirmOf('booking_horizon_weeks', 8)).toBeNull();
});

test('sameValue compares by content', () => {
  expect(sameValue([1, 2], [1, 2])).toBe(true);
  expect(sameValue(null, 0)).toBe(false);
});

test('outcomeOf: a key listed in `moved` (snake or camel) was not written', () => {
  expect(outcomeOf('booking_horizon_weeks', { booking_horizon_weeks: 8 })).toBe('saved');
  expect(outcomeOf('booking_horizon_weeks', { saved: [], moved: ['booking_horizon_weeks'] })).toBe('moved');
  expect(outcomeOf('booking_horizon_weeks', { saved: [], moved: ['bookingHorizonWeeks'] })).toBe('moved');
  expect(outcomeOf('booking_horizon_weeks', { saved: ['booking_horizon_weeks'], moved: [] })).toBe('saved');
  expect(outcomeOf('booking_horizon_weeks', null)).toBe('saved');
});
