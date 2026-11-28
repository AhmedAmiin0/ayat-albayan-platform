import { fireEvent, screen, waitFor } from '@testing-library/react';
import { mockCall, type CallHandler } from '@ab/testing/mock-call';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { ITEM, page, READ_ITEM, renderWithClient } from './notifications-test-kit';
import { NotificationPanel } from './NotificationPanel';

const bellRead = vi.fn<CallHandler>();
const bellWrite = vi.fn<CallHandler>();
const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
const markRead = (body: object) => ({ method: 'POST', path: '/me/notifications/read', body });
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@ab/web-kit/auth/me/me', async () => {
  const { pathKey } = await import('@ab/client-core');
  return { meQuery: { queryKey: pathKey('/auth/me'), queryFn: () => ({ role: 'admin' }) } };
});

beforeEach(() => {
  mockApi.reset();
  mockApi.onRead(bellRead);
  mockApi.onWrite(bellWrite);
  bellRead.mockReset();
  bellWrite.mockReset();
  bellWrite.mockResolvedValue(undefined);
});

describe('NotificationPanel', () => {
  it('says so when there is nothing yet, with no «mark all»', async () => {
    bellRead.mockResolvedValue(page([]));
    renderWithClient(<NotificationPanel onPick={vi.fn()} />);
    expect(await screen.findByText(t.bell.empty)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.bell.markAll })).toBeNull();
    expect(screen.getByRole('heading', { name: t.bell.push.title })).toBeTruthy();
  });

  it('shows the loading state, then the rows', async () => {
    bellRead.mockResolvedValue(page([ITEM, READ_ITEM]));
    renderWithClient(<NotificationPanel onPick={vi.fn()} />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(await screen.findByText(ITEM.title)).toBeTruthy();
    expect(screen.getByText(READ_ITEM.title)).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('a failed load offers a retry that loads again', async () => {
    bellRead.mockRejectedValueOnce(new Error('down')).mockResolvedValue(page([ITEM]));
    renderWithClient(<NotificationPanel onPick={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toBe(t.bell.loadError);
    fireEvent.click(screen.getByRole('button', { name: t.bell.retry }));
    expect(await screen.findByText(ITEM.title)).toBeTruthy();
    expect(screen.queryByText(t.bell.loadError)).toBeNull();
  });

  it('«mark all» posts no ids, then reloads the list and the badge', async () => {
    bellRead
      .mockResolvedValueOnce(page([ITEM]))
      .mockResolvedValue(page([{ ...ITEM, read_at: ITEM.created_at }]));
    renderWithClient(<NotificationPanel onPick={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: t.bell.markAll }));
    await waitFor(() => expect(bellWrite).toHaveBeenCalledWith(markRead({})));
    await waitFor(() => expect(screen.queryByRole('button', { name: t.bell.markAll })).toBeNull());
    expect(bellRead).toHaveBeenCalledTimes(2);
  });
});
