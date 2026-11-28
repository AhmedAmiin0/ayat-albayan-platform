import { offerText, type Quote } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import en from '@ab/shared/i18n/en.json';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fakePricingApi } from '@/features/finance/pricing/fake-pricing-api';
import {
  isPressed,
  shownText,
  showSheet,
} from '@/features/messaging/inbox/composer/quote/testing/quote-sheet';
import { mockCall } from '@ab/testing/mock-call';

vi.mock('@ab/web-kit/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@ab/web-kit/lib/i18n/locale', async (orig) => ({
  ...(await orig<object>()),
  locale: 'en',
}));
const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const line = () => screen.queryByTestId('quote-client-country')?.textContent;

beforeEach(() => mockApi.onRead(async ({ path }) => fakePricingApi(path)));
afterEach(() => {
  mockApi.reset('read');
  cleanup();
});

it('an English UI reads the line in English', async () => {
  await showSheet({ phone_e164: '+201001234567' });
  expect(line()).toBe("Client's country by number: 🇪🇬 Egypt (+20)");
});

it('a shared code joins the English names with «or»', async () => {
  await showSheet({ phone_e164: '+79161234567' });
  expect(line()).toBe("Client's country by number: Russia or Kazakhstan (+7)");
});

it('the controls are English while the client’s message stays Arabic', async () => {
  await showSheet({ phone_e164: '+201001234567' });
  expect(screen.getByRole('group', { name: en.inbox.quote.mode.label })).toBeTruthy();
  expect(isPressed(en.inbox.quote.mode.one)).toBe(true);
  const usd = '/pricing/quote?duration=45&tier=standard&students=1&discount=0';
  expect(shownText()).toBe(offerText(fakePricingApi(usd) as Quote, ar.pricing));
});

it('the Arabic message reads right to left inside the English sheet', async () => {
  await showSheet({ phone_e164: '+201001234567' });
  expect(screen.getByTestId('quote-text').getAttribute('dir')).toBe('auto');
});
