import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { threadKey } from '@/inbox/thread-cache';
import { cachedThread, detail, PHONE } from '@/inbox/thread-fixtures';
import { t } from '@/lib/i18n';
import { money } from '@/payments/format';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { balance, CHILD, profile, quote, saved, SISTER } from './fixtures';
import { SubscribeScreen } from './SubscribeScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockBack = jest.fn();
const mockParams = jest.fn((): Record<string, string> => ({ studentId: CHILD }));
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => mockParams(),
}));

const p = t.pricing;
const radio = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
const saveButton = () => screen.findByRole('button', { name: t.common.save, disabled: false });

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-10-02T09:00:00Z'), advanceTimers: true });
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) =>
    path.endsWith('/balance') ? balance(null) : profile,
  );
  mockApiSend.mockImplementation(async (_method: string, path: string) =>
    path === '/subscriptions/quote' ? quote : saved('new-sub'),
  );
});
afterEach(() => jest.useRealTimers());

test('pick the package → the API’s price → a day chip → «حفظ»: POST /subscriptions, back to the chat', async () => {
  const client = createTestQueryClient();
  client.setQueryData(threadKey(PHONE), cachedThread(detail([])));
  await renderWithQuery(<SubscribeScreen />, client);
  expect(await screen.findByText(money(180, 'SAR'))).toBeTruthy();
  expect(screen.getByText(`يوسف · ${ltr('AB-0183')}`)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(`/students/${CHILD}`);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/subscriptions/quote', {
    studentId: CHILD,
    pricing: { duration: 45, discount: 0, tier: 'standard' },
  });

  await radio(p.packages.premium.sessions);
  await radio(p.durations['60']);
  await radio(p.discounts['10']);
  await radio(p.countries.AE);
  const pricing = { duration: 60, discount: 10, country: 'AE', tier: 'premium' };
  await waitFor(() =>
    expect(sent('/subscriptions/quote').at(-1)?.[2]).toEqual({ studentId: CHILD, pricing }),
  );
  expect(screen.getByRole('radio', { name: t.mobile.today, checked: true })).toBeTruthy();
  await radio('السبت 3 أكتوبر');

  await fireEvent.press(await saveButton());
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(sent('/subscriptions')).toEqual([
    ['POST', '/subscriptions', { studentId: CHILD, pricing, startsOn: '2026-10-03', notes: null }],
  ]);
  // The chat refetches, so its badge now says «مشترك».
  expect(client.getQueryState(threadKey(PHONE))?.isInvalidated).toBe(true);
});

test('a sibling can be picked instead; the quote follows the child', async () => {
  await renderWithQuery(<SubscribeScreen />);
  await screen.findByRole('radio', { name: 'سارة' });
  await radio('سارة');
  await waitFor(() =>
    expect(sent('/subscriptions/quote').at(-1)?.[2]).toMatchObject({ studentId: SISTER }),
  );
  expect(screen.getByText(`سارة · ${ltr('AB-0184')}`)).toBeTruthy();
});

test('after booking a package: its size, length and first lesson day are already picked', async () => {
  mockParams.mockReturnValue({ studentId: CHILD, pkg: '8', minutes: '60', startsOn: '2026-10-04' });
  await renderWithQuery(<SubscribeScreen />);
  await screen.findByText(money(180, 'SAR'));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/subscriptions/quote', {
    studentId: CHILD,
    pricing: { duration: 60, discount: 0, tier: 'starter' },
  });
  expect(screen.getByRole('radio', { name: 'الأحد 4 أكتوبر', checked: true })).toBeTruthy();
});

test('no price yet (offline): «حفظ» stays off and the quote offers a retry', async () => {
  mockApiSend.mockRejectedValue(new TypeError('Network request failed'));
  await renderWithQuery(<SubscribeScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.common.save, disabled: true })).toBeTruthy();
});
