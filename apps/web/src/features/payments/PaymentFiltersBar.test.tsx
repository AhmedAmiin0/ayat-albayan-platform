import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { PaymentFilters } from './api';
import { PaymentFiltersBar } from './PaymentFiltersBar';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

function stubPhone() {
  const query = (media: string) => ({ matches: media === '(max-width: 39.99rem)', addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('matchMedia', vi.fn(query));
}

function renderBar(value: PaymentFilters = {}) {
  apiFetch.mockResolvedValue([]);
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PaymentFiltersBar value={value} onChange={onChange} />
    </QueryClientProvider>,
  );
  return onChange;
}

describe('PaymentFiltersBar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    apiFetch.mockReset();
  });

  it('from 640px: the fields sit inline, no opener', () => {
    renderBar();
    expect(screen.getByLabelText(t.finance.from)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.payments.filters })).toBeNull();
  });

  it('phones: «تصفية المدفوعات» (with the count) opens the fields in a full-screen dialog', () => {
    stubPhone();
    const onChange = renderBar({ method: 'cash', from: '2026-10-01' });
    expect(screen.queryByLabelText(t.finance.from)).toBeNull();
    const opener = screen.getByRole('button', { name: `${t.payments.filters}(2)` });
    fireEvent.click(opener);
    const sheet = within(screen.getByRole('dialog', { name: t.payments.filters }));
    fireEvent.change(sheet.getByLabelText(t.finance.to), { target: { value: '2026-10-31' } });
    expect(onChange).toHaveBeenCalledWith({ to: '2026-10-31' });
    fireEvent.click(sheet.getByRole('button', { name: t.payments.showResults }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
