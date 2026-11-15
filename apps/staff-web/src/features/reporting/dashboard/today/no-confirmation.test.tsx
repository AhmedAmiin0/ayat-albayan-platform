import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { configWrapper } from '@/lib/settings/confirmation-testing';
import { KpiStrip } from '@/features/reporting/dashboard/funnel/KpiStrip';
import { SUMMARY } from '@/features/reporting/dashboard/dashboard-fixture';
import { LessonsByStatus } from './LessonsByStatus';
import { lessonAt } from './today-fixture';
import { TodayKpis } from './TodayKpis';
import { TodayLessons } from './TodayLessons';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const NEEDS = t.enums.lessonStatus.scheduled;
const UPCOMING = t.lessons.noConfirm.scheduled;

describe('dashboard without a lesson confirmation (owner 2026-11-02, the default)', () => {
  it('TodayKpis: three tiles, no «يحتاج تأكيد» (not even a 0)', () => {
    render(<TodayKpis today={{ lessons: 5, live: 1 }} needsConfirmation={0} unpaid={2} />, {
      wrapper: configWrapper(),
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByText(NEEDS)).toBeNull();
  });

  it('TodayKpis with the confirmation on: the «يحتاج تأكيد» tile links to the schedule', () => {
    render(<TodayKpis today={{ lessons: 5, live: 1 }} needsConfirmation={2} unpaid={2} />, {
      wrapper: configWrapper(true),
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('link', { name: `${NEEDS} 2` }).getAttribute('href')).toContain('scheduled');
  });

  it('KpiStrip: no «يحتاج تأكيد» filter link while off, as before while on', () => {
    const { unmount } = render(<KpiStrip summary={SUMMARY} work="reports" />, { wrapper: configWrapper() });
    expect(screen.queryByText(NEEDS)).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    unmount();
    render(<KpiStrip summary={SUMMARY} work="reports" />, { wrapper: configWrapper(true) });
    expect(screen.getByText(NEEDS)).toBeTruthy();
  });

  it('lessons by status: the scheduled row reads «مجدولة»', () => {
    render(<LessonsByStatus counts={SUMMARY.lessons_by_status} />, { wrapper: configWrapper() });
    const table = screen.getByRole('table', { name: t.dashboard.lessonsByStatus });
    expect(within(table).getAllByRole('rowheader')[0]?.textContent).toBe(UPCOMING);
    expect(table.textContent).not.toContain(NEEDS);
  });

  it('today’s lessons: a scheduled lesson is «مجدولة», never «يحتاج تأكيد»', () => {
    const lesson = lessonAt({ id: 'a', startsAt: '2099-10-05T15:00:00.000Z', status: 'scheduled' });
    render(<TodayLessons lessons={[lesson]} />, { wrapper: configWrapper() });
    expect(screen.getByText(UPCOMING)).toBeTruthy();
    expect(screen.queryByText(NEEDS)).toBeNull();
  });
});
