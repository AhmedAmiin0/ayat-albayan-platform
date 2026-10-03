import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROW_DONE } from '@/features/feedback/feedback-fixture';
import { t } from '@/lib/i18n';
import { MyFeedback } from './MyFeedback';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

function open(data: unknown) {
  apiFetch.mockResolvedValue(data);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MyFeedback />
    </QueryClientProvider>,
  );
}

describe('MyFeedback (teacher)', () => {
  afterEach(() => apiFetch.mockReset());

  it('shows my own average and my students’ answers — no teacher column, no phone', async () => {
    open({ items: [ROW_DONE], average: { avg_rating: 4.5, n: 2, recommend_yes_pct: 50 } });
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/feedback');
    expect(screen.queryByRole('columnheader', { name: t.feedback.teacher })).toBeNull();
    expect(document.body.textContent).not.toContain('+201001234567');
  });

  it('says there is nothing yet', async () => {
    open({ items: [], average: null });
    expect(await screen.findByText(t.feedback.empty)).toBeTruthy();
  });
});
