import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { kid, portalApi } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { StudentReportsPage } from './StudentReportsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const R = t.portal.app.reports;
const report = (id: string, startsAt: string) => ({
  id,
  lesson_id: `l-${id}`,
  lesson_starts_at: startsAt,
  sent_at: startsAt,
  teacher: null,
  recording_id: null,
});

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(portalApi());
});

describe('StudentReportsPage', () => {
  it('a guardian sees the tab title; no reports yet: the empty state', async () => {
    renderAt(<StudentReportsPage student={kid()} kind="guardian" />);
    const title = { level: 1, name: t.portal.app.tabs.reports };
    expect(await screen.findByRole('heading', title)).toBeTruthy();
    expect(await screen.findByText(R.empty)).toBeTruthy();
  });

  it('a student reading their own reports sees their own title', async () => {
    renderAt(<StudentReportsPage student={kid()} kind="student" />);
    expect(await screen.findByRole('heading', { level: 1, name: R.title })).toBeTruthy();
  });

  it('reports are grouped by month, newest first, one row each', async () => {
    const reports = [
      report('r3', '2026-10-20T16:00:00.000Z'),
      report('r2', '2026-10-06T16:00:00.000Z'),
      report('r1', '2026-09-15T16:00:00.000Z'),
    ];
    apiFetch.mockImplementation(portalApi({ reports: { reports } }));
    renderAt(<StudentReportsPage student={kid()} kind="guardian" />);
    await screen.findAllByRole('listitem');
    const months = screen.getAllByRole('region').filter((r) => r.hasAttribute('aria-label'));
    expect(months).toHaveLength(2);
    const [october, september] = months;
    expect(within(october as HTMLElement).getAllByRole('listitem')).toHaveLength(2);
    expect(within(september as HTMLElement).getAllByRole('listitem')).toHaveLength(1);
    expect(october?.getAttribute('aria-label')).toContain('2026');
  });
});
