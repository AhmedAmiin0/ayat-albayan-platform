import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { meetingError, meetingsBase, meetingUrl, meetingWhen } from './meeting-text';

test('the room url is the web origin plus /meeting/<id>', () => {
  expect(meetingUrl('m-1')).toBe('https://app.ayatalbayan.com/meeting/m-1');
});

test('the time is on the Riyadh clock with Western digits', () => {
  expect(meetingWhen('2026-10-05T11:30:00.000Z')).toMatch(/14:30/);
  expect(meetingWhen('2026-10-05T11:30:00.000Z', 'UTC')).toMatch(/11:30/);
});

test('a coded refusal reads in words; a bare 403 is «غير مسموح»; the rest is the generic line', () => {
  expect(meetingError(new ApiError(410, { code: 'meeting_ended' }))).toBe(t.classroom.error.meeting_ended);
  expect(meetingError(new ApiError(404, { code: 'meeting_not_found' }))).toBe(t.classroom.error.meeting_not_found);
  expect(meetingError(new ApiError(403, null))).toBe(t.classroom.error.forbidden);
  expect(meetingError(new Error('x'))).toBe(t.meetings.internal.actionError);
});

test('recordings open in the tree that shows the meeting', () => {
  expect(meetingsBase('teacher')).toBe('/teacher/more');
  expect(meetingsBase('assistant')).toBe('/assistant/lessons');
  expect(meetingsBase('(tabs)')).toBe('/more/live');
  expect(meetingsBase(undefined)).toBe('/more/live');
});
