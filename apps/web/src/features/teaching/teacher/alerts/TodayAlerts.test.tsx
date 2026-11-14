import { HOME_PREFS_KEY } from '@ab/client-core';
import { PUBLIC_SETTING_DEFAULTS, type NotificationsPage } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery } from '@/lib/settings/public-config';
import { reloadHomePrefs } from './home-prefs';
import { TodayAlerts } from './TodayAlerts';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ can: () => true }),
}));

const NOW = new Date('2026-11-14T09:00:00.000Z');
// Unconfirmed, 10 minutes ahead: «soon» and «confirm»; another lesson cancelled by the office.
const SOON = lesson({ id: 'l-1', starts_at: '2026-11-14T09:10:00.000Z' });
const GONE = lesson({ id: 'l-2', starts_at: '2026-11-14T15:00:00.000Z', status: 'cancelled_by_admin' });
const PAGE: NotificationsPage = {
  items: [{ id: 'n-1', kind: 'new_student', title: 'طالب جديد', body: 'سهيلة', data: {},
    created_at: '2026-11-14T08:00:00.000Z', read_at: null }],
  total: 1, page: 1, pageSize: 20, unread: 1,
};

function renderAlerts(lessons = [SOON, GONE]) {
  apiFetch.mockImplementation((path: string) => Promise.resolve(path.startsWith('/me/notifications') ? PAGE : []));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {} });
  const onOpen = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <TodayAlerts lessons={lessons} now={NOW} tz="Africa/Cairo" onOpen={onOpen} />
    </QueryClientProvider>,
  );
  return onOpen;
}

const list = () => within(screen.getByRole('region', { name: t.teacherAlerts.title }));

describe('TodayAlerts «تنبيهات اليوم» (owner 2026-11-14)', () => {
  afterEach(() => {
    localStorage.clear();
    reloadHomePrefs();
    apiFetch.mockReset();
  });

  it('lists her lessons alerts, each with one action that opens the lesson', async () => {
    const onOpen = renderAlerts();
    expect(await list().findByText(/طالب جديد/)).toBeTruthy();
    const open = list().getAllByRole('button', { name: t.teacherAlerts.open });
    expect(open).toHaveLength(3); // soon, confirm, the office's cancel
    fireEvent.click(open[0] ?? document.body);
    expect(onOpen).toHaveBeenCalledWith('l-1');
  });

  it('marks a bell row read through the bell API', async () => {
    renderAlerts();
    fireEvent.click(await list().findByRole('button', { name: t.teacherAlerts.markRead }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/me/notifications/read', { ids: ['n-1'] }));
  });

  it('says «لا تنبيهات اليوم» on a quiet day', async () => {
    apiFetch.mockResolvedValue([]);
    renderAlerts([]);
    expect(await list().findByText(t.teacherAlerts.empty)).toBeTruthy();
  });

  it('«تخصيص» switches a kind off, at once and saved in this browser', async () => {
    renderAlerts();
    await list().findByText(/طالب جديد/);
    fireEvent.click(list().getByRole('button', { name: t.teacherAlerts.customize }));
    const dialog = within(screen.getByRole('dialog', { name: t.teacherAlerts.customizeTitle }));
    fireEvent.click(dialog.getByRole('switch', { name: t.teacherAlerts.kind.bell }));
    expect(list().queryByText(/طالب جديد/)).toBeNull();
    expect(JSON.parse(localStorage.getItem(HOME_PREFS_KEY) ?? '{}')).toMatchObject({ alerts: { bell: false } });
    fireEvent.click(dialog.getByRole('button', { name: t.teacherAlerts.done }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
