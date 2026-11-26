import { offerText, type Quote } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { fakePricingApi } from '@/features/finance/pricing/fake-pricing-api';
import {
  lastAsked,
  press,
  queryOf,
  shownText,
  showSheet,
} from '@/features/messaging/inbox/composer/quote/testing/quote-sheet';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const p = t.pricing;
const SA = '/pricing/quote?country=SA&duration=45&tier=standard&students=1';
const field = () => screen.getByRole('spinbutton', { name: p.steps.discount });
const type = (value: string) => fireEvent.change(field(), { target: { value } });
const quoteAsked = () => lastAsked(apiFetch, '/pricing/quote');
const listAsked = () => queryOf(lastAsked(apiFetch, '/pricing/list'));

beforeEach(() => apiFetch.mockImplementation(async (path: string) => fakePricingApi(path)));
afterEach(() => {
  apiFetch.mockReset();
  cleanup();
});

it('the free field sits beside the pills and follows the pressed pill', async () => {
  await showSheet();
  expect(screen.getByRole('group', { name: p.steps.discount })).toBeTruthy();
  expect(field()).toHaveProperty('value', '0');
  press(p.discounts['10']);
  expect(field()).toHaveProperty('value', '10');
});

it('«باقة واحدة»: a typed percent is asked for and its price is the one shown', async () => {
  await showSheet();
  type('12.5');
  await waitFor(() => expect(quoteAsked()).toBe(`${SA}&discount=12.5`));
  const quote = fakePricingApi(`${SA}&discount=12.5`) as Quote;
  await waitFor(() => expect(shownText()).toBe(offerText(quote, ar.pricing)));
  expect(shownText()).toContain(`${ar.pricing.discountLabel}: 12.5%`);
});

it('«كل الأسعار»: the typed percent reaches the list, whose header prints it as typed', async () => {
  await showSheet();
  press(t.inbox.quote.mode.all);
  type('12.5');
  await waitFor(() => expect(listAsked().discount).toBe('12.5'));
  const header = ar.pricing.listDiscount.replace('{pct}', '12.5');
  await waitFor(() => expect(shownText()).toContain(header));
});

it('a percent typed on one mode is the other mode’s too', async () => {
  await showSheet();
  type('7');
  press(t.inbox.quote.mode.all);
  expect(field()).toHaveProperty('value', '7');
  await waitFor(() => expect(listAsked().discount).toBe('7'));
});

it.each([
  ['250', '100'],
  ['-5', '0'],
  ['', '0'],
])('a typed «%s» is held to 0–100: %s is asked for', async (typed, asked) => {
  await showSheet();
  type('12');
  await waitFor(() => expect(quoteAsked()).toBe(`${SA}&discount=12`));
  type(typed);
  await waitFor(() => expect(quoteAsked()).toBe(`${SA}&discount=${asked}`));
});
