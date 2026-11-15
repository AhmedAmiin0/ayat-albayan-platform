import { offerText, type Quote } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { fakePricingApi } from '@/features/finance/pricing/fake-pricing-api';
import { t } from '@/lib/i18n/i18n';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { QuoteDialog } from './QuoteDialog';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const p = t.pricing;

function show(phone: string) {
  apiFetch.mockImplementation(async (path: string) => fakePricingApi(path));
  renderWithClient(<QuoteDialog thread={thread({ phone_e164: phone, session_open: true })} onClose={vi.fn()} onFilled={vi.fn()} />);
}
const quotePath = () => String(apiFetch.mock.calls.find(([path]) => String(path).startsWith('/pricing/quote'))?.[0]);

afterEach(() => {
  apiFetch.mockReset();
  cleanup();
});

it.each([
  ['+966501234567', 'SA'],
  ['+971501234567', 'AE'],
] as const)('a %s chat opens on its country (%s), still editable', async (phone, country) => {
  show(phone);
  await screen.findByTestId('quote-text');
  expect(quotePath()).toBe(`/pricing/quote?country=${country}&duration=45&tier=standard&students=1&discount=0`);
  expect(screen.getByRole('button', { name: p.countries[country] }).getAttribute('aria-pressed')).toBe('true');
});

it('any other code opens on «دولة أخرى»: no country sent, the API quotes in USD', async () => {
  show('+447700900123');
  await screen.findByTestId('quote-text');
  expect(quotePath()).toBe('/pricing/quote?duration=45&tier=standard&students=1&discount=0');
  expect(screen.getByRole('button', { name: p.otherCountry }).getAttribute('aria-pressed')).toBe('true');
});

it('the preview is exactly the calculator offer text; the discount is the pills only', async () => {
  show('+966501234567');
  const quote = fakePricingApi(quotePath()) as Quote;
  await waitFor(() => expect(screen.getByTestId('quote-text').textContent).toBe(offerText(quote, ar.pricing)));
  expect(screen.getByRole('button', { name: p.discounts['15'] })).toBeTruthy();
  expect(screen.queryByRole('spinbutton', { name: p.steps.discount })).toBeNull();
});
