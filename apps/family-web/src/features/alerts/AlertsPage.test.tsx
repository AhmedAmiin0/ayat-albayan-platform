import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { renderAt } from '@/test/render-at';
import { AlertsPage } from './AlertsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({
  ...(await orig<object>()),
  apiFetch,
  apiSend,
}));

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
  apiFetch.mockReset();
  apiSend.mockClear();
});

describe('«الإشعارات» of the family pages', () => {
  it('rows under اليوم / أقدم; «تعليم الكل كمقروء» while any is unread', async () => {
    apiFetch.mockResolvedValue({ items: [row('a', 0, false), row('b', 30, true)], unread: 1 });
    renderAt(<AlertsPage kind="guardian" />);
    expect(await screen.findByRole('region', { name: t.portal.app.alerts.today })).toBeTruthy();
    expect(screen.getByRole('region', { name: t.portal.app.alerts.older })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: t.bell.title })).toBeTruthy();
    expect(screen.getByText(t.familyLook.pages.alerts.line)).toBeTruthy();
    expect(screen.getByText(t.familyLook.pages.alerts.unread.replace('{n}', '1'))).toBeTruthy();
    expect(screen.getAllByLabelText(t.bell.unread)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: t.portal.app.alerts.markAll }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/me/notifications/read', {}));
  });

  it('a tap marks the row read', async () => {
    apiFetch.mockResolvedValue({ items: [row('a', 0, false)], unread: 1 });
    renderAt(<AlertsPage kind="guardian" />);
    fireEvent.click(await screen.findByRole('button', { name: /title a/ }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/me/notifications/read', { ids: ['a'] }),
    );
  });

  it('nothing yet: the empty line', async () => {
    apiFetch.mockResolvedValue({ items: [], unread: 0 });
    renderAt(<AlertsPage kind="student" />);
    expect(await screen.findByText(t.bell.empty)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.portal.app.alerts.markAll })).toBeNull();
  });
});
