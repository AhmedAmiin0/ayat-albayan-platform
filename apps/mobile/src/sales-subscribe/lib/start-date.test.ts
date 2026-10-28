import { t } from '@/core/lib/i18n/i18n';
import { checkStart, type StartDraft, usedBeforeOf } from './start-date';

const today = '2026-10-12';
const draft: StartDraft = { day: today, alreadyStarted: false, past: today, usedBefore: 0 };

test('without the permission nothing is sent, whatever the draft says', () => {
  expect(checkStart({ ...draft, alreadyStarted: true, past: '2026-01-01' }, { canSet: false, today, lessonsTotal: 8 })).toEqual({ ok: true, body: {} });
});

test('with it: a chip day is sent alone; a past chip needs the switch', () => {
  expect(checkStart({ ...draft, day: '2026-10-14' }, { canSet: true, today, lessonsTotal: 8 })).toEqual({ ok: true, body: { startsOn: '2026-10-14' } });
  expect(checkStart({ ...draft, day: '2026-10-01' }, { canSet: true, today, lessonsTotal: 8 })).toEqual({
    ok: false,
    error: t.salesMoney.error.start_date_past,
  });
});

test('the switch on: the picked past day down to a year back, with alreadyStarted', () => {
  const on = { ...draft, alreadyStarted: true };
  expect(checkStart({ ...on, past: '2025-10-12' }, { canSet: true, today, lessonsTotal: 8 })).toEqual({
    ok: true,
    body: { startsOn: '2025-10-12', alreadyStarted: true },
  });
  expect(checkStart({ ...on, past: '2025-10-11' }, { canSet: true, today, lessonsTotal: 8 })).toEqual({
    ok: false,
    error: t.salesMoney.error.start_date_too_old,
  });
});

test('the switch on with today still picked: today, with alreadyStarted', () => {
  expect(checkStart({ ...draft, alreadyStarted: true }, { canSet: true, today, lessonsTotal: 8 })).toEqual({
    ok: true,
    body: { startsOn: today, alreadyStarted: true },
  });
});

describe('«حلقات مستخدمة من الباقة» (owner 2026-10-28)', () => {
  const on = { ...draft, alreadyStarted: true, past: '2026-10-01' };
  const ctx = { canSet: true, today, lessonsTotal: 8 };

  test('sent with the past day only above 0', () => {
    expect(checkStart({ ...on, usedBefore: 1 }, ctx)).toEqual({
      ok: true,
      body: { startsOn: '2026-10-01', alreadyStarted: true, lessonsUsedBefore: 1 },
    });
    expect(checkStart(on, ctx)).toEqual({ ok: true, body: { startsOn: '2026-10-01', alreadyStarted: true } });
  });

  test('clamped to every lesson but one of the package now picked; never sent with the switch off', () => {
    expect(usedBeforeOf({ ...on, usedBefore: 7 }, 4)).toBe(3);
    expect(usedBeforeOf({ ...on, usedBefore: 7, alreadyStarted: false }, 8)).toBe(0);
    expect(checkStart({ ...on, usedBefore: 7, alreadyStarted: false, day: today }, ctx)).toEqual({ ok: true, body: { startsOn: today } });
  });

  test('today still picked: refused before posting, as the API would', () => {
    expect(checkStart({ ...on, past: today, usedBefore: 2 }, ctx)).toEqual({
      ok: false,
      error: t.salesMoney.error.used_before_needs_past_start,
    });
  });
});
