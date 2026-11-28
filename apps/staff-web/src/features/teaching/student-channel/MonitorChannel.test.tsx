import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { channelPage } from '@ab/web-kit/testing';
import { MonitorChannel } from './MonitorChannel';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

describe('MonitorChannel (the admin’s student page)', () => {
  it('closed until asked; then the thread read-only through the monitor route; the toggle hides it again', async () => {
    mockApi.onRead(() => channelPage({ read_only: true }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MonitorChannel studentId="s1" audience="admin" />
      </QueryClientProvider>,
    );
    expect(mockApi.reads()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: t.studentChannel.open }));
    expect(await screen.findByText(t.studentChannel.readOnly)).toBeTruthy();
    expect(mockApi.reads()).toContainEqual({
      method: 'GET',
      path: '/students/s1/channel/messages',
    });
    fireEvent.click(screen.getByRole('button', { name: t.studentChannel.hide }));
    expect(screen.queryByText(t.studentChannel.readOnly)).toBeNull();
  });
});
