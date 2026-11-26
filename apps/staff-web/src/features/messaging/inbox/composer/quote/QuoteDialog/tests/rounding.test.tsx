import { offerText, type Quote } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { fakePricingApi } from '@/features/finance/pricing/fake-pricing-api';
import {
  isPressed,
  lastAsked,
  press,
  shownText,
  showSheet,
} from '@/features/messaging/inbox/composer/quote/testing/quote-sheet';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// SA standard at 45 minutes is 180: 7 % leaves 167.4 and 12.5 % leaves 157.5, so each direction
// moves a price that the pills (171, 162, 153) would leave whole.
const SA = '/pricing/quote?country=SA&duration=45&tier=standard&students=1';
const r = t.inbox.quote.rounding;
const group = () => screen.queryByRole('group', { name: r.label });
const asked = () => lastAsked(apiFetch, '/pricing/quote');
const discount = (value: string) =>
  fireEvent.change(screen.getByRole('spinbutton', { name: t.pricing.steps.discount }), {
    target: { value },
  });

beforeEach(() => apiFetch.mockImplementation(async (path: string) => fakePricingApi(path)));
afterEach(() => {
  apiFetch.mockReset();
  cleanup();
});

it('without a discount there is no rounding choice and the request is today’s', async () => {
  await showSheet();
  expect(group()).toBeNull();
  expect(asked()).toBe(`${SA}&discount=0`);
});

it('a discount offers the three ways on «الأقرب», which asks for no rounding', async () => {
  await showSheet();
  discount('7');
  expect(group()).not.toBeNull();
  expect([r.nearest, r.up, r.down].map(isPressed)).toEqual([true, false, false]);
  await waitFor(() => expect(asked()).toBe(`${SA}&discount=7`));
  expect((fakePricingApi(asked()) as Quote).afterDiscount).toBe(167);
});

it.each([
  ['up', '7', 168],
  ['down', '12.5', 157],
] as const)('«%s» at %s%% reaches the request and the price', async (mode, pct, price) => {
  await showSheet();
  discount(pct);
  press(r[mode]);
  expect(isPressed(r[mode])).toBe(true);
  const path = `${SA}&discount=${pct}&rounding=${mode}`;
  await waitFor(() => expect(asked()).toBe(path));
  const quote = fakePricingApi(path) as Quote;
  expect(quote.afterDiscount).toBe(price);
  await waitFor(() => expect(shownText()).toBe(offerText(quote, ar.pricing)));
});

it('back on «الأقرب» the request is the default one again', async () => {
  await showSheet();
  discount('7');
  press(r.up);
  await waitFor(() => expect(asked()).toBe(`${SA}&discount=7&rounding=up`));
  press(r.nearest);
  await waitFor(() => expect(asked()).toBe(`${SA}&discount=7`));
});

it('«مبلغ مخصص» hides the choice, which has no say in a typed amount, and keeps it', async () => {
  await showSheet();
  discount('7');
  press(r.up);
  await waitFor(() => expect(asked()).toBe(`${SA}&discount=7&rounding=up`));
  press(t.paymentLinks.customAmount);
  expect(group()).toBeNull();
  press(t.paymentLinks.customAmount);
  expect(isPressed(r.up)).toBe(true);
});

it('«كل الأسعار» has no custom amount, so one left on does not hide the choice there', async () => {
  await showSheet();
  discount('7');
  press(t.paymentLinks.customAmount);
  expect(group()).toBeNull();
  press(t.inbox.quote.mode.all);
  expect(group()).not.toBeNull();
  press(r.down);
  const asksDown = () => lastAsked(apiFetch, '/pricing/list').endsWith('discount=7&rounding=down');
  await waitFor(() => expect(asksDown()).toBe(true));
});

it('a discount back at 0 hides the choice and asks as today; a new one brings it back', async () => {
  await showSheet();
  discount('7');
  press(r.down);
  await waitFor(() => expect(asked()).toBe(`${SA}&discount=7&rounding=down`));
  press(t.pricing.discounts['0']);
  expect(group()).toBeNull();
  await waitFor(() => expect(asked()).toBe(`${SA}&discount=0`));
  press(t.pricing.discounts['10']);
  expect(isPressed(r.down)).toBe(true);
  await waitFor(() => expect(asked()).toBe(`${SA}&discount=10&rounding=down`));
});
