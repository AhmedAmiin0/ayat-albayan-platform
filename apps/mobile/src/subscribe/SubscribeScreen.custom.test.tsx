import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { money } from '@/core/lib/money/format';
import { renderWithQuery } from '@/test/query';
import { balance, CHILD, profile, quote, saved } from './fixtures';
import { SubscribeScreen } from './SubscribeScreen';

// «مبلغ مخصص» on the package price (owner 2026-11-02), the admin's «اشتراك جديد» / «جدّد الاشتراك».
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockParams = jest.fn((): Record<string, string> => ({ studentId: CHILD }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => mockParams(),
}));

const c = t.subscriptions.customPrice;
const LABEL = new RegExp(c.label.split(' (')[0] ?? '');
const saves = () =>
  mockApiSend.mock.calls.filter((call: unknown[]) => call[1] === '/subscriptions').map((call: unknown[]) => call[2]);
const toggle = () => fireEvent.press(screen.getByRole('checkbox', { name: t.paymentLinks.customAmount }));
const make = async () =>
  fireEvent.press(await screen.findByRole('button', { name: t.inbox.subscription.make, disabled: false }));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mockReturnValue({ studentId: CHILD });
  mockApiFetch.mockImplementation(async (path: string) => (path.endsWith('/balance') ? balance(null) : profile));
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/subscriptions/quote' ? quote : saved('new-sub'),
  );
});

async function priced() {
  await renderWithQuery(<SubscribeScreen />);
  expect(await screen.findByText(money(180, 'SAR'))).toBeTruthy();
}

test('off (the default): no price field, and the body has no customPrice', async () => {
  await priced();
  expect(screen.getByRole('checkbox', { name: t.paymentLinks.customAmount, checked: false })).toBeTruthy();
  expect(screen.queryByLabelText(LABEL)).toBeNull();
  await make();
  await waitFor(() => expect(saves()).toHaveLength(1));
  expect(saves()[0]).not.toHaveProperty('customPrice');
});

test('on: the field starts from the quote, its price is sent as customPrice', async () => {
  await priced();
  await toggle();
  expect(screen.getByLabelText(LABEL).props.value).toBe('180');
  await fireEvent.changeText(screen.getByLabelText(LABEL), '150');
  await make();
  await waitFor(() => expect(saves()).toHaveLength(1));
  expect(saves()[0]).toMatchObject({ studentId: CHILD, customPrice: 150 });
});

test('an invalid price is said and nothing is saved; off again drops it', async () => {
  await priced();
  await toggle();
  await fireEvent.changeText(screen.getByLabelText(LABEL), '0');
  expect(screen.getByText(c.invalid)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.inbox.subscription.make }).props.accessibilityState)
    .toMatchObject({ disabled: true });
  await toggle();
  await make();
  await waitFor(() => expect(saves()).toHaveLength(1));
  expect(saves()[0]).not.toHaveProperty('customPrice');
});

test('«جدّد الاشتراك»: the renewal carries the custom price too', async () => {
  mockParams.mockReturnValue({ studentId: CHILD, renew: '1', plan: 'premium', minutes: '60' });
  await renderWithQuery(<SubscribeScreen />);
  expect(await screen.findByRole('header', { name: t.inbox.subscription.renew })).toBeTruthy();
  expect(await screen.findByText(money(180, 'SAR'))).toBeTruthy();
  await toggle();
  await fireEvent.changeText(screen.getByLabelText(LABEL), '199.5');
  await make();
  await waitFor(() => expect(saves()).toHaveLength(1));
  expect(saves()[0]).toMatchObject({ pricing: { tier: 'premium', duration: 60 }, customPrice: 199.5 });
});
