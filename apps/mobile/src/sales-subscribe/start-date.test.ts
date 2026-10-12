import { t } from '@/lib/i18n';
import { checkStart, type StartDraft, typedDay } from './start-date';

const today = '2026-10-12';
const draft: StartDraft = { day: today, alreadyStarted: false, typed: today };

test('without the permission nothing is sent, whatever the draft says', () => {
  expect(checkStart({ ...draft, alreadyStarted: true, typed: '2026-01-01' }, { canSet: false, today })).toEqual({ ok: true, body: {} });
});

test('with it: a chip day is sent alone; a past chip needs the switch', () => {
  expect(checkStart({ ...draft, day: '2026-10-14' }, { canSet: true, today })).toEqual({ ok: true, body: { startsOn: '2026-10-14' } });
  expect(checkStart({ ...draft, day: '2026-10-01' }, { canSet: true, today })).toEqual({
    ok: false,
    error: t.salesMoney.error.start_date_past,
  });
});

test('the switch on: a typed past day down to a year back, with alreadyStarted', () => {
  const on = { ...draft, alreadyStarted: true };
  expect(checkStart({ ...on, typed: '2025-10-12' }, { canSet: true, today })).toEqual({
    ok: true,
    body: { startsOn: '2025-10-12', alreadyStarted: true },
  });
  expect(checkStart({ ...on, typed: '2025-10-11' }, { canSet: true, today })).toEqual({
    ok: false,
    error: t.salesMoney.error.start_date_too_old,
  });
  expect(checkStart({ ...on, typed: '12/10/2026' }, { canSet: true, today })).toEqual({ ok: false, error: t.salesMoney.startedOnInvalid });
});

test('typed days: Arabic digits read, impossible days refused', () => {
  expect(typedDay(' ٢٠٢٦-٠٣-١٥ ')).toBe('2026-03-15');
  expect(typedDay('۲۰۲۶-۰۳-۱۵')).toBe('2026-03-15');
  expect(typedDay('2026-02-30')).toBeNull();
  expect(typedDay('2026-3-5')).toBeNull();
});
