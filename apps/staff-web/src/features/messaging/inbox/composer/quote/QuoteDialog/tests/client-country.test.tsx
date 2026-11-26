import { COUNTRIES } from '@ab/client-core';
import { offerText, priceListText, type PriceListResponse, type Quote } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
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

const EGYPT = '+201001234567';
const USD = '/pricing/quote?duration=45&tier=standard&students=1&discount=0';
const line = () => screen.queryByTestId('quote-client-country');
/** The Arabic names of the countries sharing `dial`, in the list's order. */
const sharing = (dial: string) => COUNTRIES.filter((c) => c.dial === dial).map((c) => c.ar);

beforeEach(() => apiFetch.mockImplementation(async (path: string) => fakePricingApi(path)));
afterEach(() => {
  apiFetch.mockReset();
  cleanup();
});

it('names the country of the chat’s number, whichever it is, with its flag and code', async () => {
  await showSheet({ phone_e164: EGYPT });
  expect(line()?.textContent).toBe('دولة العميل حسب الرقم: 🇪🇬 مصر (+20)');
});

it('a site country is named the same way', async () => {
  await showSheet();
  expect(line()?.textContent).toBe('دولة العميل حسب الرقم: 🇸🇦 السعودية (+966)');
});

it('the code is its own left-to-right island, so the line cannot print «20+»', async () => {
  await showSheet({ phone_e164: EGYPT });
  const code = within(line() ?? document.body).getByText('+20');
  expect([code.tagName, code.getAttribute('dir')]).toEqual(['BDI', 'ltr']);
});

it('a shared code joins its countries’ names, without a flag', async () => {
  await showSheet({ phone_e164: '+12025550123' });
  const names = sharing('+1');
  expect(names.length).toBeGreaterThan(1);
  expect(line()?.textContent).toBe(`دولة العميل حسب الرقم: ${names.join(' أو ')} (+1)`);
});

it('a code shared by more than three names the first three only', async () => {
  await showSheet({ phone_e164: '+447700900123' });
  const names = sharing('+44');
  expect(names).toHaveLength(4);
  const text = line()?.textContent;
  expect(text).toBe(`دولة العميل حسب الرقم: ${names.slice(0, 3).join(' أو ')} (+44)`);
  expect(text).not.toContain(names.at(-1));
});

it('a number whose code no country has shows no line', async () => {
  await showSheet({ phone_e164: '+2101234567' });
  expect(line()).toBeNull();
});

it('is information only: the country step still opens on «دولة أخرى», priced in USD', async () => {
  await showSheet({ phone_e164: EGYPT });
  expect(isPressed(t.pricing.otherCountry)).toBe(true);
  expect(lastAsked(apiFetch, '/pricing/quote')).toBe(USD);
});

it('never reaches the client: neither text names the country, and the line stays', async () => {
  await showSheet({ phone_e164: EGYPT });
  expect(shownText()).toBe(offerText(fakePricingApi(USD) as Quote, ar.pricing));
  press(t.inbox.quote.mode.all);
  const list = '/pricing/list?students=1&discount=0&rounding=nearest';
  const text = priceListText(fakePricingApi(list) as PriceListResponse, ar.pricing);
  await waitFor(() => expect(shownText()).toBe(text));
  expect(text).not.toContain('مصر');
  expect(line()?.textContent).toContain('مصر');
});
