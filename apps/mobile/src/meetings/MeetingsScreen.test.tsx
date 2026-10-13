import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking, Share } from 'react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { MeetingsScreen } from './MeetingsScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useSegments: () => ['(tabs)'] }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const L = t.meetings.internal;
const base = { created_by: 'u1', created_at: '2026-10-05T11:30:00.000Z', ends_at: null, starts_at: null, planned_end_at: null, cancelled_at: null, window: null, invitees_count: 0, my_invite: null };
const mine = { ...base, id: 'm1', title: 'اجتماع الإدارة', state: 'open', can_manage: true, can_join: true };
const others = { ...base, id: 'm2', title: 'اجتماع المعلمين', state: 'open', can_manage: false, can_join: true };
const over = { ...base, id: 'm3', title: 'اجتماع قديم', state: 'ended', can_manage: true, can_join: false };
let openURL: jest.SpyInstance;
let share: jest.SpyInstance;
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue([mine, others, over]);
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
});

test('the list shows each meeting with the actions its state and role allow', async () => {
  await renderWithQuery(<MeetingsScreen />);
  expect(await screen.findByText('اجتماع الإدارة')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: L.enter })).toHaveLength(2); // open ones only
  expect(screen.getAllByRole('button', { name: L.end })).toHaveLength(1); // open + can_manage
  expect(screen.getAllByRole('button', { name: L.newLink })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: t.classroom.recordings.title })).toHaveLength(2); // can_manage
});

test('enter asks the API, then opens the web room in the system browser', async () => {
  mockApiSend.mockResolvedValue({});
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText('اجتماع الإدارة');
  await fireEvent.press(screen.getAllByRole('button', { name: L.enter })[0] as never);
  await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://app.ayatalbayan.com/meeting/m1'));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/meetings/m1/join');
});

test('a refused join (ended) reads its message and opens nothing', async () => {
  mockApiSend.mockRejectedValue(new ApiError(410, { code: 'meeting_ended' }));
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText('اجتماع الإدارة');
  await fireEvent.press(screen.getAllByRole('button', { name: L.enter })[0] as never);
  expect(await screen.findByText(t.classroom.error.meeting_ended)).toBeTruthy();
  expect(openURL).not.toHaveBeenCalled();
});

test('ending asks first, then POSTs and refreshes the list', async () => {
  mockApiSend.mockResolvedValue(undefined);
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText('اجتماع الإدارة');
  await press(L.end);
  expect(mockApiSend).not.toHaveBeenCalled();
  await press(t.mobileClassroom.endAction);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/meetings/m1/end'));
  const lists = () => mockApiFetch.mock.calls.filter(([p]) => p === '/meetings').length;
  await waitFor(() => expect(lists()).toBe(2));
});

test('a new link asks first (the old one stops), then goes to the share sheet', async () => {
  mockApiSend.mockResolvedValue({ id: 'm1', url: 'https://app/m/tok' });
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText('اجتماع الإدارة');
  await press(L.newLink);
  await press(t.mobileClassroom.newLinkAction);
  expect(await screen.findByText(t.mobileClassroom.newLinkReady)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/meetings/m1/link');
  await press(t.mobileClassroom.shareLink);
  expect(share).toHaveBeenCalledWith({ message: 'https://app/m/tok' });
});

test('«التسجيلات» opens the meeting’s recordings', async () => {
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText('اجتماع الإدارة');
  await fireEvent.press(screen.getAllByRole('button', { name: t.classroom.recordings.title })[0] as never);
  expect(router.push).toHaveBeenCalledWith('/more/live/meetings/m1');
});

test('creating: optional title, then the link to share and «ادخل الاجتماع»', async () => {
  mockApiSend.mockResolvedValue({ id: 'm9', url: 'https://app/m/new', invitees: [], replayed: false });
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText('اجتماع الإدارة');
  await press(t.meetings.new);
  await fireEvent.changeText(screen.getByLabelText(L.title), '  لقاء الصباح ');
  await press(L.create);
  expect(await screen.findByText(L.ready)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/meetings', { title: 'لقاء الصباح', clientRequestId: expect.any(String) });
  await fireEvent.press(screen.getAllByRole('button', { name: L.enter })[0] as never);
  await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://app.ayatalbayan.com/meeting/m9'));
});

test('a failed create keeps the form and shows the error', async () => {
  mockApiSend.mockRejectedValue(new Error('x'));
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText('اجتماع الإدارة');
  await press(t.meetings.new);
  await press(L.create);
  expect(await screen.findByText(L.error)).toBeTruthy();
  expect(screen.getByLabelText(L.title)).toBeTruthy();
});

test('empty and failed lists have their own states', async () => {
  mockApiFetch.mockResolvedValue([]);
  const first = await renderWithQuery(<MeetingsScreen />);
  expect(await screen.findByText(L.empty)).toBeTruthy();
  await first.unmount();
  mockApiFetch.mockRejectedValue(new Error('x'));
  await renderWithQuery(<MeetingsScreen />);
  expect(await screen.findByRole('alert')).toBeTruthy();
});
