import { counted } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { ServerListSearch } from '@/lib/server-list-search';
import { ROW_DONE, ROW_PENDING, SUMMARY } from './feedback-fixture';
import { FeedbackPage } from './FeedbackPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

function routes(path: string): unknown {
  if (path.startsWith('/feedback/summary')) return SUMMARY;
  if (path.startsWith('/feedback?')) return { items: [ROW_DONE, ROW_PENDING], total: 2, page: 1, pageSize: 20 };
  if (path === '/students/teacher-options') return [{ id: 't-abrar', display_name_ar: 'أبرار', meeting_link: null }];
  return [];
}

function open(search: ServerListSearch = {}) {
  apiFetch.mockImplementation(async (path: string) => routes(path));
  const onSearch = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FeedbackPage search={search} onSearch={onSearch} />
    </QueryClientProvider>,
  );
  return onSearch;
}

const filterBy = (col: string) => t.table.filterBy.replace('{col}', col);

describe('FeedbackPage (admin)', () => {
  afterEach(() => apiFetch.mockReset());

  it('shows each teacher’s average, the count and «نسبة الترشيح» above the answers', async () => {
    open();
    const averages = await screen.findByRole('region', { name: t.feedback.averages });
    expect(within(averages).getByText('4.5')).toBeTruthy();
    expect(within(averages).getByText(new RegExp(counted(t.feedback.total, 2)))).toBeTruthy();
    expect(within(averages).getByText(/50%/)).toBeTruthy();
  });

  it('lists the answers with kind, rating and recommendation; a pending request says it has not answered', async () => {
    open();
    const rows = await screen.findAllByRole('row');
    const done = rows.find((r) => r.textContent?.includes('سهيلة'));
    expect(done?.textContent).toContain(t.enums.feedbackKind.trial);
    expect(done?.textContent).toContain('+201001234567');
    expect(done?.textContent).toContain(t.feedback.outOf.replace('{n}', '5'));
    expect(done?.textContent).toContain(t.enums.feedbackRecommend.yes);
    expect(rows.find((r) => r.textContent?.includes('جود'))?.textContent).toContain(t.feedback.pending);
  });

  it('folds the family’s number under the name, spells the date with its whole year, and gives a waiting row a hollow chip', async () => {
    open();
    const rows = await screen.findAllByRole('row');
    const done = rows.find((r) => r.textContent?.includes('سهيلة'));
    const wait = rows.find((r) => r.textContent?.includes('جود'));
    expect(done?.textContent).toContain('2026');
    expect(screen.queryByRole('columnheader', { name: t.feedback.contact })).toBeNull();
    expect(screen.getByRole('columnheader', { name: t.feedback.recommendShort })).toBeTruthy();
    expect(within(wait as HTMLElement).getByText(t.feedback.pending).closest('[data-tone]')?.querySelector('[data-glyph="hollow"]')).toBeTruthy();
    expect(done?.querySelector('[data-glyph="fill"]')).toBeTruthy();
  });

  it('the rating filter lists each score after «الكل»', async () => {
    open();
    await screen.findAllByRole('row');
    const select = screen.getByLabelText(filterBy(t.feedback.rating));
    expect(within(select).getByRole('option', { name: t.table.all })).toBeTruthy();
    expect(within(select).getByRole('option', { name: t.feedback.outOf.replace('{n}', '5') })).toBeTruthy();
  });

  it('column filters and header sorts go to the URL, back on page 1', async () => {
    const onSearch = open({ page: 3 });
    await screen.findAllByRole('row');
    fireEvent.change(screen.getByLabelText(filterBy(t.feedback.kind)), { target: { value: 'trial' } });
    expect(onSearch).toHaveBeenLastCalledWith({ f_kind: 'trial', page: undefined });
    fireEvent.click(screen.getByRole('button', { name: t.feedback.teacher }));
    expect(onSearch).toHaveBeenLastCalledWith({ sort: 'teacher', dir: undefined, page: undefined });
  });

  it('the URL state goes to the API under its plain keys', async () => {
    open({ page: 2, sort: 'rating', dir: 'desc', f_kind: 'trial', f_rating: '5', f_teacher: 't-abrar' });
    await screen.findAllByRole('row');
    const calls = apiFetch.mock.calls.map(([p]) => String(p));
    expect(calls).toContain('/feedback?page=2&pageSize=20&sort=rating&dir=desc&teacher=t-abrar&kind=trial&rating=5');
    expect(screen.getByRole('columnheader', { name: new RegExp(t.feedback.rating) }).getAttribute('aria-sort')).toBe('descending');
  });

  it('a filter that matches nothing keeps the table, so it can be cleared', async () => {
    apiFetch.mockImplementation(async (path: string) => (path.startsWith('/feedback?') ? { items: [], total: 0, page: 1, pageSize: 20 } : routes(path)));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <FeedbackPage search={{ f_kind: 'trial' }} onSearch={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(t.feedback.empty)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.table.clearFilters })).toBeTruthy();
  });
});
