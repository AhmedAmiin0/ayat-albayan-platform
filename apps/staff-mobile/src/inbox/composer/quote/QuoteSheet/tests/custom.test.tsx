import { offerText } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { fireEvent, screen } from '@testing-library/react-native';
import { currencyName, t, pathKey } from '@ab/mobile-kit';
import { bulkSa } from '@/finance/pricing/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { QuoteSheet } from '@/inbox/composer/quote/QuoteSheet/QuoteSheet';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const c = t.subscriptions.customPrice;
const q = t.inbox.quote;
const SAR = currencyName('SAR');
const preview = () => screen.getByTestId('quote-preview').props.children as string;
const pill = () => screen.getByRole('checkbox', { name: t.paymentLinks.customAmount });
const field = () => screen.getByLabelText(c.label.replace('{currency}', SAR));
const disabled = (name: string) =>
  screen.getByRole('button', { name }).props.accessibilityState?.disabled;

/** bulkSa: total 770, after the 10 % pill 693; sales floor 770 × 0.85 = 654.5 → 650. */
async function sheet(permissions: string[] = ['pricing.read']) {
  const me = { role: 'sales', permissions };
  const answer = async (p: string) => (p === '/auth/me' ? me : bulkSa);
  mockApiFetch.mockReset().mockImplementation(answer);
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), me);
  await renderWithQuery(<QuoteSheet phone="+966501234567" open onClose={jest.fn()} />, client);
  await screen.findByTestId('quote-preview');
}

test('off: today’s sheet and text, no amount field', async () => {
  await sheet();
  expect(pill().props.accessibilityState).toEqual({ checked: false });
  expect(screen.queryByLabelText(c.label.replace('{currency}', SAR))).toBeNull();
  expect(preview()).toBe(offerText(bulkSa, ar.pricing));
  expect(disabled(q.send)).toBeFalsy();
});

test('on: starts from the price after discount; the typed amount is the total', async () => {
  await sheet();
  await fireEvent.press(pill());
  expect(field().props.value).toBe('693');
  const quoted = c.quoted.replace('{amount}', '693').replace('{currency}', SAR);
  expect(screen.getByText(quoted)).toBeTruthy();
  expect(preview()).toBe(offerText(bulkSa, ar.pricing, 693));
  await fireEvent.changeText(field(), '700');
  expect(preview()).toContain(`${ar.pricing.total}: 700 ر.س`);
  expect(preview()).not.toContain(ar.pricing.discountLabel);
  expect(disabled(q.send)).toBeFalsy();
});

test('sales: any amount, even under the deepest pill’s price (owner 2026-11-18), may leave', async () => {
  await sheet();
  await fireEvent.press(pill());
  await fireEvent.changeText(field(), '600');
  expect(preview()).toBe(offerText(bulkSa, ar.pricing, 600));
  expect(disabled(q.send)).toBeFalsy();
});

test('not an amount: the field’s error, nothing may leave', async () => {
  await sheet();
  await fireEvent.press(pill());
  await fireEvent.changeText(field(), 'abc');
  expect(screen.getByText(c.invalid)).toBeTruthy();
  for (const name of [q.send, q.edit, q.copy]) expect(disabled(name)).toBe(true);
});

test('the admin (subscriptions.write): any amount too', async () => {
  await sheet(['pricing.read', 'subscriptions.write']);
  await fireEvent.press(pill());
  await fireEvent.changeText(field(), '600');
  expect(preview()).toBe(offerText(bulkSa, ar.pricing, 600));
  expect(disabled(q.send)).toBeFalsy();
});
