import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { LeadsInbox } from './LeadsInbox';
import type { LeadRow } from './types';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiFetch, apiSend }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="/admin/book">{children}</a> }));

const ROW: LeadRow = {
  id: 'l1',
  phone_e164: '+966501234567',
  name: 'أم سهيلة',
  source: 'whatsapp_direct',
  status: 'new',
  last_inbound_at: null,
  last_outbound_at: null,
  created_at: '2026-09-28T10:00:00+00:00',
};
const askLabel = (row: LeadRow) => t.leads.reclassifyRow.replace('{name}', row.name ?? row.phone_e164);

async function openConfirm(row: LeadRow = ROW) {
  apiFetch.mockResolvedValue({ items: [row], total: 1, page: 1, pageSize: 25 });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LeadsInbox search={{ page: 1 }} onSearch={vi.fn()} />
    </QueryClientProvider>,
  );
  const ask = await screen.findByRole('button', { name: askLabel(row) });
  fireEvent.click(ask);
  return { ask, strip: screen.getByRole('group', { name: t.leads.reclassifyAsApplicant }) };
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('LeadsInbox reclassify to job applicants (R-LEAD-04)', () => {
  it('the row icon opens an inline confirm and focuses «أبقِها هنا»', async () => {
    const { ask, strip } = await openConfirm();
    expect(ask.getAttribute('aria-expanded')).toBe('true');
    expect(within(strip).getByText(t.leads.reclassifyConfirm)).toBeTruthy();
    expect(document.activeElement).toBe(within(strip).getByRole('button', { name: t.leads.keepHere }));
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('moving POSTs, closes the strip and confirms in Arabic', async () => {
    apiSend.mockResolvedValue({ id: 'a1' });
    const { strip } = await openConfirm();
    fireEvent.click(within(strip).getByRole('button', { name: t.leads.reclassifyAsApplicant }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(t.leads.reclassified));
    expect(apiSend).toHaveBeenCalledWith('POST', '/leads/l1/reclassify');
    expect(screen.queryByRole('group', { name: t.leads.reclassifyAsApplicant })).toBeNull();
  });

  it('«أبقِها هنا» closes the strip without a request and returns focus to the row', async () => {
    const { ask, strip } = await openConfirm();
    fireEvent.click(within(strip).getByRole('button', { name: t.leads.keepHere }));
    expect(screen.queryByRole('group', { name: t.leads.reclassifyAsApplicant })).toBeNull();
    expect(document.activeElement).toBe(ask);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('Esc keeps the lead: the strip closes and focus returns to the briefcase', async () => {
    const { ask, strip } = await openConfirm();
    fireEvent.keyDown(within(strip).getByRole('button', { name: t.leads.keepHere }), { key: 'Escape' });
    expect(screen.queryByRole('group', { name: t.leads.reclassifyAsApplicant })).toBeNull();
    expect(document.activeElement).toBe(ask);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a failed move keeps the strip open and says so', async () => {
    apiSend.mockRejectedValue(new Error('boom'));
    const { strip } = await openConfirm();
    fireEvent.click(within(strip).getByRole('button', { name: t.leads.reclassifyAsApplicant }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(t.common.error));
    expect(screen.getByRole('group', { name: t.leads.reclassifyAsApplicant })).toBeTruthy();
  });

  it('an unnamed lead is named by its phone', async () => {
    const { strip } = await openConfirm({ ...ROW, name: null });
    expect(strip).toBeTruthy();
    expect(screen.getAllByText('+966 50 123 4567')).toHaveLength(1);
  });
});
