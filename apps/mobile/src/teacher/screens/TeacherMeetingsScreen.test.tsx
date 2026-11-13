import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { MeetingsScreen } from '@/meetings';
import { renderWithQuery, teacherPagesClient } from '@/test/query';
import { TeacherMeetingsScreen } from './TeacherMeetingsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useSegments: () => ['teacher'] }));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(async () => []),
}));

const INSTANT = t.meetings.new;
const SCHEDULED = t.meetingInvites.scheduledItem;
const button = (name: string) => screen.queryByRole('button', { name });

test('the teacher sees only the start button her switch allows', async () => {
  const client = teacherPagesClient(false, { teacher_scheduled_meetings_enabled: true });
  await renderWithQuery(<TeacherMeetingsScreen />, client);
  expect(await screen.findByRole('button', { name: SCHEDULED })).toBeTruthy();
  expect(button(INSTANT)).toBeNull();
});

test('admin, sales and assistant (the shared screen, no props): both buttons, the switches ignored', async () => {
  await renderWithQuery(<MeetingsScreen />, teacherPagesClient(false));
  expect(await screen.findByRole('button', { name: INSTANT })).toBeTruthy();
  expect(button(SCHEDULED)).toBeTruthy();
});
