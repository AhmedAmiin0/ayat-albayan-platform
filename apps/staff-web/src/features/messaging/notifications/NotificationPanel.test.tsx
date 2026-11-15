import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ITEM, page, READ_ITEM, renderWithClient } from './notifications-test-kit';
import { NotificationPanel } from './NotificationPanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/features/people/auth/me', () => ({ meQuery: { queryKey: ['auth', 'me'], queryFn: () => ({ role: 'admin' }) } }));

beforeEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  apiSend.mockResolvedValue(undefined);
});

describe('NotificationPanel', () => {
  it('says so when there is nothing yet, with no «mark all»', async () => {
    apiFetch.mockResolvedValue(page([]));
    renderWithClient(<NotificationPanel onPick={vi.fn()} />);
    expect(await screen.findByText(t.bell.empty)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.bell.markAll })).toBeNull();
    expect(screen.getByRole('heading', { name: t.bell.push.title })).toBeTruthy();
  });

  it('shows the loading state, then the rows', async () => {
    apiFetch.mockResolvedValue(page([ITEM, READ_ITEM]));
    renderWithClient(<NotificationPanel onPick={vi.fn()} />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(await screen.findByText(ITEM.title)).toBeTruthy();
    expect(screen.getByText(READ_ITEM.title)).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('a failed load offers a retry that loads again', async () => {
    apiFetch.mockRejectedValueOnce(new Error('down')).mockResolvedValue(page([ITEM]));
    renderWithClient(<NotificationPanel onPick={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toBe(t.bell.loadError);
    fireEvent.click(screen.getByRole('button', { name: t.bell.retry }));
    expect(await screen.findByText(ITEM.title)).toBeTruthy();
    expect(screen.queryByText(t.bell.loadError)).toBeNull();
  });

  it('«mark all» posts no ids, then reloads the list and the badge', async () => {
    apiFetch.mockResolvedValueOnce(page([ITEM])).mockResolvedValue(page([{ ...ITEM, read_at: ITEM.created_at }]));
    renderWithClient(<NotificationPanel onPick={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: t.bell.markAll }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/me/notifications/read', {}));
    await waitFor(() => expect(screen.queryByRole('button', { name: t.bell.markAll })).toBeNull());
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});
