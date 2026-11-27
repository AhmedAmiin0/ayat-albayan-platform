import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { FileButtons } from './FileButtons';
import { renderPortal } from '@ab/web-kit/portal/portal.render';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const stubTab = () => {
  const tab = { location: { href: '' }, close: vi.fn(), opener: null };
  vi.stubGlobal(
    'open',
    vi.fn(() => tab),
  );
  return tab;
};
const report = { kind: 'reports', id: 'r1' } as const;
const recording = { kind: 'recordings', id: 'rec1' } as const;

describe('FileButtons', () => {
  afterEach(() => {
    apiSend.mockReset();
    vi.unstubAllGlobals();
  });

  it('no files: renders nothing', () => {
    const { container } = renderPortal(<FileButtons studentId="s1" files={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('one button per file, each with its own label', () => {
    renderPortal(<FileButtons studentId="s1" files={[report, recording]} />);
    expect(screen.getByRole('button', { name: t.portal.openPdf })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.portal.openRecording })).toBeTruthy();
  });

  it('a tap mints a signed link for that file and points the new tab at it', async () => {
    const tab = stubTab();
    apiSend.mockResolvedValue({ url: 'https://files.example.org/r1', expires_at: 'x' });
    renderPortal(<FileButtons studentId="s1" files={[report]} icons />);
    fireEvent.click(screen.getByRole('button', { name: t.portal.openPdf }));
    await vi.waitFor(() => expect(tab.location.href).toBe('https://files.example.org/r1'));
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/reports/r1/url');
  });

  it('a failed link closes the tab and says so', async () => {
    const tab = stubTab();
    apiSend.mockRejectedValue(new Error('down'));
    renderPortal(<FileButtons studentId="s1" files={[recording]} />);
    fireEvent.click(screen.getByRole('button', { name: t.portal.openRecording }));
    expect(await screen.findByText(t.portal.fileFailed)).toBeTruthy();
    expect(tab.close).toHaveBeenCalled();
  });
});
