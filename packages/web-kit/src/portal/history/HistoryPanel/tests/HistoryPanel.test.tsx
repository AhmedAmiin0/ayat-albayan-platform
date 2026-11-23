import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { HistoryPanel } from '#/portal/history/HistoryPanel/HistoryPanel.tsx';
import { historyRow, kid } from '#/portal/portal.fixtures.ts';
import { portalApi } from '#/portal/portal.api-fixture.ts';
import { renderPortal } from '#/portal/portal.render.tsx';
import { reloadSeenReports } from '#/portal/use-seen-reports.ts';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('#/lib/http/api/api.ts', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const onOpenReport = vi.fn();

describe('HistoryPanel «حضرها» / «غاب عنها»', () => {
  afterEach(() => {
    apiFetch.mockReset();
    onOpenReport.mockReset();
    localStorage.clear();
    reloadSeenReports();
  });

  it('attended: a report marked «جديد» opens and loses the mark; pages load on «عرض المزيد»', async () => {
    const older = historyRow({ lesson_id: 'h2', report_id: null, starts_at: '2026-09-02T16:00:00.000Z' });
    apiFetch.mockImplementation(
      portalApi({
        attended: (path: string) =>
          path.includes('cursor=')
            ? { rows: [older], next_cursor: null }
            : { rows: [historyRow({ recording_id: 'rec1' })], next_cursor: '2026-10-20T16:00:00.000Z' },
      }),
    );
    renderPortal(<HistoryPanel student={kid()} status="attended" onOpenReport={onOpenReport} />);
    expect(await screen.findByText(t.portal.newReport)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.portal.openReport }));
    expect(onOpenReport).toHaveBeenCalledWith({ reportId: 'r1', recordingId: 'rec1' });
    expect(screen.queryByText(t.portal.newReport)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.portal.more }));
    await vi.waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    expect(screen.getAllByRole('region')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: t.portal.more })).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/history?status=attended');
  });

  it('absent: the date, the teacher, «غياب بعذر» and the family’s reason', async () => {
    const rows = [
      historyRow({ lesson_id: 'a1', outcome: 'absent', report_id: null }),
      historyRow({ lesson_id: 'a2', outcome: 'excused', report_id: null, absence_reason: 'سفر' }),
    ];
    apiFetch.mockImplementation(portalApi({ absent: { rows, next_cursor: null } }));
    renderPortal(<HistoryPanel student={kid()} status="absent" onOpenReport={onOpenReport} />);
    expect(await screen.findByText(t.portal.absenceReason.replace('{reason}', 'سفر'))).toBeTruthy();
    expect(screen.getAllByText(t.portal.excused)).toHaveLength(1);
    expect(screen.getAllByText(t.portal.withTeacher.replace('{teacher}', 'أبرار'))).toHaveLength(2);
    expect(screen.queryByRole('button', { name: t.portal.openReport })).toBeNull();
  });

  it('nothing yet: the list’s own empty state', async () => {
    apiFetch.mockImplementation(portalApi());
    renderPortal(<HistoryPanel student={kid()} status="absent" onOpenReport={onOpenReport} />);
    expect(await screen.findByText(t.portal.absentEmpty)).toBeTruthy();
  });
});
