import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { renderWithQuery } from '@/test/query';
import { familyOf, kid, PHONE } from '../testing/fixtures';
import { linkQuote, paymentLink } from '../testing/link-fixtures';
import { linkMessage } from './link-text';
import { PaymentLinkScreen } from './PaymentLinkScreen';

jest.mock('./flag', () => ({ STRIPE_FEATURE: true }));
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223' }),
}));
const mockWindow = { open: true };
const mockSetText = jest.fn();
jest.mock('@/inbox', () => ({
  ...jest.requireActual('@/inbox'),
  chatWindowOpen: () => mockWindow.open,
  appendComposerText: (...mockArgs: unknown[]) => mockSetText(...mockArgs),
}));

const pl = t.paymentLinks;
const created = () => mockApiSend.mock.calls.find((c: unknown[]) => c[1] === '/sales/payment-links')?.[2];

beforeEach(() => {
  jest.clearAllMocks();
  mockWindow.open = true;
  mockApiFetch.mockImplementation(async (path: string) => (path === '/stripe/feature' ? { stripe: true } : familyOf(kid())));
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/payment-links/quote' ? linkQuote() : paymentLink(),
  );
});

async function createLink(amount?: string) {
  await renderWithQuery(<PaymentLinkScreen />);
  expect(await screen.findByText(new RegExp(ltr('180')))).toBeTruthy();
  const field = screen.getByLabelText(new RegExp(pl.agreedAmount.split(' (')[0] ?? ''));
  expect(field.props.value).toBe('180');
  if (amount) await fireEvent.changeText(field, amount);
  await fireEvent.press(screen.getByRole('button', { name: pl.create }));
}

test('the calculator price is the reference, the agreed amount defaults to it; the link carries both', async () => {
  await createLink('170');
  await waitFor(() =>
    expect(created()).toMatchObject({ studentId: kid().id, kind: 'new', amount: 170, currency: 'SAR', pricing: { tier: 'standard' } }),
  );
  expect(created()).toHaveProperty('clientRequestId');
  expect(await screen.findByText(new RegExp(ltr('170')))).toBeTruthy();
  expect(screen.getByText(new RegExp(ltr('180')))).toBeTruthy();
  expect(screen.getByText(ltr(paymentLink().url))).toBeTruthy();
});

test('below the admin minimum: refused before posting', async () => {
  await createLink('100');
  expect(await screen.findByText(pl.error.discount_too_large)).toBeTruthy();
  expect(created()).toBeUndefined();
});

test('«إرسال في المحادثة» within 24 h: the text goes into the chat box, nothing is sent, back to the chat', async () => {
  await createLink();
  await fireEvent.press(await screen.findByRole('button', { name: pl.sendInChat }));
  expect(mockSetText).toHaveBeenCalledWith(PHONE, linkMessage(paymentLink()));
  expect(mockBack).toHaveBeenCalled();
  expect(mockApiSend.mock.calls.some((c: unknown[]) => String(c[1]).startsWith('/threads'))).toBe(false);
});

test('the window closed: the template note, the box untouched', async () => {
  mockWindow.open = false;
  await createLink();
  await fireEvent.press(await screen.findByRole('button', { name: pl.sendInChat }));
  expect(screen.getByText(pl.templateNeeded)).toBeTruthy();
  expect(mockSetText).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});

test('a renewal starts from her last package', async () => {
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/stripe/feature'
      ? { stripe: true }
      : familyOf(kid({ renew_due: true, renewal: { pkg: 'premium', count: 10, duration: 60, discount: 10, country: 'AE' } })),
  );
  await createLink();
  await waitFor(() => expect(created()).toMatchObject({ kind: 'renewal', pricing: { tier: 'premium', duration: 60, discount: 10, country: 'AE' } }));
});
