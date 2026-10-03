import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { bookFailure } from './booking-errors';
import { SUN_17 } from './fixtures';

const END = '2026-10-04T14:45:00.000Z';

test('409 conflict: one Arabic line per clash on the Riyadh clock; junk entries dropped', () => {
  const error = new ApiError(409, {
    code: 'conflict',
    message: 'conflict',
    conflicts: [
      { kind: 'teacher_busy', startsAt: SUN_17, endsAt: END, lessonId: 'l1' },
      { kind: 'time_off', startsAt: SUN_17, endsAt: END },
      { kind: 'made_up', startsAt: SUN_17 },
      'nonsense',
    ],
  });
  expect(bookFailure(error)).toEqual({
    kind: 'conflict',
    lines: [
      'المعلم/ة مشغول/ة بحلقة أخرى في هذا الموعد (الأحد 4 أكتوبر 17:00)',
      'المعلم/ة في إجازة في هذا الموعد (الأحد 4 أكتوبر 17:00)',
    ],
  });
});

test('409 duplicate_student: the similar-named children on file', () => {
  const error = new ApiError(409, {
    code: 'duplicate_student',
    message: 'duplicate_student',
    guardian_id: 'g1',
    candidates: [
      { id: 's1', name: 'يوسف', code: 'AB-0100', status: 'active' },
      { id: 's2', name: 'يوسف علي' },
      { id: 3 },
    ],
  });
  expect(bookFailure(error)).toEqual({
    kind: 'duplicate',
    candidates: [
      { id: 's1', name: 'يوسف', code: 'AB-0100' },
      { id: 's2', name: 'يوسف علي', code: null },
    ],
  });
});

test('no answer at all: offline, and the retry will not book twice', () => {
  expect(bookFailure(new TypeError('Network request failed'))).toEqual({
    kind: 'error',
    text: t.booking.mobile.offline,
  });
});

test('a refused or missing invoice sends the admin back to «الفاتورة» with its own line', () => {
  for (const [status, code] of [[400, 'invoice_required'], [400, 'invoice_path'], [400, 'invoice_message'], [410, 'media_expired'], [413, 'invoice_too_large']] as const) {
    expect(bookFailure(new ApiError(status, { code }))).toEqual({
      kind: 'invoice',
      text: t.booking.error[code],
    });
  }
});

test('a makeup the API refuses says why, wherever the status', () => {
  expect(bookFailure(new ApiError(409, { code: 'makeup_not_eligible' }))).toEqual({
    kind: 'error',
    text: t.booking.error.makeup_not_eligible,
  });
  expect(bookFailure(new ApiError(409, { code: 'makeup_exists' }))).toEqual({
    kind: 'error',
    text: t.booking.error.makeup_exists,
  });
});

test('anything else is the generic error', () => {
  const generic = { kind: 'error', text: t.common.error };
  expect(bookFailure(new ApiError(500, null))).toEqual(generic);
  expect(bookFailure(new ApiError(404, { code: 'lead_not_found' }))).toEqual(generic);
  expect(bookFailure(new ApiError(409, { code: 'invalid_transition' }))).toEqual(generic);
  expect(bookFailure(new ApiError(409, { code: 'duplicate_student', candidates: [] }))).toEqual(
    generic,
  );
  expect(bookFailure(new Error('booking_incomplete'))).toEqual(generic);
});
