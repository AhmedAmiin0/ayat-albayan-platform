import { screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { MeetingsScreen } from './MeetingsScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: jest.fn(async () => [
    { id: 'm1', title: 'Staff sync', created_by: 'u', created_at: '2026-10-05T11:30:00.000Z', ends_at: null, state: 'open', can_manage: true },
  ]),
  apiSend: jest.fn(),
}));

test('the meetings screen reads in English', async () => {
  await renderWithQuery(<MeetingsScreen />);
  expect(await screen.findByText('Staff sync')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Internal meetings' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'New meeting' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'End meeting' })).toBeTruthy();
});
