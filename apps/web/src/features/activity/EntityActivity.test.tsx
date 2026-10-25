import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { EntityActivity } from './EntityActivity';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', () => ({ apiFetch, apiSend: vi.fn() }));

const ROW = {
  id: 'r1', at: '2026-10-05T09:00:00Z', actor_id: 'u1', actor_name: 'أحمد', actor_role: 'admin',
  action: 'teachers.update', method: 'PATCH', route: '/teachers/:id', entity: 'teachers', entity_id: 't1',
  status: 200, duration_ms: 5, meta: {},
};

function renderIt(items: unknown[], hideEmpty = false) {
  apiFetch.mockResolvedValue({ items, total: items.length, page: 1, pageSize: 25 });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EntityActivity entity="teachers" entityId="t1" hideEmpty={hideEmpty} />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('EntityActivity («النشاط» on a profile)', () => {
  it('reads the same endpoint scoped to the entity and lists its rows', async () => {
    renderIt([ROW]);
    expect(await screen.findByText(t.activity.actions.teachers.update)).toBeTruthy();
    expect(screen.getByRole('heading', { name: t.activity.profileTitle })).toBeTruthy();
    expect(screen.getByText('أحمد')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/activity?page=1&pageSize=25&entity=teachers&entity_id=t1');
  });

  it('says so when empty, or renders nothing with hideEmpty', async () => {
    renderIt([]);
    expect(await screen.findByText(t.activity.profileEmpty)).toBeTruthy();
    apiFetch.mockReset();
    const { container } = renderIt([], true);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(container.querySelector('section')).toBeNull();
  });
});
