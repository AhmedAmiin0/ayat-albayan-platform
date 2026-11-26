import { offerText, type Quote } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { fakePricingApi } from '@/features/finance/pricing/fake-pricing-api';
import {
  button,
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
const quoteAsked = () => lastAsked(apiFetch, '/pricing/quote');
const listAsked = () => queryOf(lastAsked(apiFetch, '/pricing/list'));
const box = (name: string) => screen.getByRole<HTMLInputElement>('spinbutton', { name });
const discount = (value: string) => fireEvent.change(box(p.steps.discount), { target: { value } });
/** What the four shared steps show: country pressed, students, discount, rounding pressed. */
const kept = (country: string, rounding: string) => [
  isPressed(country),
  box(p.steps.students).value,
  box(p.steps.discount).value,
  isPressed(rounding),
];

beforeEach(() => apiFetch.mockImplementation(async (path: string) => fakePricingApi(path)));
afterEach(() => {
  apiFetch.mockReset();
  cleanup();
});

it('back on «باقة واحدة» the single offer, its steps and «مبلغ مخصص» return', async () => {
  await showSheet();
  const SA = '/pricing/quote?country=SA&duration=45&tier=standard&students=1&discount=0';
  const single = offerText(fakePricingApi(SA) as Quote, ar.pricing);
  expect(shownText()).toBe(single);
  press(q.mode.all);
  await waitFor(() => expect(shownText().startsWith(ar.pricing.listIntro)).toBe(true));
  press(q.mode.one);
  await waitFor(() => expect(shownText()).toBe(single));
  expect(isPressed(q.mode.one)).toBe(true);
  for (const name of [p.steps.duration, p.steps.frequency])
    expect(screen.getByRole('group', { name })).toBeTruthy();
  expect(button(t.paymentLinks.customAmount)).toBeTruthy();
});

it('the country, students, discount and rounding survive the switch, both ways', async () => {
  await showSheet();
  press(p.countries.AE);
  press(p.increase);
  discount('7');
  press(q.rounding.up);
  const AE = '/pricing/quote?country=AE&duration=45&tier=standard&students=2&discount=7';
  await waitFor(() => expect(quoteAsked()).toBe(`${AE}&rounding=up`));

  press(q.mode.all);
  expect(kept(p.countries.AE, q.rounding.up)).toEqual([true, '2', '7', true]);
  const there = { country: 'AE', students: '2', discount: '7', rounding: 'up' };
  await waitFor(() => expect(listAsked()).toEqual(there));

  press(p.countries.QA);
  press(p.increase);
  discount('12.5');
  press(q.rounding.down);
  const back = { country: 'QA', students: '3', discount: '12.5', rounding: 'down' };
  await waitFor(() => expect(listAsked()).toEqual(back));

  press(q.mode.one);
  expect(kept(p.countries.QA, q.rounding.down)).toEqual([true, '3', '12.5', true]);
  const QA = '/pricing/quote?country=QA&duration=45&tier=standard&students=3&discount=12.5';
  await waitFor(() => expect(quoteAsked()).toBe(`${QA}&rounding=down`));
  const quote = fakePricingApi(quoteAsked()) as Quote;
  await waitFor(() => expect(shownText()).toBe(offerText(quote, ar.pricing)));
});

it('the duration and package picked before the list are still picked after it', async () => {
  await showSheet();
  press(p.durations['60']);
  press(p.frequencies.premium);
  press(q.mode.all);
  await waitFor(() => expect(shownText().startsWith(ar.pricing.listIntro)).toBe(true));
  press(q.mode.one);
  expect([p.durations['60'], p.frequencies.premium].map(isPressed)).toEqual([true, true]);
  const picked = '/pricing/quote?country=SA&duration=60&tier=premium&students=1&discount=0';
  await waitFor(() => expect(quoteAsked()).toBe(picked));
});
