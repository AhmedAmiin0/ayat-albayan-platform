import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { pageView } from '@ab/web-kit/report/page.fixture';
import { portalApi } from '@ab/web-kit/portal/portal.api-fixture';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { FamilyReportView } from './FamilyReportView';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const P = t.familyLook.pages.report;
const onBack = vi.fn();
const show = (recordingId: string | null = null) =>
  renderPortal(
    <FamilyReportView studentId="s1" report={{ reportId: 'r1', recordingId }} onBack={onBack} />,
  );
const stubTab = () => {
  const tab = { location: { href: '' }, close: vi.fn(), opener: null };
  vi.stubGlobal('open', vi.fn(() => tab));
  return tab;
};

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  onBack.mockReset();
  vi.unstubAllGlobals();
});

describe('FamilyReportView «تقرير الحلقة» in the family look', () => {
  it('the band, the cards, the PDF and the recording by a fresh signed link', async () => {
    const tab = stubTab();
    apiFetch.mockImplementation(portalApi({ reportPage: pageView() }));
    apiSend.mockResolvedValue({ url: 'https://files.example.org/rec', expires_at: 'x' });
    show('rec1');
    expect(await screen.findByText('أداء ممتاز')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: t.portal.reportTitle })).toBeTruthy();
    expect(screen.getByText(t.reportPage.teacher.replace('{name}', 'أبرار'))).toBeTruthy();
    expect(screen.getByText(t.enums.grade.excellent)).toBeTruthy();
    for (const name of [P.content, P.todo, P.notes, P.files]) {
      expect(screen.getByRole('region', { name })).toBeTruthy();
    }
    expect(screen.getByRole('link', { name: t.reportPage.downloadPdf })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/report-pages/by-report/r1');
    fireEvent.click(screen.getByRole('button', { name: t.portal.openRecording }));
    await vi.waitFor(() => expect(tab.location.href).toBe('https://files.example.org/rec'));
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/recordings/rec1/url');
    fireEvent.click(screen.getByRole('button', { name: t.portal.backToLessons }));
    expect(onBack).toHaveBeenCalled();
  });

  it('no recording, no PDF yet, edited: no recording button, the wait and the edited note', async () => {
    const view = pageView({ pdf: null });
    view.report.edited_at = '2026-10-05T10:00:00Z';
    apiFetch.mockImplementation(portalApi({ reportPage: view }));
    show();
    expect(await screen.findByText(t.reportPage.pdfPending)).toBeTruthy();
    expect(screen.getByText(t.reportPage.edited)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.portal.openRecording })).toBeNull();
  });

  it('the page cannot be read: the PDF still opens by the portal link; a failure says so', async () => {
    const tab = stubTab();
    apiFetch.mockImplementation(portalApi());
    apiSend.mockRejectedValue(new Error('gone'));
    show();
    fireEvent.click(await screen.findByRole('button', { name: t.portal.openPdf }));
    expect(await screen.findByText(t.portal.fileFailed)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/reports/r1/url');
    expect(tab.close).toHaveBeenCalled();
  });
});
