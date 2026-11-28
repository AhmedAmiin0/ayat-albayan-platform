import { fireEvent, screen, waitFor } from '@testing-library/react';
import { mockCall, type CallHandler } from '@ab/testing/mock-call';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderAt } from '@/test/render-at';
import { AlertsPage } from './AlertsPage';

const bellRead = vi.fn<CallHandler>();
const bellWrite = vi.fn<CallHandler>(async () => undefined);
const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
const markRead = (body: object) => ({ method: 'POST', path: '/me/notifications/read', body });

const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const row = (id: string, days: number, read: boolean) => ({
  id,
  kind: 'report_sent',
  title: `title ${id}`,
  body: 'body',
  data: { studentId: '0b0c53a6-6f0e-4f56-9d5d-0d6a3a0e6a11', reportId: '1b0c53a6-6f0e-4f56-9d5d-0d6a3a0e6a11' },
  created_at: ago(days),
  read_at: read ? ago(days) : null,
});

beforeEach(() => {
  mockApi.reset();
  mockApi.onRead(bellRead);
  mockApi.onWrite(bellWrite);
  bellRead.mockReset();
  bellWrite.mockClear();
});

describe('«الإشعارات» of the family pages', () => {
  it('rows under اليوم / أقدم; «تعليم الكل كمقروء» while any is unread', async () => {
    bellRead.mockResolvedValue({ items: [row('a', 0, false), row('b', 30, true)], unread: 1 });
    renderAt(<AlertsPage kind="guardian" />);
    expect(await screen.findByRole('region', { name: t.portal.app.alerts.today })).toBeTruthy();
    expect(screen.getByRole('region', { name: t.portal.app.alerts.older })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.portal.app.alerts.markAll }));
    await waitFor(() => expect(bellWrite).toHaveBeenCalledWith(markRead({})));
  });

  it('a tap marks the row read', async () => {
    bellRead.mockResolvedValue({ items: [row('a', 0, false)], unread: 1 });
    renderAt(<AlertsPage kind="guardian" />);
    fireEvent.click(await screen.findByRole('button', { name: /title a/ }));
    await waitFor(() =>
      expect(bellWrite).toHaveBeenCalledWith(markRead({ ids: ['a'] })),
    );
  });

  it('an unread row is told apart by more than a tint: its bar, its dot and a semibold title', async () => {
    bellRead.mockResolvedValue({ items: [row('a', 0, false), row('b', 0, true)], unread: 1 });
    renderAt(<AlertsPage kind="guardian" />);
    const unread = await screen.findByRole('button', { name: /title a/ });
    const read = screen.getByRole('button', { name: /title b/ });
    expect([unread.dataset.unread, read.dataset.unread]).toEqual(['true', undefined]);
    expect(unread.className).toContain('before:bg-lapis');
    expect(read.className).not.toContain('before:bg-lapis');
  });

  it('nothing yet: the empty line', async () => {
    bellRead.mockResolvedValue({ items: [], unread: 0 });
    renderAt(<AlertsPage kind="student" />);
    expect(await screen.findByText(t.bell.empty)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.portal.app.alerts.markAll })).toBeNull();
  });
});
