import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { setTeacherPages } from '@/lib/settings/teacher-pages-testing';
import { TeacherPageGate } from './TeacherPageGate';

const apiFetch = vi.hoisted(() => vi.fn());
const navigateTo = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', () => ({
  Navigate: ({ to }: { to: string }) => {
    navigateTo(to);
    return null;
  },
}));

function renderGate(client: QueryClient) {
  render(
    <QueryClientProvider client={client}>
      <TeacherPageGate page="earnings">
        <p>the page</p>
      </TeacherPageGate>
    </QueryClientProvider>,
  );
}

const freshClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('TeacherPageGate (settings «صفحات المعلم»)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    navigateTo.mockReset();
  });

  it('waits for GET /settings/public: no page and no redirect while it loads', () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    renderGate(freshClient());
    expect(screen.queryByText('the page')).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('a fetched answer with the switch off goes back to /teacher', async () => {
    apiFetch.mockResolvedValue({ ...PUBLIC_SETTING_DEFAULTS, custom: {} });
    renderGate(freshClient());
    await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith('/teacher'));
    expect(screen.queryByText('the page')).toBeNull();
  });

  it('a fetched answer with the switch on (a hard refresh) shows the page', async () => {
    const on = { ...PUBLIC_SETTING_DEFAULTS, custom: {}, teacher_earnings_enabled: true };
    apiFetch.mockResolvedValue(on);
    renderGate(freshClient());
    expect(await screen.findByText('the page')).toBeTruthy();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('settings that cannot be read: an error, never a silent redirect', async () => {
    apiFetch.mockRejectedValue(new Error('offline'));
    renderGate(freshClient());
    expect(await screen.findByText(t.common.error)).toBeTruthy();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('another switch on does not open this page', () => {
    renderGate(setTeacherPages(freshClient(), false, { teacher_feedback_enabled: true }));
    expect(navigateTo).toHaveBeenCalledWith('/teacher');
  });
});
