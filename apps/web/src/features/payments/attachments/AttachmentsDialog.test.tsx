import type { PaymentAttachmentView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYMENT } from '@/features/subscriptions/money-fixture';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { AttachmentsDialog } from './AttachmentsDialog';
import { PaymentsPage } from '../PaymentsPage';
import type { PaymentsUrlSearch } from '../search';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const row = (id: string, legacy = false): PaymentAttachmentView => ({ id, mime: 'image/jpeg', size: 9, url: `https://signed/${id}`, expires_at: '', legacy });

function Harness() {
  const [search, setSearch] = useState<PaymentsUrlSearch>({});
  return <PaymentsPage search={search} onSearch={(patch) => setSearch((s) => ({ ...s, ...patch }))} />;
}

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

describe('«عرض المرفقات»', () => {
  beforeEach(() => apiFetch.mockReset());

  it('admin list: a bank payment opens its attachments, the legacy receipt first, then numbered links', async () => {
    apiFetch.mockImplementation(async (path: unknown) => {
      if (String(path).endsWith('/attachments')) return [row('receipt', true), row('a1'), row('a2')];
      return { items: [PAYMENT], total: 1, page: 1, pageSize: 20, totals: [] };
    });
    wrap(<Harness />);
    fireEvent.click(await screen.findByRole('button', { name: t.payments.viewAttachments }));
    const dialog = within(await screen.findByRole('dialog', { name: t.payments.attachments }));
    const links = await dialog.findAllByRole('link');
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      [t.payments.legacyReceipt, 'https://signed/receipt'],
      [t.payments.attachmentN.replace('{n}', '1'), 'https://signed/a1'],
      [t.payments.attachmentN.replace('{n}', '2'), 'https://signed/a2'],
    ]);
    expect(links[0]?.getAttribute('target')).toBe('_blank');
    expect(apiFetch).toHaveBeenCalledWith('/payments/pay-1/attachments');
  });

  it('a cash payment without a receipt has no «عرض المرفقات»', async () => {
    apiFetch.mockResolvedValue({ items: [{ ...PAYMENT, method: 'cash', receipt_path: null }], total: 1, page: 1, pageSize: 20, totals: [] });
    wrap(<Harness />);
    await screen.findByRole('button', { name: `${t.common.delete} سهيلة` });
    expect(screen.queryByRole('button', { name: t.payments.viewAttachments })).toBeNull();
  });

  it('none: «لا توجد مرفقات»; a failure says why', async () => {
    apiFetch.mockResolvedValueOnce([]);
    const { unmount } = wrap(<AttachmentsDialog path="/payments/p/attachments" description="x" onClose={vi.fn()} />);
    expect(await screen.findByText(t.payments.noAttachments)).toBeTruthy();
    unmount();
    apiFetch.mockRejectedValueOnce(new ApiError(404, { code: 'payment_not_found' }));
    wrap(<AttachmentsDialog path="/payments/q/attachments" description="x" onClose={vi.fn()} />);
    expect(await screen.findByText(t.payments.error.payment_not_found)).toBeTruthy();
  });
});
