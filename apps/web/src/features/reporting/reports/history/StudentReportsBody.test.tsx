import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { StudentReportsBody } from './StudentReportsBody';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const NO_RETRY = { defaultOptions: { queries: { retry: false } } };

function renderBody() {
  render(
    <QueryClientProvider client={new QueryClient(NO_RETRY)}>
      <StudentReportsBody studentId="s-1" role="teacher" tz="Africa/Cairo" />
    </QueryClientProvider>,
  );
}

describe('StudentReportsBody (the board drawer «التقارير», docs/46 C1)', () => {
  afterEach(() => apiFetch.mockReset());

  it('no reports yet: the empty state, no page heading of its own', async () => {
    apiFetch.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, series: [] });
    renderBody();
    expect(await screen.findByText(t.reports.noReports)).toBeTruthy();
    expect(screen.queryByText(t.reports.history)).toBeNull();
  });

  it('403: not hers', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, { code: 'forbidden', message: 'forbidden' }));
    renderBody();
    expect(await screen.findByText(t.common.forbidden)).toBeTruthy();
  });
});
