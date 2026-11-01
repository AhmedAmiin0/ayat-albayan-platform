import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { familyOf, KID, kid, openSub, PHONE, salesQuote } from '../testing/fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

// sales.renew_any (owner 2026-10-29, docs/16 row 38): «جدّد الاشتراك» for a child not hers (mine: false).
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: (h: unknown) => mockReplace(h), push: jest.fn() },
  useLocalSearchParams: () => ({ ...mockParams }),
}));

const mockParams = { phone: PHONE, studentId: KID, renew: '1' };
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(familyOf(kid({ mine: false, renew_due: true })));
  mockApiSend.mockImplementation(async (_m: string, path: string) => (path === '/sales/subscriptions/quote' ? salesQuote : openSub()));
});

// owner 2026-11-01: «أيام الحلقات» for it too, then its transfer (from the course screen).
test('the quote and the package carry the chat phone; «أيام الحلقات»; saved → its weekly days', async () => {
  await renderWithQuery(<SalesSubscribeScreen />);
  await waitFor(() => expect(sent('/sales/subscriptions/quote').at(-1)?.[2]).toMatchObject({ studentId: KID, phone: PHONE }));
  expect(screen.getByRole('button', { name: t.booking.courseDays })).toBeTruthy();
  await fireEvent.press(await screen.findByRole('button', { name: t.salesMoney.saveSubscription }));
  await waitFor(() => expect(sent('/sales/subscriptions')[0]?.[2]).toMatchObject({ studentId: KID, phone: PHONE }));
  const course = { pathname: '/inbox/sales-course', params: { studentId: KID, phone: PHONE, subscriptionId: openSub().id } };
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(course));
});
