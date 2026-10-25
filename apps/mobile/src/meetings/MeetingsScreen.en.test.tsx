import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { MeetingsScreen } from './MeetingsScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const SCHEDULED = {
  starts_at: '2026-10-20T14:00:00.000Z',
  planned_end_at: '2026-10-20T15:00:00.000Z',
  cancelled_at: null,
  window: null,
  invitees_count: 3,
  my_invite: null,
};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useSegments: () => ['(tabs)'] }));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(async () => [
    { id: 'm1', title: 'Staff sync', created_by: 'u', created_at: '2026-10-05T11:30:00.000Z', ends_at: null, state: 'open', can_manage: true, can_join: true, ...SCHEDULED },
  ]),
  apiSend: jest.fn(),
}));

test('the meetings screen reads in English', async () => {
  await renderWithQuery(<MeetingsScreen />);
  expect(await screen.findByText('Staff sync')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Internal meetings' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'New meeting' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'End meeting' })).toBeNull(); // scheduled: reschedule or cancel instead
  expect(screen.getByRole('button', { name: 'Scheduled meeting' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Reschedule' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Cancel meeting' })).toBeTruthy();
  expect(screen.getByText(/When: Tuesday 20 October 17:00 · 3 invited/)).toBeTruthy();
});

test('the schedule form reads in English', async () => {
  await renderWithQuery(<MeetingsScreen />);
  await screen.findByText('Staff sync');
  await fireEvent.press(screen.getByRole('button', { name: 'Scheduled meeting' }));
  expect(screen.getByRole('radio', { name: 'Today' })).toBeTruthy();
  expect(screen.getByText('Times in Riyadh')).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Team' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Create meeting' })).toBeTruthy();
});
