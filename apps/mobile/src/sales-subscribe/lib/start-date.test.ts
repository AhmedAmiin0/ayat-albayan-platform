import { t } from '@/core/lib/i18n/i18n';
import { checkStart, type StartDraft } from './start-date';

const today = '2026-10-12';
const draft: StartDraft = { day: today, alreadyStarted: false, past: today };

test('without the permission nothing is sent, whatever the draft says', () => {
  expect(checkStart({ ...draft, alreadyStarted: true, past: '2026-01-01' }, { canSet: false, today })).toEqual({ ok: true, body: {} });
});

test('with it: a chip day is sent alone; a past chip needs the switch', () => {
  expect(checkStart({ ...draft, day: '2026-10-14' }, { canSet: true, today })).toEqual({ ok: true, body: { startsOn: '2026-10-14' } });
  expect(checkStart({ ...draft, day: '2026-10-01' }, { canSet: true, today })).toEqual({
    ok: false,
    error: t.salesMoney.error.start_date_past,
  });
});

test('the switch on: the picked past day down to a year back, with alreadyStarted', () => {
  const on = { ...draft, alreadyStarted: true };
  expect(checkStart({ ...on, past: '2025-10-12' }, { canSet: true, today })).toEqual({
    ok: true,
    body: { startsOn: '2025-10-12', alreadyStarted: true },
  });
  expect(checkStart({ ...on, past: '2025-10-11' }, { canSet: true, today })).toEqual({
    ok: false,
    error: t.salesMoney.error.start_date_too_old,
  });
});

test('the switch on with today still picked: today, with alreadyStarted', () => {
  expect(checkStart({ ...draft, alreadyStarted: true }, { canSet: true, today })).toEqual({
    ok: true,
    body: { startsOn: today, alreadyStarted: true },
  });
});
