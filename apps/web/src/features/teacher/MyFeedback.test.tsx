import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROW_DONE } from '@/features/feedback/feedback-fixture';
import { t } from '@/lib/i18n';
import { openFilters } from '@/test/open-filters';
import type { ServerListSearch } from '@/lib/server-list-search';
import { MyFeedback } from './MyFeedback';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

function open(data: unknown, search: ServerListSearch = {}) {
  apiFetch.mockResolvedValue(data);
  const onSearch = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MyFeedback search={search} onSearch={onSearch} />
    </QueryClientProvider>,
  );
  return onSearch;
}

describe('MyFeedback (teacher)', () => {
  afterEach(() => apiFetch.mockReset());

  it('shows my own average and my students’ answers — no teacher column, no phone', async () => {
    open({ items: [ROW_DONE], total: 1, average: { avg_rating: 4.5, n: 2, recommend_yes_pct: 50 } });
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/feedback?page=1&pageSize=20');
    expect(screen.queryByRole('columnheader', { name: t.feedback.teacher })).toBeNull();
    expect(document.body.textContent).not.toContain('+201001234567');
  });

  it('says there is nothing yet', async () => {
    open({ items: [], total: 0, average: null });
    expect(await screen.findByText(t.feedback.empty)).toBeTruthy();
  });

  it('sorts and filters on the server: no teacher filter, the URL state in the request (R-NFR-08)', async () => {
    const onSearch = open({ items: [ROW_DONE], total: 1, average: null }, { sort: 'note', f_recommend: 'yes', f_teacher: 'x' });
    await screen.findByText('سهيلة');
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/feedback?page=1&pageSize=20&sort=note&recommend=yes');
    openFilters();
    expect(screen.queryByLabelText(t.table.filterBy.replace('{col}', t.feedback.teacher))).toBeNull();
    fireEvent.change(screen.getByLabelText(t.table.filterBy.replace('{col}', t.feedback.kind)), { target: { value: 'trial' } });
    expect(onSearch).toHaveBeenLastCalledWith({ f_kind: 'trial', page: undefined });
  });
});
