import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { channelPage } from './channel.fixtures';
import { MonitorChannel } from './MonitorChannel';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('MonitorChannel (the admin’s student page)', () => {
  it('closed until asked; then the thread read-only through the monitor route; the toggle hides it again', async () => {
    apiFetch.mockResolvedValue(channelPage({ read_only: true }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MonitorChannel studentId="s1" audience="admin" />
      </QueryClientProvider>,
    );
    expect(apiFetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t.studentChannel.open }));
    expect(await screen.findByText(t.studentChannel.readOnly)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/students/s1/channel/messages');
    fireEvent.click(screen.getByRole('button', { name: t.studentChannel.hide }));
    expect(screen.queryByText(t.studentChannel.readOnly)).toBeNull();
  });
});
