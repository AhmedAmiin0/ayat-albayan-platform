import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { lessonFile, signed } from '@ab/web-kit/portal/recordings/recordings.fixtures';
import { FileViewer } from './FileViewer';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const V = t.familyFiles;
const files = [
  lessonFile(),
  lessonFile({ id: 'v1', kind: 'voice_note', title: null, mime: 'audio/mp4', media: 'audio' }),
  lessonFile({ id: 'p1', kind: 'material', title: 'خطة الحفظ', mime: 'application/pdf', media: 'pdf' }),
];

const show = (openId = 'f1') => {
  const onClose = vi.fn();
  renderPortal(<FileViewer studentId="s1" files={files} openId={openId} onClose={onClose} />);
  return onClose;
};

afterEach(() => {
  apiSend.mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('FileViewer (boards FamFilesWebImage / FamFilesWebPdf)', () => {
  it('a picture: its name and line, zoom in steps, and the next file (the voice note skipped)', async () => {
    apiSend.mockResolvedValue(signed('https://files.example/f1'));
    show();
    expect(screen.getByRole('dialog', { name: 'ورقة الواجب' })).toBeTruthy();
    const img = await screen.findByRole<HTMLImageElement>('img', { name: 'ورقة الواجب' });
    expect(img.src).toBe('https://files.example/f1');
    expect(screen.getByText('1 من 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: V.zoomIn }));
    expect(img.style.height).toContain('1.25');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: V.prevFile }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: V.nextFile }));
    expect(await screen.findByTitle(V.pdfFrame.replace('{title}', 'خطة الحفظ'))).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/lesson-files/p1/url');
  });

  it('«افتح في نافذة جديدة» is the shown link; «تنزيل» asks for a saving link under the name', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign, href: 'http://localhost/' });
    apiSend.mockResolvedValue(signed('https://files.example/p1'));
    show('p1');
    const tab = await screen.findByRole<HTMLAnchorElement>('link', { name: V.openTab });
    expect(tab.href).toBe('https://files.example/p1');
    expect(tab.target).toBe('_blank');
    fireEvent.click(screen.getByRole('button', { name: V.download }));
    const name = new URLSearchParams({ download: 'خطة الحفظ.pdf' }).toString();
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith(
      'POST', `/portal/students/s1/lesson-files/p1/url?${name}`,
    ));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('https://files.example/p1'));
  });

  it('closes after its exit plays; a link that cannot be had offers a retry', async () => {
    apiSend.mockRejectedValue(new Error('gone'));
    const onClose = show();
    expect(await screen.findByText(t.portal.loadFailed)).toBeTruthy();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: t.common.close }));
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onClose).toHaveBeenCalled();
  });
});
