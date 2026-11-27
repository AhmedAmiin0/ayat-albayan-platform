import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { StudentSignIn } from './StudentSignIn';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: jest.fn(async () => undefined),
}));
jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  notificationAsync: jest.fn(async () => undefined),
}));

const s = t.familyApp.signIn;
const show = (codes: boolean) =>
  renderWithQuery(<StudentSignIn codes={codes} />, freshQueryClient());

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue({ available: true, staff: false });
});

test('codes off: the password form alone, no first-time or forgot buttons', async () => {
  await show(false);
  expect(screen.getByLabelText(s.studentCode)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.familyAuth.firstTime })).toBeNull();
  expect(screen.queryByRole('button', { name: t.familyAuth.forgot })).toBeNull();
});

test.each([t.familyAuth.forgot, t.familyAuth.firstTime])(
  'codes on: «%s» swaps the form for the code flow, and back returns',
  async (name) => {
    await show(true);
    await fireEvent.press(screen.getByRole('button', { name }));
    expect(screen.queryByLabelText(s.studentCode)).toBeNull();
    await fireEvent.press(await screen.findByRole('button', { name: t.familyAuth.backToLogin }));
    expect(screen.getByLabelText(s.studentCode)).toBeTruthy();
  },
);
