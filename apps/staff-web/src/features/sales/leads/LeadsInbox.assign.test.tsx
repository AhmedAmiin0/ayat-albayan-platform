import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { LeadsInbox } from './LeadsInbox';
import type { LeadView } from '@ab/shared';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', () => ({ apiFetch, apiSend }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    children,
    ...rest
  }: {
    to: string;
    search: Record<string, string>;
    children: ReactNode;
  }) => (
    <a href={`${to}?${new URLSearchParams(search)}`} {...rest}>
      {children}
    </a>
  ),
}));

const ROW: LeadView = {
  id: 'l1', phone_e164: '+966501234567', name: 'أم سهيلة', source: 'facebook_ad', status: 'new',
  last_inbound_at: null, last_outbound_at: null, created_at: '2026-09-28T10:00:00+00:00',
  assigned_to: null, assigned_to_name: null,
};
const P1 = 'a0000000-0000-4000-8000-000000000001';
const P2 = 'a0000000-0000-4000-8000-000000000002';
const PEOPLE = [
  { id: P1, name: 'منى', open_leads: 2 },
  { id: P2, name: 'خالد', open_leads: 0 },
];

function open(row: LeadView = ROW) {
  apiFetch.mockImplementation(async (path: string) =>
    path.startsWith('/sales/people') ? PEOPLE : { items: [row], total: 1, page: 1, pageSize: 25 });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <LeadsInbox search={{ page: 1 }} onSearch={vi.fn()} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('leads: «مسؤول المبيعات» (admin)', () => {
  it('each lead has a select: «بدون مسؤول» plus the salespeople; picking one POSTs the assignment', async () => {
    open();
    const select = await screen.findByRole<HTMLSelectElement>('combobox', { name: /مسؤول المبيعات لـ أم سهيلة/ });
    await waitFor(() => expect(select.options).toHaveLength(3));
    expect([...select.options].map((o) => o.textContent)).toEqual([t.sales.assign.none, 'منى', 'خالد']);
    expect(select.value).toBe('');
    apiSend.mockResolvedValue({});
    fireEvent.change(select, { target: { value: P2 } });
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/leads/l1/assign', { profileId: P2 }));
  });

  it('choosing «بدون مسؤول» sends profileId null', async () => {
    open({ ...ROW, assigned_to: P1, assigned_to_name: 'منى' });
    const select = await screen.findByRole<HTMLSelectElement>('combobox', { name: /مسؤول المبيعات لـ/ });
    await waitFor(() => expect(select.value).toBe(P1));
    apiSend.mockResolvedValue({});
    fireEvent.change(select, { target: { value: '' } });
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/leads/l1/assign', { profileId: null }));
  });

  it('«عيّن العملاء الذين بلا مسؤول» assigns them all and says how many', async () => {
    open();
    apiSend.mockResolvedValue({ assigned: 7 });
    fireEvent.click(await screen.findByRole('button', { name: t.sales.assign.assignAll }));
    expect(await screen.findByText('عُيّن 7 عميل')).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/leads/assign-unassigned', undefined);
  });
});
