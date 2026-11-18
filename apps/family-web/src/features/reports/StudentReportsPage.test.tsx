import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { kid } from '@ab/web-kit/portal/portal.fixtures';
import { renderAt } from '@/test/render-at';
import { StudentReportsPage } from './StudentReportsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const P = t.familyLook.pages.reports;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const report = (id: string, recording: string | null = null) => ({
  id,
  lesson_id: `l-${id}`,
  lesson_starts_at: daysAgo(0),
  sent_at: daysAgo(0),
  teacher: { display_name_ar: 'أ. سلمى', display_name_en: 'Ms. Salma' },
  recording_id: recording,
});

beforeEach(() => {
  apiFetch.mockReset();
  localStorage.clear();
});

describe('«التقارير» in the family look', () => {
  it('a guardian: the hero, this month’s count, a month card and the rows', async () => {
    apiFetch.mockResolvedValue({ reports: [report('r1', 'rec1'), report('r2')] });
    renderAt(<StudentReportsPage student={kid()} kind="guardian" />);
    expect(await screen.findAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 1, name: t.portal.app.tabs.reports })).toBeTruthy();
    expect(screen.getByText(P.line.replace('{name}', kid().name))).toBeTruthy();
    expect(screen.getByText(t.portal.app.reports.thisMonth)).toBeTruthy();
    expect(screen.getAllByText(t.portal.newReport)).toHaveLength(2);
    expect(screen.getAllByText(P.recording)).toHaveLength(1);
  });

  it('opening a row marks it seen and goes to its report with the recording', async () => {
    apiFetch.mockResolvedValue({ reports: [report('r1', 'rec1')] });
    const { router } = renderAt(<StudentReportsPage student={kid()} kind="guardian" />);
    fireEvent.click(await screen.findByRole('button', { name: t.portal.openReport }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/report/r1'));
    expect(router.state.location.search).toMatchObject({ recording: 'rec1' });
    expect(screen.queryByText(t.portal.newReport)).toBeNull();
  });

  it('a student with none: «تقاريري» and the empty line', async () => {
    apiFetch.mockResolvedValue({ reports: [] });
    renderAt(<StudentReportsPage student={kid()} kind="student" />);
    expect(await screen.findByText(t.portal.app.reports.empty)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: t.portal.app.reports.title })).toBeTruthy();
    expect(screen.getByText(P.lineOwn)).toBeTruthy();
  });
});
