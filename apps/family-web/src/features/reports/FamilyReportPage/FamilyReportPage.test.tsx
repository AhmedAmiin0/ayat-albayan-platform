import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderAt } from '@/test/render-at';
import { FamilyReportPage } from './FamilyReportPage';

interface ViewProps {
  studentId: string;
  report: { reportId: string; recordingId: string | null };
  onBack: () => void;
  backLabel: string;
}

vi.mock('@ab/web-kit', async (orig) => ({
  ...(await orig<object>()),
  ReportView: ({ studentId, report, onBack, backLabel }: ViewProps) => (
    <section aria-label={`${studentId} ${report.reportId} ${String(report.recordingId)}`}>
      <button type="button" onClick={onBack}>
        {backLabel}
      </button>
    </section>
  ),
}));

const back = () => screen.findByRole('button', { name: t.common.back });

describe('FamilyReportPage', () => {
  it('shows the report of this child, with its recording', async () => {
    const search = { studentId: 's1', recording: 'rec1' };
    renderAt(<FamilyReportPage reportId="r1" search={search} />);
    expect(await screen.findByRole('region', { name: 's1 r1 rec1' })).toBeTruthy();
  });

  it('no recording in the link: none is asked for', async () => {
    renderAt(<FamilyReportPage reportId="r1" search={{ studentId: 's1' }} />);
    expect(await screen.findByRole('region', { name: 's1 r1 null' })).toBeTruthy();
  });

  it('opened first (a shared link): back goes home, never out of the app', async () => {
    const page = <FamilyReportPage reportId="r1" search={{ studentId: 's1' }} />;
    const { router } = renderAt(page, '/report/r1');
    fireEvent.click(await back());
    await waitFor(() => expect(router.state.location.pathname).toBe('/portal'));
  });

  it('opened from a list: back returns to it', async () => {
    const page = <FamilyReportPage reportId="r1" search={{ studentId: 's1' }} />;
    const { router } = renderAt(page, '/reports');
    act(() => router.history.push('/report/r1'));
    fireEvent.click(await back());
    await waitFor(() => expect(router.state.location.pathname).toBe('/reports'));
  });
});
