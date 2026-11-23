import { offerText, type Quote } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fakePricingApi } from '@/features/finance/pricing/fake-pricing-api';
import { currencySymbol } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { QuoteDialog } from './QuoteDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const granted = vi.hoisted(() => new Set<string>());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [...granted], can: (p: string) => granted.has(p) }),
}));

/** Standard, SA, 45 min, 1 student: 180 ر.س; sales floor 180 × 0.85 = 153 → 150. */
const SA = '/pricing/quote?country=SA&duration=45&tier=standard&students=1&discount=0';
const QUOTE = fakePricingApi(SA) as Quote;
const T = t.subscriptions.customPrice;
const q = t.inbox.quote;
const SAR = currencySymbol('SAR');
const text = () => screen.getByTestId('quote-text').textContent;
const toggle = () => screen.getByRole('button', { name: t.paymentLinks.customAmount });
const field = () => screen.getByLabelText(T.label.replace('{currency}', SAR));
const off = (name: string) => screen.getByRole('button', { name }).hasAttribute('disabled');

async function show(admin = false) {
  granted.clear();
  if (admin) granted.add('subscriptions.write');
  const th = thread({ phone_e164: '+966501234567', session_open: true });
  renderWithClient(<QuoteDialog thread={th} onClose={vi.fn()} onFilled={vi.fn()} />);
  await screen.findByTestId('quote-text');
}
const type = (value: string) => fireEvent.change(field(), { target: { value } });

beforeEach(() => apiFetch.mockImplementation(async (path: string) => fakePricingApi(path)));
afterEach(() => {
  apiFetch.mockReset();
  cleanup();
});

it('off: today’s text, no amount field', async () => {
  await show();
  expect(toggle().getAttribute('aria-pressed')).toBe('false');
  expect(screen.queryByLabelText(T.label.replace('{currency}', SAR))).toBeNull();
  expect(text()).toBe(offerText(QUOTE, ar.pricing));
  expect(off(q.send)).toBe(false);
});

it('on: starts from the quote’s price; the typed amount is the offer’s total', async () => {
  await show();
  fireEvent.click(toggle());
  expect(field()).toHaveProperty('value', String(QUOTE.afterDiscount));
  expect(text()).toBe(offerText(QUOTE, ar.pricing, QUOTE.afterDiscount));
  type('170');
  expect(text()).toBe(offerText(QUOTE, ar.pricing, 170));
  expect(off(q.send)).toBe(false);
});

it('sales: any amount, even under the deepest pill’s price (owner 2026-11-18), is the total', async () => {
  await show();
  fireEvent.click(toggle());
  type('100');
  expect(text()).toBe(offerText(QUOTE, ar.pricing, 100));
  expect(off(q.send)).toBe(false);
});

it('not an amount: the field’s error, nothing may leave', async () => {
  await show();
  fireEvent.click(toggle());
  type('abc');
  expect(screen.getByText(T.invalid)).toBeTruthy();
  for (const name of [q.send, q.edit, q.copy]) expect(off(name)).toBe(true);
});

it('the admin (subscriptions.write): any amount too', async () => {
  await show(true);
  fireEvent.click(toggle());
  type('100');
  expect(text()).toBe(offerText(QUOTE, ar.pricing, 100));
  expect(off(q.send)).toBe(false);
});
