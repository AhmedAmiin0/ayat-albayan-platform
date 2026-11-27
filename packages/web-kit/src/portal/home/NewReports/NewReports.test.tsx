import { counted } from '@ab/core';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { NewReports } from './NewReports';
import { portalApi } from '@ab/web-kit/portal/portal.api-fixture';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { markReportSeen, reloadSeenReports } from '@ab/web-kit/portal/use-seen-reports';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const sent = (id: string) => ({
  id,
  lesson_id: `l-${id}`,
  lesson_starts_at: null,
  sent_at: '2026-10-20T17:00:00.000Z',
  teacher: null,
  recording_id: null,
});

describe('NewReports', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadSeenReports();
  });
  afterEach(() => apiFetch.mockReset());

  it('counts the sent reports not opened in this browser', async () => {
    markReportSeen('r1');
    const reports = [sent('r1'), sent('r2'), sent('r3')];
    apiFetch.mockImplementation(portalApi({ reports: { reports } }));
    renderPortal(<NewReports studentId="s1" />);
    expect(await screen.findByText(counted(t.portal.newReports, 2))).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/reports');
  });

  it('every report opened: renders nothing', async () => {
    markReportSeen('r1');
    apiFetch.mockImplementation(portalApi({ reports: { reports: [sent('r1')] } }));
    const { container } = renderPortal(<NewReports studentId="s1" />);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
  });
});
