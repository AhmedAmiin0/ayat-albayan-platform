import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { familyKey } from '../lib/family';
import { linkMessage, referenceLine } from '../payment-link/link-text';
import { familyOf, KID, kid, PHONE, salesQuote } from '../testing/fixtures';
import { linkQuote, paymentLink } from '../testing/link-fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

// «اشتراك جديد» → «دفع إلكتروني» (owner 2026-10-29, docs/30): the Stripe test build with the API's switch on.
jest.mock('../payment-link/flag', () => ({ STRIPE_FEATURE: true }));
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
const TEACHER = '7a000000-0000-4000-8000-000000000001';
const created = () => mockApiSend.mock.calls.find((c: unknown[]) => c[1] === '/sales/payment-links')?.[2] as Record<string, unknown> | undefined;
const serve = (child = kid({ teacher_id: TEACHER })) =>
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/stripe/feature' ? { stripe: true } : path === '/sales/subscriptions/teachers' ? [{ id: TEACHER, name: 'أبرار' }] : familyOf(child),
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockWindow.open = true;
  serve();
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/payment-links/quote' ? linkQuote() : path === '/sales/subscriptions/quote' ? salesQuote : paymentLink(),
  );
});

async function createLink(amount?: string, client = createTestQueryClient()) {
  await renderWithQuery(<SalesSubscribeScreen />, client);
  await fireEvent.press(await screen.findByRole('radio', { name: t.salesMoney.payOnline }));
  expect(await screen.findByText(referenceLine(180, 'SAR'))).toBeTruthy();
  const field = screen.getByLabelText(new RegExp(pl.agreedAmount.split(' (')[0] ?? ''));
  expect(field.props.value).toBe('180');
  if (amount) await fireEvent.changeText(field, amount);
  await fireEvent.press(await screen.findByRole('button', { name: pl.create, disabled: false }));
}

test('the reference is the calculator price; the link carries the form’s student, package, day and teacher, never the phone', async () => {
  await createLink('170');
  await waitFor(() =>
    expect(created()).toMatchObject({ studentId: KID, amount: 170, currency: 'SAR', pricing: { tier: 'standard' }, teacherId: TEACHER }),
  );
  expect(created()?.['startsOn']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(created()).toHaveProperty('clientRequestId');
  expect(created()).not.toHaveProperty('phone');
  expect(mockApiSend.mock.calls.some((c: unknown[]) => c[1] === '/sales/subscriptions')).toBe(false);
  expect(await screen.findByText(new RegExp(ltr('170')))).toBeTruthy();
  expect(screen.getByText(ltr(paymentLink().url))).toBeTruthy();
});

test('a child due for a renewal: no kind is sent, the API derives it from her priced packages', async () => {
  serve(kid({ status: 'active', renew_due: true }));
  await createLink();
  await waitFor(() => expect(created()).toMatchObject({ studentId: KID }));
  expect(created()).not.toHaveProperty('kind');
});

test('below the admin minimum: refused before posting', async () => {
  await createLink('100');
  expect(await screen.findByText(pl.error.discount_too_large)).toBeTruthy();
  expect(created()).toBeUndefined();
});

test('the link made: the family refetches (its unpaid package); «إرسال في المحادثة» fills the box and goes back', async () => {
  const client = createTestQueryClient();
  const refetch = jest.spyOn(client, 'invalidateQueries');
  await createLink(undefined, client);
  await fireEvent.press(await screen.findByRole('button', { name: pl.sendInChat }));
  expect(refetch).toHaveBeenCalledWith({ queryKey: familyKey(PHONE) });
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
