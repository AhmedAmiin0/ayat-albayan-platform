import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import AdminToday from '../../app/home';

const mockSignOut = jest.fn();
const mockReplace = jest.fn();
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: () => mockSignOut() } } }));
jest.mock('expo-router', () => ({ router: { replace: (p: string) => mockReplace(p) } }));

beforeEach(() => {
  jest.clearAllMocks();
  // Thursday 1 Oct 2026, 15:20 in Riyadh.
  jest.useFakeTimers({ now: new Date('2026-10-01T12:20:00Z') });
});
afterEach(() => jest.useRealTimers());

test('Amiri «النهارده» header with the Riyadh date line in Western digits', async () => {
  await render(<AdminToday />);
  expect(screen.getByRole('header', { name: t.mobile.today })).toBeTruthy();
  expect(screen.getByText('الخميس 1 أكتوبر 2026. المواعيد بتوقيت الرياض')).toBeTruthy();
});

test('no lessons API yet: an honest empty state', async () => {
  await render(<AdminToday />);
  expect(screen.getByRole('header', { name: t.common.empty })).toBeTruthy();
});

test('logout signs out and returns to login', async () => {
  mockSignOut.mockResolvedValue({ error: null });
  await render(<AdminToday />);
  await fireEvent.press(screen.getByRole('button', { name: t.auth.logout }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  expect(mockSignOut).toHaveBeenCalled();
});
