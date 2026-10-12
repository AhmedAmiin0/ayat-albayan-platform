import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { CreateMeeting } from './CreateMeeting';
import { MeetingActions } from './MeetingActions';

let mockSegments: string[] = ['(tabs)'];
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useSegments: () => mockSegments }));
const mockApiSend = jest.fn();
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const meeting = {
  id: 'm1', title: 'x', state: 'open', can_manage: true, can_join: true, created_by: 'u', created_at: '2026-10-05T11:30:00.000Z', ends_at: null,
  starts_at: null, planned_end_at: null, cancelled_at: null, window: null, invitees_count: 0, my_invite: null,
} as const;
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
beforeEach(() => {
  jest.clearAllMocks();
  mockSegments = ['(tabs)'];
  mockApiFetch.mockResolvedValue({ permissions: [] });
});

test.each([
  [['(tabs)'], '/more/live/meetings/m1'],
  [['teacher'], '/teacher/more/meetings/m1'],
])('recordings opens the route of the current stack %j', async (segments, path) => {
  mockSegments = segments;
  await renderWithQuery(<MeetingActions meeting={meeting} tz="Asia/Riyadh" />);
  await press(t.classroom.recordings.title);
  expect(router.push).toHaveBeenCalledWith(path);
});

test('cancel is ignored while ending is in flight', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<MeetingActions meeting={meeting} tz="Asia/Riyadh" />);
  await press(t.meetings.internal.end);
  await press(t.mobileClassroom.endAction);
  await waitFor(() => expect(screen.getByRole('button', { name: t.mobileClassroom.endAction }).props.accessibilityState.busy).toBe(true));
  await press(t.common.cancel);
  expect(screen.getByText(t.mobileClassroom.endConfirm)).toBeTruthy();
});

test('a failed end is cleared when a new link is asked for', async () => {
  mockApiSend.mockRejectedValueOnce(new ApiError(500, null));
  await renderWithQuery(<MeetingActions meeting={meeting} tz="Asia/Riyadh" />);
  await press(t.meetings.internal.end);
  await press(t.mobileClassroom.endAction);
  expect(await screen.findByText(t.meetings.internal.actionError)).toBeTruthy();
  await press(t.meetings.internal.newLink);
  await waitFor(() => expect(screen.queryByText(t.meetings.internal.actionError)).toBeNull());
});

test('«اجتماع جديد» needs meetings.write', async () => {
  mockApiFetch.mockResolvedValue({ permissions: ['meetings.read'] });
  await renderWithQuery(<CreateMeeting />);
  await waitFor(() => expect(screen.queryByRole('button', { name: t.meetings.new })).toBeNull());
});
