import type { Permission } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { canDescribe, checkDescription, counterText, describeError, descriptionOf } from './description-text';
import { entryOf } from './entries-fixtures';

const d = t.mobileValues.description;
const holds =
  (...held: Permission[]) =>
  (p: Permission) =>
    held.includes(p);
const KEY = 'booking_horizon_weeks';

describe('descriptionOf', () => {
  test('Arabic: the admin text, else the hint, else the seed', () => {
    const edited = entryOf(KEY, { description: 'نص المدير' });
    expect(descriptionOf({ entry: edited, hint: 'تلميح', locale: 'ar' })).toBe('نص المدير');
    expect(descriptionOf({ entry: entryOf(KEY), hint: 'تلميح', locale: 'ar' })).toBe('تلميح');
    expect(descriptionOf({ entry: entryOf(KEY), hint: undefined, locale: 'ar' })).toBe('الوصف المزروع');
    const bare = entryOf(KEY, { descriptionSeed: null });
    expect(descriptionOf({ entry: bare, hint: undefined, locale: 'ar' })).toBeUndefined();
  });
  test('no row (older API) or English: the hint', () => {
    expect(descriptionOf({ entry: undefined, hint: 'تلميح', locale: 'ar' })).toBe('تلميح');
    expect(descriptionOf({ entry: entryOf(KEY, { description: 'نص' }), hint: 'Hint', locale: 'en' })).toBe('Hint');
  });
});

describe('canDescribe', () => {
  const plain = entryOf(KEY);
  type Owner = 'messages_gate' | 'communications' | 'google_sync' | 'notifications';
  const owned = (ownedBy: Owner) => entryOf(KEY, { ownedBy });
  const writer = holds('settings.write');

  test('settings.write on a plain key; never without a row', () => {
    expect(canDescribe({ entry: plain, can: writer, admin: false })).toBe(true);
    expect(canDescribe({ entry: plain, can: holds('settings.read'), admin: true })).toBe(false);
    expect(canDescribe({ entry: undefined, can: writer, admin: true })).toBe(false);
  });
  test('owned keys need the module permission too', () => {
    expect(canDescribe({ entry: owned('messages_gate'), can: writer, admin: false })).toBe(true);
    expect(canDescribe({ entry: owned('communications'), can: writer, admin: true })).toBe(false);
    const comms = holds('settings.write', 'numbers.manage');
    expect(canDescribe({ entry: owned('communications'), can: comms, admin: false })).toBe(true);
    expect(canDescribe({ entry: owned('google_sync'), can: writer, admin: false })).toBe(false);
    expect(canDescribe({ entry: owned('google_sync'), can: writer, admin: true })).toBe(true);
    expect(canDescribe({ entry: owned('google_sync'), can: holds(), admin: true })).toBe(false);
    expect(canDescribe({ entry: owned('notifications'), can: writer, admin: true })).toBe(false);
    expect(canDescribe({ entry: owned('notifications'), can: holds('settings.write', 'notifications.manage'), admin: false })).toBe(true);
  });
});

test('checkDescription trims, refuses empty and over 500', () => {
  expect(checkDescription('  نص  ')).toEqual({ ok: true, text: 'نص' });
  expect(checkDescription('   ')).toEqual({ ok: false, error: d.required });
  expect(checkDescription('ا'.repeat(501))).toEqual({ ok: false, error: d.tooLong.replace('{max}', '500') });
  expect(checkDescription(` ${'ا'.repeat(500)} `).ok).toBe(true);
});

test('describeError: 403, 400/422, anything else', () => {
  expect(describeError(new ApiError(403))).toBe(d.forbidden);
  expect(describeError(new ApiError(422))).toBe(d.invalid);
  expect(describeError(new ApiError(400))).toBe(d.invalid);
  expect(describeError(new ApiError(500))).toBe(d.saveFailed);
  expect(describeError(new Error('offline'))).toBe(d.saveFailed);
});

test('counterText', () => {
  expect(counterText('abc')).toBe('3 / 500');
});
