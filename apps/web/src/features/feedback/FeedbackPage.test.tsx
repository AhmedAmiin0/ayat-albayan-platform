import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
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

function open() {
  apiFetch.mockImplementation(async (path: string) => routes(path));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FeedbackPage />
    </QueryClientProvider>,
  );
}

describe('FeedbackPage (admin)', () => {
  afterEach(() => apiFetch.mockReset());

  it('shows each teacher’s average, the count and «نسبة الترشيح» above the answers', async () => {
    open();
    const averages = await screen.findByRole('region', { name: t.feedback.averages });
    expect(within(averages).getByText('4.5')).toBeTruthy();
    expect(within(averages).getByText(/2 رأي/)).toBeTruthy();
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

  it('filters go to the API: teacher, kind and rating, back on page 1', async () => {
    open();
    await screen.findAllByRole('row');
    fireEvent.change(screen.getByLabelText(t.feedback.kind), { target: { value: 'trial' } });
    fireEvent.change(screen.getByLabelText(t.feedback.rating), { target: { value: '5' } });
    await screen.findAllByRole('row');
    const calls = apiFetch.mock.calls.map(([p]) => String(p));
    expect(calls.some((p) => p.includes('kind=trial') && p.includes('rating=5') && p.includes('page=1'))).toBe(true);
  });
});
