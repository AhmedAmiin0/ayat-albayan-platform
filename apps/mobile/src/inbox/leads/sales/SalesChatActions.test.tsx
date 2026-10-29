import { screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { familyOf, familyThread, kid } from '@/sales-subscribe/testing/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { SalesChatActions } from './SalesChatActions';
import { thread } from '../../shared/thread-fixtures';

// The action strip shows only once a pill will: no empty band over a family chat (review of #112),
// and none over a lead's chat (owner 2026-10-30: «تسجيل طالب جديد» moved into the header's «⋮»).
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

function serve(family: unknown, permissions: string[]) {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/auth/me' ? { permissions } : family));
}

beforeEach(() => jest.clearAllMocks());

test('a family chat without self.sales_money: no strip at all', async () => {
  serve(familyOf(kid()), ['self.sales']);
  await renderWithQuery(<SalesChatActions thread={familyThread} />, createTestQueryClient({ meFromApi: true }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(screen.queryByTestId('sales-chat-actions')).toBeNull();
});

test('a family with no student of hers: no strip', async () => {
  serve(familyOf(), ['self.sales', 'self.sales_money']);
  await renderWithQuery(<SalesChatActions thread={familyThread} />, createTestQueryClient({ meFromApi: true }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
  expect(screen.queryByTestId('sales-chat-actions')).toBeNull();
});

test('her student in the family: the strip with «اشتراك جديد»', async () => {
  serve(familyOf(kid()), ['self.sales', 'self.sales_money']);
  await renderWithQuery(<SalesChatActions thread={familyThread} />, createTestQueryClient({ meFromApi: true }));
  const strip = await screen.findByTestId('sales-chat-actions');
  expect(within(strip).getByRole('button', { name: t.salesMoney.newSubscription })).toBeTruthy();
});

test('a lead: no strip at all («تسجيل طالب جديد» is in the header «⋮»), no family query', async () => {
  serve(null, ['self.sales', 'self.sales_money']);
  await renderWithQuery(<SalesChatActions thread={thread} />, createTestQueryClient({ meFromApi: true }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(screen.queryByTestId('sales-chat-actions')).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/sales/money/family'));
});
