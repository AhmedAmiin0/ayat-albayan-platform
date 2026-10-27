import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { kid, report } from './portal.fixtures';
import { renderPortal } from './portal.render';
import { ReportsPanel } from './ReportsPanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

describe('ReportsPanel «تقارير الحلقات»', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    vi.unstubAllGlobals();
  });

  it('opens the PDF by a link minted on the tap, into a tab opened inside the tap', async () => {
    const tab = { location: { href: '' }, close: vi.fn() };
    vi.stubGlobal('open', vi.fn(() => tab));
    apiFetch.mockResolvedValue({ reports: [report()] });
    apiSend.mockResolvedValue({ url: 'https://files.example.org/signed', expires_at: 'x' });
    renderPortal(<ReportsPanel student={kid()} />);
    fireEvent.click(await screen.findByRole('button', { name: t.portal.openReport }));
    await vi.waitFor(() => expect(tab.location.href).toBe('https://files.example.org/signed'));
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/reports/r1/url');
    expect(screen.queryByRole('button', { name: t.portal.openRecording })).toBeNull();
  });

  it('a recording the staff made visible has its own button; a failure closes the tab and says so', async () => {
    const tab = { location: { href: '' }, close: vi.fn() };
    vi.stubGlobal('open', vi.fn(() => tab));
    apiFetch.mockResolvedValue({ reports: [report({ recording_id: 'rec1' })] });
    apiSend.mockRejectedValue(new Error('gone'));
    renderPortal(<ReportsPanel student={kid()} />);
    fireEvent.click(await screen.findByRole('button', { name: t.portal.openRecording }));
    expect(await screen.findByText(t.portal.fileFailed)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/recordings/rec1/url');
    expect(tab.close).toHaveBeenCalled();
  });

  it('nothing sent yet: the empty state', async () => {
    apiFetch.mockResolvedValue({ reports: [] });
    renderPortal(<ReportsPanel student={kid()} />);
    expect(await screen.findByText(t.portal.reportsEmpty)).toBeTruthy();
  });
});
