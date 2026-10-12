import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { dayChipLabel, inviteError, opensLine, resultLabel, scheduleLine, tzNote } from './invite-text';

const I = t.meetingInvites;

test('a scheduled meeting reads its time in the viewer zone; an instant one says so', () => {
  expect(scheduleLine({ starts_at: '2026-10-20T14:00:00.000Z' }, 'Asia/Riyadh')).toBe(I.list.scheduledFor.replace('{when}', 'الثلاثاء 20 أكتوبر 17:00'));
  expect(scheduleLine({ starts_at: '2026-10-20T14:00:00.000Z' }, 'UTC')).toMatch(/14:00/);
  expect(scheduleLine({ starts_at: null }, 'UTC')).toBe(I.list.instant);
});

test('«يُفتح الدخول» only before the window opens, never on a cancelled one', () => {
  const window = { state: 'early', opens_at: '2026-10-20T13:45:00.000Z', closes_at: '2026-10-20T17:00:00.000Z' } as const;
  expect(opensLine({ window, cancelled_at: null, state: 'open' }, 'Asia/Riyadh')).toMatch(/16:45/);
  expect(opensLine({ window, cancelled_at: '2026-10-19T00:00:00Z', state: 'ended' }, 'Asia/Riyadh')).toBeNull();
  expect(opensLine({ window: { ...window, state: 'open' }, cancelled_at: null, state: 'open' }, 'UTC')).toBeNull();
  expect(opensLine({ window: null, cancelled_at: null, state: 'open' }, 'UTC')).toBeNull();
});

test('each recipient outcome has its words', () => {
  expect(resultLabel({ status: 'sent', channel: 'in_app' })).toBe(I.results.inApp);
  expect(resultLabel({ status: 'sent', channel: 'whatsapp' })).toBe(I.results.sent);
  expect(resultLabel({ status: 'window_closed', channel: 'link' })).toBe(I.results.windowClosed);
  expect(resultLabel({ status: 'failed', channel: 'whatsapp' })).toBe(I.results.failed);
  expect(resultLabel({ status: 'cancelled', channel: 'whatsapp' })).toBe(I.results.cancelled);
  expect(resultLabel({ status: 'pending', channel: 'whatsapp' })).toBe(I.results.pending);
});

test('a coded refusal reads its own line, anything else the fallback', () => {
  expect(inviteError(new ApiError(400, { code: 'starts_in_past' }))).toBe(I.errors.starts_in_past);
  expect(inviteError(new ApiError(409, { code: 'invite_limit' }))).toBe(I.errors.invite_limit);
  expect(inviteError(new ApiError(400, { code: 'not_scheduled' }))).toBe(I.error);
  expect(inviteError(new Error('x'), 'fallback')).toBe('fallback');
});

test('chips and the zone note', () => {
  expect(dayChipLabel('2026-10-12', true)).toBe(I.mobile.today);
  expect(dayChipLabel('2026-10-20', false)).toMatch(/20/);
  expect(tzNote('Asia/Riyadh')).toBe(I.tzNote.replace('{tz}', 'الرياض'));
});
