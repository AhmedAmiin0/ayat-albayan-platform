import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { fakePricingApi } from './fake-pricing-api';
import { PricingPage } from './PricingPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

function renderPage() {
  apiFetch.mockImplementation((path: string) => Promise.resolve(fakePricingApi(path)));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PricingPage />
    </QueryClientProvider>,
  );
}

const pick = (group: string, option: string) =>
  fireEvent.click(
    within(screen.getByRole('group', { name: group })).getByRole('button', { name: option }),
  );
const price = () => screen.findByRole('figure', { name: t.pricing.packagePrice });

describe('PricingPage (docs/08)', () => {
  it('asks the API for the default quote and shows its price under the cartouche title', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: t.pricing.title })).toBeTruthy();
    expect((await price()).textContent).toContain('180 ر.س');
    expect(apiFetch).toHaveBeenCalledWith(
      '/pricing/quote?country=SA&duration=45&tier=standard&students=1&discount=0',
    );
    expect(apiFetch).toHaveBeenCalledWith('/pricing/catalog?country=SA&duration=45');
  });

  it('re-asks after a change and shows the new quote (الكويت, 3 مرات → 18 د.ك)', async () => {
    renderPage();
    await price();
    pick(t.pricing.steps.country, t.pricing.countries.KW);
    await waitFor(async () => expect((await price()).textContent).toContain('18 د.ك'));
    expect(apiFetch).toHaveBeenCalledWith(
      '/pricing/quote?country=KW&duration=45&tier=standard&students=1&discount=0',
    );
  });

  it('quotes another country in USD with the rate date and the attribution link', async () => {
    renderPage();
    pick(t.pricing.steps.country, t.pricing.otherCountry);
    // Under the quote and under the «أسعار كل الخطط» table: both show converted prices.
    const links = () => screen.queryAllByRole('link', { name: t.pricing.fx.attribution });
    await waitFor(() => expect(links()).toHaveLength(2));
    for (const link of links()) {
      expect(link.getAttribute('href')).toBe('https://www.exchangerate-api.com');
    }
    expect((await price()).textContent).toContain('48 $');
    expect(apiFetch).toHaveBeenCalledWith(
      '/pricing/quote?duration=45&tier=standard&students=1&discount=0',
    );
  });

  it('hides the duration for the weekly package and says it is a fixed 90 minutes', async () => {
    renderPage();
    pick(t.pricing.steps.frequency, t.pricing.frequencies.weekly);
    expect(screen.queryByRole('group', { name: t.pricing.steps.duration })).toBeNull();
    expect(screen.getByText(t.pricing.fixedDuration)).toBeTruthy();
    expect(
      await screen.findByRole('heading', { level: 3, name: t.pricing.packages.weekly.name }),
    ).toBeTruthy();
  });

  it('asks for a custom count with the stepper', async () => {
    renderPage();
    pick(t.pricing.steps.frequency, t.pricing.customLabel);
    const count = screen.getByLabelText(t.pricing.customCount, { selector: 'input' });
    fireEvent.change(count, { target: { value: '20' } });
    expect(
      await screen.findByRole('heading', { level: 3, name: t.pricing.packages.custom.name }),
    ).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(
      '/pricing/quote?country=SA&duration=45&count=20&students=1&discount=0',
    );
  });

  it('shows the discount line and the featured saving only when they apply', async () => {
    renderPage();
    pick(t.pricing.steps.frequency, t.pricing.frequencies.bulk);
    pick(t.pricing.steps.discount, t.pricing.discounts['10']);
    expect(await screen.findByText(`${t.pricing.saveLabel} 8%`)).toBeTruthy();
    expect(await screen.findByText(t.pricing.afterDiscount)).toBeTruthy();
  });

  it('lists every plan for the country and duration', async () => {
    renderPage();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(within(table).getByText(t.pricing.packages.premium.name)).toBeTruthy();
  });
});
