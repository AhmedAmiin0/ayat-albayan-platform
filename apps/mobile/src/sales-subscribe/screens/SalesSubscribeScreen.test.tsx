import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { money } from '@/payments/format';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { familyKey } from '../lib/family';
import { familyOf, KID, KID2, kid, openSub, PHONE, salesQuote, SUB } from '../testing/fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: (h: unknown) => mockReplace(h) },
  useLocalSearchParams: () => ({ phone: '+966501112223', tz: 'Asia/Riyadh' }),
}));

const m = t.salesMoney;
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
/** The admin's free 0–100 discount input (a decimal pad), not the pills' group. */
const freeDiscountFields = () =>
  screen.queryAllByLabelText(t.pricing.steps.discount).filter((e) => e.props.keyboardType === 'decimal-pad');
const saveButton = () => screen.findByRole('button', { name: m.saveSubscription, disabled: false });

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-10-12T09:00:00Z'), advanceTimers: true });
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(familyOf(kid()));
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/subscriptions/quote' ? salesQuote : openSub(),
  );
});
afterEach(() => jest.useRealTimers());

test('her only child is picked; the sales quote; a failed save retried keeps ONE clientRequestId → the transfer screen', async () => {
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path === '/sales/subscriptions/quote') return salesQuote;
    if (sent('/sales/subscriptions').length === 1) throw new ApiError(502, null);
    return openSub();
  });
  const { client } = await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByText(money(180, 'SAR'))).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(`/sales/money/family?phone=${encodeURIComponent(PHONE)}`);
  expect(screen.getByRole('radio', { name: `ريم · ${ltr('AB-0201')}`, checked: true })).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/subscriptions/quote', {
    studentId: KID,
    pricing: { duration: 45, discount: 0, tier: 'standard' },
  });
  expect(screen.getByText(m.priceHint)).toBeTruthy();

  await fireEvent.press(await saveButton());
  expect(await screen.findByText(m.error.generic)).toBeTruthy();
  await fireEvent.press(await saveButton());
  await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
  // On to the package's weekly days, which go on to its transfer (owner 2026-10-18).
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/inbox/sales-course',
    params: { studentId: KID, phone: PHONE, subscriptionId: SUB },
  });

  const [first, second] = sent('/sales/subscriptions').map((c) => c[2] as { clientRequestId: string });
  expect(first).toEqual({
    studentId: KID,
    pricing: { duration: 45, discount: 0, tier: 'standard' },
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  });
  expect(second?.clientRequestId).toBe(first?.clientRequestId);
  expect(sent('/subscriptions')).toHaveLength(0);
  // The family refetches (its packages now owe the new one).
  await waitFor(() => expect(client.getQueryState(familyKey(PHONE))?.dataUpdateCount).toBeGreaterThan(1));
});

test('two of her children: none picked, «احفظ الاشتراك» stays off until one is', async () => {
  mockApiFetch.mockResolvedValue(familyOf(kid(), kid({ id: KID2, code: 'AB-0202', name: 'سلمى' })));
  await renderWithQuery(<SalesSubscribeScreen />);
  await fireEvent.press(await screen.findByRole('radio', { name: `سلمى · ${ltr('AB-0202')}` }));
  await waitFor(() => expect(sent('/sales/subscriptions/quote').at(-1)?.[2]).toMatchObject({ studentId: KID2 }));
  expect(await saveButton()).toBeTruthy();
});

test('no student of hers in the family: says so, nothing to price', async () => {
  mockApiFetch.mockResolvedValue(familyOf());
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByText(m.noOwnStudents)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('not her student (403): the API’s reason', async () => {
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path === '/sales/subscriptions/quote') return salesQuote;
    throw new ApiError(403, { code: 'not_your_student' });
  });
  await renderWithQuery(<SalesSubscribeScreen />);
  await fireEvent.press(await saveButton());
  expect(await screen.findByText(m.error.not_your_student)).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('discount: only the site pills 0/5/10/15 %, no free number field; a pill is what is sent', async () => {
  await renderWithQuery(<SalesSubscribeScreen />);
  expect(await screen.findByText(money(180, 'SAR'))).toBeTruthy();
  for (const d of ['0', '5', '10', '15'] as const) expect(screen.getByRole('radio', { name: t.pricing.discounts[d] })).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.pricing.discounts['0'], checked: true })).toBeTruthy();
  expect(freeDiscountFields()).toHaveLength(0);
  await fireEvent.press(screen.getByRole('radio', { name: t.pricing.discounts['15'] }));
  await waitFor(() =>
    expect(sent('/sales/subscriptions/quote').at(-1)?.[2]).toMatchObject({ pricing: { discount: 15 } }),
  );
  await fireEvent.press(await saveButton());
  await waitFor(() => expect(sent('/sales/subscriptions').at(-1)?.[2]).toMatchObject({ pricing: { discount: 15 } }));
});
