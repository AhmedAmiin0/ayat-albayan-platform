import type { BookingResult } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { BookedPanel, type BookedPanelProps } from './BookedPanel';

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const INVOICE = {
  id: 'inv-1',
  rule_id: 'r-1',
  invoice_id: null,
  kind: 'package',
  mime: 'image/png',
  size_bytes: 10,
  source: 'upload',
  created_at: '2026-10-03T09:00:00.000Z',
  students: [],
};
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children }: { to: string; search: Record<string, string>; children: ReactNode }) => (
    <a href={`${to}?${new URLSearchParams(search)}`}>{children}</a>
  ),
}));

const RESULT: BookingResult = {
  rule_id: 'r-1',
  invoice_id: null,
  student_ids: ['s-new'],
  guardian_ids: ['g-1'],
  lessons: [{ id: 'l-1', starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z' }],
  message_ids: [],
};

function renderPanel(props: Partial<BookedPanelProps>) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookedPanel result={RESULT} teacherId="t-1" tz="Asia/Riyadh" {...props} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  apiSend.mockReset();
  apiFetch.mockReset();
});

describe('BookedPanel after «اشترك» from the chat (R-SUB-01)', () => {
  it('a regular package offers «اعمل الاشتراك» for the new student, then the way back to the chat', async () => {
    renderPanel({ subscribeFor: { id: 's-new', name: 'جود', code: null }, chatPhone: '+966501234567' });
    expect(screen.getByRole('link', { name: t.inbox.subscription.backToChat }).getAttribute('href')).toBe(
      '/admin/inbox?phone=%2B966501234567&page=1',
    );
    apiSend.mockImplementation(async (_m: string, path: string) =>
      path === '/subscriptions/quote' ? Promise.reject(new Error('no quote in this test')) : { id: 'sub-1' },
    );
    fireEvent.click(screen.getByRole('button', { name: t.inbox.subscription.make }));
    const dialog = within(screen.getByRole('dialog', { name: t.subscriptions.new }));
    expect(dialog.getByText('جود')).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/subscriptions', expect.objectContaining({ studentId: 's-new' })));
    expect(await screen.findByText(t.subscriptions.saved)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.inbox.subscription.make })).toBeNull();
  });

  it('a trial (or a booking not from a lead) offers neither, and asks for no invoice', () => {
    renderPanel({ subscribeFor: null, chatPhone: null, kind: 'trial' });
    expect(screen.getByRole('heading', { name: t.booking.booked })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.inbox.subscription.make })).toBeNull();
    expect(screen.queryByRole('link', { name: t.inbox.subscription.backToChat })).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('BookedPanel invoice and makeup (R-SCH-10, R-PAY-03)', () => {
  it('a makeup says so, offers no subscription and opens its invoice in a dialog', async () => {
    apiFetch.mockImplementation(async (path: string) =>
      path.startsWith('/invoices?') ? [{ ...INVOICE, kind: 'makeup' }] : { url: 'https://signed/inv', expires_at: 'x' },
    );
    renderPanel({ kind: 'makeup', subscribeFor: null });
    expect(screen.getByRole('heading', { name: t.booking.makeup.booked })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.inbox.subscription.make })).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith('/invoices?ruleId=r-1');
    fireEvent.click(await screen.findByRole('button', { name: t.booking.invoice.view }));
    const dialog = await screen.findByRole('dialog', { name: new RegExp(t.booking.invoice.label) });
    expect((await within(dialog).findByRole('img')).getAttribute('src')).toBe('https://signed/inv');
  });

  it('a package shows its invoice, and «سجّل الدفعة» only after the subscription is made', async () => {
    apiFetch.mockResolvedValue([INVOICE]);
    apiSend.mockImplementation(async (_m: string, path: string) =>
      path === '/subscriptions/quote' ? Promise.reject(new Error('no quote in this test')) : { id: 'sub-1' },
    );
    renderPanel({ kind: 'package', subscribeFor: { id: 's-new', name: 'جود', code: null } });
    expect(await screen.findByRole('button', { name: t.booking.invoice.view })).toBeTruthy();
    expect(screen.queryByRole('link', { name: t.booking.invoice.recordPayment })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.inbox.subscription.make }));
    fireEvent.click(within(screen.getByRole('dialog', { name: t.subscriptions.new })).getByRole('button', { name: t.common.save }));
    const pay = await screen.findByRole('link', { name: t.booking.invoice.recordPayment });
    expect(pay.getAttribute('href')).toBe('/admin/payments?');
  });
});
