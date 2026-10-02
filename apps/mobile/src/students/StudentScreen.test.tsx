import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { StudentScreen } from './StudentScreen';
import { balanceOf, subscription } from '@/payments/fixtures';
import { profile } from './test-data';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (mockHref: string) => mockPush(mockHref),
    back: () => mockBack(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const full = {
  ...profile,
  level: 'مبتدئ',
  meeting_link: 'https://meet.google.com/abc-defg-hij',
  siblings: [{ id: 's2', code: 'AB-0184', name: 'يوسف', status: 'trial' as const }],
};

/** GET /students/s1 answers the profile; the money reads 404 unless given (no package yet). */
function serve(student: typeof full, balance?: unknown) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/students/s1') return student;
    if (path === '/students/s1/balance' && balance) return balance;
    throw new ApiError(404);
  });
}

let openURL: jest.SpyInstance;
beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => openURL.mockRestore());

test('header is name + LTR code; non-empty facts only; no teacher says so', async () => {
  serve(full);
  await renderWithQuery(<StudentScreen />);
  expect(await screen.findByRole('header', { name: 'هدى' })).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students/s1');
  expect(screen.getByText(ltr('AB-0183'))).toBeTruthy();
  expect(screen.getByText(t.enums.program.quran)).toBeTruthy();
  expect(screen.getByText('مبتدئ')).toBeTruthy();
  expect(screen.queryByText(t.students.goal)).toBeNull();
  expect(screen.getByText(ltr('Asia/Riyadh'))).toBeTruthy();
  expect(screen.getByText(t.students.noTeacher)).toBeTruthy();
});

test('meeting link, call and WhatsApp open outside the app', async () => {
  serve(full);
  await renderWithQuery(<StudentScreen />);
  await fireEvent.press(await screen.findByRole('link', { name: t.students.meetingLink }));
  expect(openURL).toHaveBeenLastCalledWith('https://meet.google.com/abc-defg-hij');
  expect(screen.getByText(ltr('+966 55 214 7730'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.call }));
  expect(openURL).toHaveBeenLastCalledWith('tel:+966552147730');
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.whatsapp }));
  expect(openURL).toHaveBeenLastCalledWith('https://wa.me/966552147730');
});

test('a sibling opens its own quick view; back goes back', async () => {
  serve(full);
  await renderWithQuery(<StudentScreen />);
  await fireEvent.press(await screen.findByText('يوسف'));
  expect(mockPush).toHaveBeenCalledWith('/students/s2');
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(mockBack).toHaveBeenCalled();
});

test('404: «not found» instead of the generic error', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(404));
  await renderWithQuery(<StudentScreen />);
  expect(await screen.findByText(t.common.notFound)).toBeTruthy();
});

test('offline with a cached profile: shown, no error (R-MOB-03)', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  const client = createTestQueryClient();
  client.setQueryData(['students', 's1'], full);
  await renderWithQuery(<StudentScreen />, client);
  await waitFor(() => expect(client.getQueryState(['students', 's1'])?.status).toBe('error'));
  expect(screen.getByRole('header', { name: 'هدى' })).toBeTruthy();
  expect(screen.queryByText(t.common.error)).toBeNull();
});

test('the balance card sits under the status: what is left and «سجّل دفعة»', async () => {
  serve(full, balanceOf(subscription()));
  await renderWithQuery(<StudentScreen />);
  expect(await screen.findByText('فاضل حلقتين')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.payments.mobile.record }));
  expect(mockPush).toHaveBeenCalledWith('/students/payment/s1');
});

test('no balance route answer: the quick view is unchanged', async () => {
  serve(full);
  await renderWithQuery(<StudentScreen />);
  expect(await screen.findByRole('header', { name: 'هدى' })).toBeTruthy();
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/balance'));
  expect(screen.queryByText(t.subscriptions.balance)).toBeNull();
});
