import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ReportView } from './ReportView';
import { pageView } from '@ab/web-kit/report/page.fixture';
import { portalApi } from '@ab/web-kit/portal/portal.api-fixture';
import { renderPortal } from '@ab/web-kit/portal/portal.render';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const onBack = vi.fn();
const show = (recordingId: string | null = null) =>
  renderPortal(<ReportView studentId="s1" report={{ reportId: 'r1', recordingId }} onBack={onBack} />);
const stubTab = () => {
  const tab = { location: { href: '' }, close: vi.fn(), opener: null };
  vi.stubGlobal('open', vi.fn(() => tab));
  return tab;
};

describe('ReportView «تقرير الحلقة»', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    onBack.mockReset();
    vi.unstubAllGlobals();
  });

  it('the report page’s content with its header and PDF; the recording by a fresh signed link', async () => {
    const tab = stubTab();
    apiFetch.mockImplementation(portalApi({ reportPage: pageView() }));
    apiSend.mockResolvedValue({ url: 'https://files.example.org/rec', expires_at: 'x' });
    show('rec1');
    expect(await screen.findByText('أداء ممتاز')).toBeTruthy();
    expect(screen.getByText(t.reportPage.teacher.replace('{name}', 'أبرار'))).toBeTruthy();
    expect(screen.getByRole('link', { name: t.reportPage.downloadPdf })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/report-pages/by-report/r1');
    fireEvent.click(screen.getByRole('button', { name: t.portal.openRecording }));
    await vi.waitFor(() => expect(tab.location.href).toBe('https://files.example.org/rec'));
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/recordings/rec1/url');
    fireEvent.click(screen.getByRole('button', { name: t.portal.backToLessons }));
    expect(onBack).toHaveBeenCalled();
  });

  it('no recording: no recording button', async () => {
    apiFetch.mockImplementation(portalApi({ reportPage: pageView() }));
    show();
    expect(await screen.findByText('أداء ممتاز')).toBeTruthy();
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

  it('a page that goes back in history names the button «رجوع»', async () => {
    apiFetch.mockImplementation(portalApi({ reportPage: pageView() }));
    renderPortal(<ReportView studentId="s1" report={{ reportId: 'r1', recordingId: null }} onBack={onBack} backLabel={t.common.back} />);
    fireEvent.click(await screen.findByRole('button', { name: t.common.back }));
    expect(onBack).toHaveBeenCalled();
  });
});
