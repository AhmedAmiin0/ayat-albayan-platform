import type { ActivityView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { ListUrlState } from '@/lib/list-url';
import { ActivityPage } from './ActivityPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, children }: { to: string; params: Record<string, string>; children: ReactNode }) => (
    <a href={Object.entries(params).reduce((h, [k, v]) => h.replace(`$${k}`, v), to)}>{children}</a>
  ),
}));

const row = (over: Partial<ActivityView>): ActivityView => ({
  id: 'r1', at: '2026-10-05T09:00:00Z', actor_id: 'u1', actor_name: 'أحمد', actor_role: 'admin',
  action: 'students.update', method: 'PATCH', route: '/students/:id', entity: 'students', entity_id: 's1',
  status: 200, duration_ms: 42, meta: {},
  ...over,
});

const EMPTY: ListUrlState = { page: 1, sort: {}, filters: {} };

function renderPage(items: ActivityView[], search: ListUrlState = EMPTY) {
  apiFetch.mockResolvedValue({ items, total: items.length, page: 1, pageSize: 25 });
  const onSearch = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ActivityPage search={search} onSearch={onSearch} />
    </QueryClientProvider>,
  );
  return onSearch;
}

afterEach(() => apiFetch.mockReset());

describe('ActivityPage «سجل النشاط»', () => {
  it('lists rows with user + role, Arabic action label, entity link and result', async () => {
    renderPage([row({}), row({ id: 'r2', actor_id: null, actor_name: null, actor_role: 'public', action: 'authSession.loginFailed', entity: 'activity', entity_id: null, status: 401 })]);
    expect(await screen.findByText(t.activity.actions.students.update)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: t.activity.title })).toBeTruthy();
    expect(screen.getByText(t.activity.count.replace('{n}', '2'))).toBeTruthy();
    const table = within(screen.getByRole('table'));
    expect(table.getByText('أحمد')).toBeTruthy();
    expect(table.getByText(t.activity.roles.admin)).toBeTruthy();
    expect(table.getByRole('link', { name: t.activity.entities.students }).getAttribute('href')).toBe('/admin/students/s1');
    expect(table.getByText(t.activity.error.replace('{status}', '401')).closest('[data-tone]')?.getAttribute('data-tone')).toBe('bad');
    expect(table.getByText(t.activity.actions.authSession.loginFailed)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/activity?page=1&pageSize=25');
  });

  it('sends sort and filters to the API and sorts by header click', async () => {
    const onSearch = renderPage([row({})], { page: 1, sort: { sort: 'status', dir: 'desc' }, filters: { result: 'error' } });
    await screen.findByText(t.activity.actions.students.update);
    expect(apiFetch).toHaveBeenCalledWith('/activity?page=1&pageSize=25&sort=status&dir=desc&result=error');
    fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: t.activity.at }));
    expect(onSearch).toHaveBeenCalledWith({ page: 1, sort: { sort: 'at', dir: 'asc' }, filters: { result: 'error' } });
  });

  it('shows the Arabic empty state when nothing is logged', async () => {
    renderPage([]);
    expect(await screen.findByRole('heading', { name: t.activity.empty })).toBeTruthy();
  });
});
