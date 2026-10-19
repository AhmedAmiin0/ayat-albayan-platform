import type { MessageView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { message } from './inbox-fixture';
import { MessageMedia } from './MessageMedia';
import { renderWithClient } from './test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const SIGNED = 'https://storage.test/wa-media/m-1.png?token=x';
const FILE_PATH = '/threads/%2B966501234567/messages/m-1/file';
const row = (patch: Partial<MessageView>) => message({ id: 'm-1', body: 'صورة الاستمارة', ...patch });
const view = (kind: string) => screen.getByRole('button', { name: t.inbox.viewMedia.replace('{kind}', kind) });

describe('MessageMedia: a family image or PDF opens in the chat (W6)', () => {
  afterEach(() => apiFetch.mockReset());

  it('an image row makes no request on render; a click fetches the file and shows the thumbnail', async () => {
    apiFetch.mockResolvedValue({ url: SIGNED, expires_at: '2026-10-19T12:00:00Z', mime: 'image/png' });
    renderWithClient(<MessageMedia message={row({ media_mime: 'image/png' })} />);
    expect(apiFetch).not.toHaveBeenCalled();
    fireEvent.click(view(t.inbox.media.image));
    const img = await screen.findByRole('img', { name: t.inbox.openMedia.replace('{kind}', t.inbox.media.image) });
    expect(apiFetch).toHaveBeenCalledWith(FILE_PATH);
    expect(img.getAttribute('src')).toBe(SIGNED);
    const link = img.closest('a');
    expect(link?.getAttribute('href')).toBe(SIGNED);
    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('a PDF becomes a named link, not an image', async () => {
    apiFetch.mockResolvedValue({ url: SIGNED, expires_at: '2026-10-19T12:00:00Z', mime: 'application/pdf' });
    renderWithClient(<MessageMedia message={row({ media_mime: 'application/pdf' })} />);
    fireEvent.click(view(t.inbox.media.document));
    const link = await screen.findByRole('link', { name: t.inbox.openMedia.replace('{kind}', t.inbox.media.document) });
    expect(link.getAttribute('href')).toBe(SIGNED);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('HEIC (no browser draws it) is a link too', async () => {
    apiFetch.mockResolvedValue({ url: SIGNED, expires_at: '2026-10-19T12:00:00Z', mime: 'image/heic' });
    renderWithClient(<MessageMedia message={row({ media_mime: 'image/heic' })} />);
    fireEvent.click(view(t.inbox.media.image));
    expect(await screen.findByRole('link', { name: t.inbox.openMedia.replace('{kind}', t.inbox.media.image) })).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('a 410 says «انتهت صلاحية الملف»; another failure the generic error', async () => {
    apiFetch.mockRejectedValue(new ApiError(410, { code: 'media_expired' }));
    renderWithClient(<MessageMedia message={row({ media_mime: 'image/jpeg' })} />);
    fireEvent.click(view(t.inbox.media.image));
    expect((await screen.findByRole('status')).textContent).toBe(t.inbox.mediaExpired);
    document.body.innerHTML = '';
    apiFetch.mockRejectedValue(new ApiError(502, { code: 'meta_error' }));
    renderWithClient(<MessageMedia message={row({ media_mime: 'image/jpeg' })} />);
    fireEvent.click(view(t.inbox.media.image));
    expect((await screen.findByRole('status')).textContent).toBe(t.common.error);
  });

  it('an audio/ogg row shows the label only and never fetches', () => {
    renderWithClient(<MessageMedia message={row({ media_mime: 'audio/ogg; codecs=opus' })} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(t.inbox.media.audio, { exact: false })).toBeTruthy();
    expect(screen.getByText(`· ${t.inbox.mediaNotDownloaded}`)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('an outbound image keeps the label (only what families send is fetched)', () => {
    renderWithClient(<MessageMedia message={row({ direction: 'outbound', media_mime: 'image/png' })} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
