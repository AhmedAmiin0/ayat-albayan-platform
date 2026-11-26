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

it('a code two countries share joins both names, without a flag', async () => {
  await showSheet({ phone_e164: '+12025550123' });
  expect(line()?.textContent).toBe('دولة العميل حسب الرقم: الولايات المتحدة أو كندا (+1)');
});

it('a code a country shares with its territories names the country alone', async () => {
  await showSheet({ phone_e164: '+447700900123' });
  expect(line()?.textContent).toBe('دولة العميل حسب الرقم: 🇬🇧 المملكة المتحدة (+44)');
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
