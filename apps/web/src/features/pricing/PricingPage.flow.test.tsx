import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { fakePricingApi } from './fake-pricing-api';
import { PricingPage } from './PricingPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

function renderPage() {
  apiFetch.mockImplementation((path: string) => Promise.resolve(fakePricingApi(path)));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PricingPage />
    </QueryClientProvider>,
  );
}

const copyButton = () => screen.getByRole('button', { name: t.pricing.cta });
const live = () => document.querySelector('[aria-live="polite"]');

describe('PricingPage: free discount, stale offers, announcements (docs/08 §3)', () => {
  it('takes any discount in the site’s free field (12.5 %)', async () => {
    renderPage();
    const field = screen.getByRole('spinbutton', { name: t.pricing.steps.discount });
    fireEvent.change(field, { target: { value: '12.5' } });
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/pricing/quote?country=SA&duration=45&tier=standard&students=1&discount=12.5',
      ),
    );
    expect(await screen.findByText(t.pricing.afterDiscount)).toBeTruthy();
  });

  it('opens «عدد مخصوص» on 10 lessons, as the site does', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: t.pricing.customLabel }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/pricing/quote?country=SA&duration=45&count=10&students=1&discount=0',
      ),
    );
  });

  it('disables the offer until the new choice is priced, then announces the price', async () => {
    renderPage();
    await waitFor(() => expect(live()?.textContent).toContain('180 ر.س'));
    expect(copyButton()).toHaveProperty('disabled', false);
    fireEvent.click(screen.getByRole('button', { name: t.pricing.countries.KW }));
    // Debouncing: the card still shows the SAR price, so it cannot be copied or sent.
    expect(copyButton()).toHaveProperty('disabled', true);
    expect(live()?.textContent).toBe('');
    await waitFor(() => expect(live()?.textContent).toContain('18 د.ك'));
    expect(copyButton()).toHaveProperty('disabled', false);
  });
});
