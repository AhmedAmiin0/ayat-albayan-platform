import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { familyOf, KID, kid, PHONE } from '../testing/fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: () => Promise.resolve(jest.requireActual('../testing/fixtures').salesQuote),
}));
const mockPush = jest.fn();
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: (h: unknown) => mockPush(h) },
  useLocalSearchParams: () => mockParams.current,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(familyOf(kid()));
});

test('a preselected child of hers: «أيام الحلقات» opens the course wizard for that child', async () => {
  mockParams.current = { phone: PHONE, studentId: KID };
  await renderWithQuery(<SalesSubscribeScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.booking.courseDays }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/inbox/sales-course', params: { studentId: KID } });
});

test('no child in the link (or not hers): no «أيام الحلقات»', async () => {
  mockParams.current = { phone: PHONE, studentId: 'someone-else' };
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByRole('button', { name: t.salesMoney.saveSubscription })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.booking.courseDays })).toBeNull();
});
