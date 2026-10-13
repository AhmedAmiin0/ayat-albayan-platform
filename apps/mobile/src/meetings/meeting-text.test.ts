import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { manageOf, meetingError, meetingsBase, meetingUrl, meetingWhen } from './meeting-text';

test('the room url is the web origin plus /meeting/<id>', () => {
  expect(meetingUrl('m-1')).toBe('https://app.ayatalbayan.com/meeting/m-1');
});

test('the time is on the Riyadh clock with Western digits', () => {
  expect(meetingWhen('2026-10-05T11:30:00.000Z')).toMatch(/14:30/);
  expect(meetingWhen('2026-10-05T11:30:00.000Z', 'UTC')).toMatch(/11:30/);
});

test('a coded refusal reads in words; the rest is the generic line', () => {
  expect(meetingError(new ApiError(410, { code: 'meeting_ended' }))).toBe(t.classroom.error.meeting_ended);
  expect(meetingError(new ApiError(404, { code: 'meeting_not_found' }))).toBe(t.classroom.error.meeting_not_found);
  expect(meetingError(new Error('x'))).toBe(t.meetings.internal.actionError);
});

test('recordings open in the tree that shows the meeting', () => {
  expect(meetingsBase('teacher')).toBe('/teacher/more');
  expect(meetingsBase('assistant')).toBe('/assistant/lessons');
  expect(meetingsBase('sales')).toBe('/sales/more');
  expect(meetingsBase('(tabs)')).toBe('/more/live');
  expect(meetingsBase(undefined)).toBe('/more/live');
});

test('only an open, not cancelled meeting of mine is managed; a scheduled one may move', () => {
  const mine = { state: 'open', can_manage: true, cancelled_at: null, starts_at: '2026-10-20T14:00:00.000Z' } as const;
  expect(manageOf(mine)).toEqual({ manage: true, startsAt: '2026-10-20T14:00:00.000Z' });
  expect(manageOf({ ...mine, starts_at: null })).toEqual({ manage: true, startsAt: null });
  expect(manageOf({ ...mine, cancelled_at: '2026-10-10T00:00:00Z' })).toEqual({ manage: false, startsAt: null });
  expect(manageOf({ ...mine, can_manage: false })).toEqual({ manage: false, startsAt: null });
  expect(manageOf({ ...mine, state: 'ended' })).toEqual({ manage: false, startsAt: null });
});

test('a refused join reads in a meeting\u2019s words, before the classroom lines', () => {
  const R = t.meetings.internal.refusal;
  const early = meetingError(new ApiError(403, { code: 'join_not_open_yet', opens_at: '2026-10-05T11:30:00.000Z' }), 'Asia/Riyadh');
  expect(early).toBe(R.notOpenAt.replace('{when}', meetingWhen('2026-10-05T11:30:00.000Z', 'Asia/Riyadh')));
  expect(early).toMatch(/14:30/);
  expect(meetingError(new ApiError(403, { code: 'join_not_open_yet', opens_at: '2026-10-05T11:30:00.000Z' }), 'UTC')).toMatch(/11:30/);
  expect(meetingError(new ApiError(403, { code: 'join_not_open_yet' }))).toBe(R.notOpen);
  expect(meetingError(new ApiError(410, { code: 'join_closed' }))).toBe(R.closed);
  expect(meetingError(new ApiError(403, { statusCode: 403, message: 'Forbidden' }))).toBe(R.forbidden);
  expect(meetingError(new ApiError(403, null))).toBe(R.forbidden);
  for (const line of [early, R.notOpen, R.closed, R.forbidden]) {
    expect(line).not.toContain('الحلقة');
    expect(line).not.toMatch(/\b15\b/);
  }
});
