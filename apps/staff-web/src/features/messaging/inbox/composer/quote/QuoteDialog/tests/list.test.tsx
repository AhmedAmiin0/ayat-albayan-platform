import { priceListText, type PriceListResponse } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { fakePricingApi } from '@/features/finance/pricing/fake-pricing-api';
import { currencySymbol } from '@/features/finance/subscriptions';
import {
  askedOf,
  isOff,
  isPressed,
  lastAsked,
  press,
  queryOf,
  shownText,
  showSheet,
} from '@/features/messaging/inbox/composer/quote/testing/quote-sheet';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const p = t.pricing;
const q = t.inbox.quote;
const group = (name: string) => screen.queryByRole('group', { name });
const listAsked = () => lastAsked(apiFetch, '/pricing/list');
const textOf = (path: string) =>
  priceListText(fakePricingApi(path) as PriceListResponse, ar.pricing);
const discount = (value: string) =>
  fireEvent.change(screen.getByRole('spinbutton', { name: p.steps.discount }), {
    target: { value },
  });

beforeEach(() => apiFetch.mockImplementation(async (path: string) => fakePricingApi(path)));
afterEach(() => {
  apiFetch.mockReset();
  cleanup();
});

it('opens on «باقة واحدة»: two options under one label, and no list is asked for', async () => {
  await showSheet();
  expect(group(q.mode.label)).not.toBeNull();
  expect([q.mode.one, q.mode.all].map(isPressed)).toEqual([true, false]);
  expect(askedOf(apiFetch, '/pricing/list')).toEqual([]);
});

it('«كل الأسعار» keeps the country, students and discount steps and drops the rest', async () => {
  await showSheet();
  press(q.mode.all);
  expect([q.mode.one, q.mode.all].map(isPressed)).toEqual([false, true]);
  expect([p.steps.country, p.steps.students, p.steps.discount].map(group)).not.toContain(null);
  expect([p.steps.duration, p.steps.frequency].map(group)).toEqual([null, null]);
  expect(screen.queryByRole('button', { name: t.paymentLinks.customAmount })).toBeNull();
});

it('asks the list of the chat’s country at the defaults and previews its text', async () => {
  await showSheet();
  press(q.mode.all);
  const defaults = { country: 'SA', students: '1', discount: '0', rounding: 'nearest' };
  await waitFor(() => expect(queryOf(listAsked())).toEqual(defaults));
  expect(group(q.rounding.label)).toBeNull();
  await waitFor(() => expect(shownText()).toBe(textOf(listAsked())));
  expect(shownText().startsWith(ar.pricing.listIntro)).toBe(true);
});

it('the chosen country, students, discount and rounding reach the list, and only the list', async () => {
  await showSheet();
  press(q.mode.all);
  press(p.countries.KW);
  press(p.increase);
  discount('7');
  press(q.rounding.up);
  const chosen = { country: 'KW', students: '2', discount: '7', rounding: 'up' };
  await waitFor(() => expect(queryOf(listAsked())).toEqual(chosen));
  await waitFor(() => expect(shownText()).toBe(textOf(listAsked())));
  expect(shownText()).toContain(`${ar.pricing.studentsLabel}: 2`);
  expect(askedOf(apiFetch, '/pricing/quote')).toHaveLength(1);
});

it('the discount back at 0 asks the default list, whatever rounding was chosen', async () => {
  await showSheet();
  press(q.mode.all);
  discount('7');
  press(q.rounding.down);
  await waitFor(() => expect(queryOf(listAsked()).rounding).toBe('down'));
  press(p.discounts['0']);
  const defaults = { country: 'SA', students: '1', discount: '0', rounding: 'nearest' };
  await waitFor(() => expect(queryOf(listAsked())).toEqual(defaults));
  press(p.discounts['10']);
  expect(isPressed(q.rounding.down)).toBe(true);
});

it('a list price is the single quote’s for the same choice: 180 less 7 %, rounded up', async () => {
  await showSheet();
  press(q.mode.all);
  discount('7');
  press(q.rounding.up);
  const standard = ar.pricing.packages.standard;
  const line = `• ${standard.name} (${standard.sessions}): 168 ${ar.pricing.currencies.SAR}`;
  await waitFor(() => expect(shownText()).toContain(line));
});

it('a chat from another country is listed in USD: no country is sent', async () => {
  await showSheet({ phone_e164: '+201001234567' });
  press(q.mode.all);
  const usd = { students: '1', discount: '0', rounding: 'nearest' };
  await waitFor(() => expect(queryOf(listAsked())).toEqual(usd));
  await waitFor(() => expect(shownText()).toContain(ar.pricing.currencies.USD));
});

it('an invalid «مبلغ مخصص» left on the single offer does not hold the list', async () => {
  await showSheet();
  press(t.paymentLinks.customAmount);
  const label = t.subscriptions.customPrice.label.replace('{currency}', currencySymbol('SAR'));
  fireEvent.change(screen.getByLabelText(label), { target: { value: 'abc' } });
  expect(isOff(q.send)).toBe(true);
  press(q.mode.all);
  await waitFor(() => expect(shownText()).toBe(textOf(listAsked())));
  expect(screen.queryByLabelText(label)).toBeNull();
  expect([q.send, q.edit, q.copy].map(isOff)).toEqual([false, false, false]);
});
