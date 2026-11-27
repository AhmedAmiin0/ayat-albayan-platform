import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderAt } from '@/test/render-at';
import { AlertRow } from './AlertRow';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const studentId = '0b0c53a6-6f0e-4f56-9d5d-0d6a3a0e6a11';
const reportId = '1b0c53a6-6f0e-4f56-9d5d-0d6a3a0e6a11';
const alert = (over: { kind?: string; read_at?: string | null } = {}) => ({
  id: 'a1',
  kind: 'report_sent',
  title: 'وصل تقرير الحلقة',
  body: 'body',
  data: { studentId, reportId },
  created_at: '2026-10-27T16:00:00.000Z',
  read_at: null,
  ...over,
});

const show = (row: ReturnType<typeof alert>, onRead = vi.fn()) => {
  const at = renderAt(
    <ul>
      <AlertRow alert={row as never} kind="guardian" tz="Africa/Cairo" onRead={onRead} />
    </ul>,
    '/alerts',
  );
  return { ...at, onRead };
};

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({});
});

describe('AlertRow', () => {
  it('unread: the dot, the title, the body and the time', async () => {
    show(alert());
    const row = await screen.findByRole('button', { name: /وصل تقرير الحلقة/ });
    expect(row.getAttribute('data-unread')).toBe('true');
    expect(screen.getByLabelText(t.bell.unread)).toBeTruthy();
    expect(row.textContent).toContain('body');
  });

  it('read: no dot, no unread mark', async () => {
    show(alert({ read_at: '2026-10-27T17:00:00.000Z' }));
    const row = await screen.findByRole('button', { name: /وصل تقرير الحلقة/ });
    expect(row.getAttribute('data-unread')).toBeNull();
    expect(screen.queryByLabelText(t.bell.unread)).toBeNull();
  });

  it('a tap on an unread row marks it read and opens its page', async () => {
    const { onRead, router } = show(alert());
    fireEvent.click(await screen.findByRole('button', { name: /وصل تقرير الحلقة/ }));
    expect(onRead).toHaveBeenCalledWith('a1');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/report/${reportId}`));
  });

  it('a tap on a read row opens its page without marking it again', async () => {
    const { onRead, router } = show(alert({ read_at: '2026-10-27T17:00:00.000Z' }));
    fireEvent.click(await screen.findByRole('button', { name: /وصل تقرير الحلقة/ }));
    expect(onRead).not.toHaveBeenCalled();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/report/${reportId}`));
  });

  it('a kind with no page: marked read, the page stays', async () => {
    const { onRead, router } = show(alert({ kind: 'staff_only' }));
    fireEvent.click(await screen.findByRole('button', { name: /وصل تقرير الحلقة/ }));
    expect(onRead).toHaveBeenCalledWith('a1');
    expect(router.state.location.pathname).toBe('/alerts');
  });
});
