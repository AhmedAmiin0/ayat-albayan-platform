import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { meetingRow } from '@/features/teaching/meetings/meeting-fixture';
import { t } from '@/lib/i18n/i18n';
import { SalesMeetings } from './SalesMeetings';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('SalesMeetings /sales/meetings «الاجتماعات»', () => {
  it('lists my meetings and creates an instant or a scheduled one', async () => {
    apiFetch.mockImplementation(async (path: string) => (path === '/meetings' ? [meetingRow({ title: 'لقاء المبيعات', can_manage: false })] : []));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SalesMeetings />
      </QueryClientProvider>,
    );
    expect(screen.getByText(t.meetingInvites.list.title)).toBeTruthy();
    expect(await screen.findByText('لقاء المبيعات')).toBeTruthy();
    expect(screen.getByRole('link', { name: t.meetingInvites.list.enter }).getAttribute('href')).toBe('/meeting/m-1');
    fireEvent.click(screen.getByRole('button', { name: t.meetingInvites.scheduledItem }));
    expect(screen.getByRole('dialog', { name: t.meetingInvites.scheduleTitle })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    fireEvent.click(screen.getByRole('button', { name: t.meetings.internal.item }));
    expect(screen.getByRole('dialog', { name: t.meetings.internal.dialogTitle })).toBeTruthy();
  });
});
