import { pdfMetaLine, type MessageView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { MessageMedia } from '../components/MessageMedia';
import { message } from '../../testing/inbox-fixture';
import { renderWithClient } from '../../testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// A chat PDF like WhatsApp's on the web (owner 2026-10-29): after «عرض ملف», page 1 as a card.
const PDF_URL = 'https://storage.test/wa-media/m-1.pdf?token=x';
const THUMB = 'https://storage.test/wa-media/pdf/m-1/1.jpg?token=x';
const PAGE = { url: THUMB, expires_at: '2026-10-29T12:00:00Z', page: 1, pages: 12, bytes: 1.2 * 1024 * 1024 };
const row = (patch: Partial<MessageView> = {}) =>
  message({ id: 'm-1', body: null, media_mime: 'application/pdf', media_name: 'خطة الحفظ.pdf', ...patch });
const serve = (page: () => Promise<unknown>) =>
  apiFetch.mockImplementation(async (path: string) =>
    path.endsWith('/pdf/1') ? page() : { url: PDF_URL, expires_at: '2026-10-29T12:00:00Z', mime: 'application/pdf' },
  );
const open = () => fireEvent.click(screen.getByRole('button', { name: t.inbox.viewMedia.replace('{kind}', t.inbox.media.document) }));

describe('PdfCard', () => {
  afterEach(() => apiFetch.mockReset());

  it('asks nothing before «عرض ملف»; then the thumb, name and meta line, in a link to the PDF in a new tab', async () => {
    serve(async () => PAGE);
    renderWithClient(<MessageMedia message={row()} />);
    expect(apiFetch).not.toHaveBeenCalled();
    open();
    const meta = pdfMetaLine(PAGE, t.inbox.pdf);
    const card = await screen.findByRole('link', { name: `${t.inbox.pdf.open.replace('{name}', 'خطة الحفظ.pdf')} · ${meta}` });
    expect(card.getAttribute('href')).toBe(PDF_URL);
    expect(card.getAttribute('target')).toBe('_blank');
    expect(card.getAttribute('rel')).toContain('noopener');
    expect(card.querySelector('img')?.getAttribute('src')).toBe(THUMB);
    expect(card.textContent).toContain('خطة الحفظ.pdf');
    expect(card.textContent).toContain(meta);
    expect(apiFetch).toHaveBeenCalledWith('/threads/%2B966501234567/messages/m-1/pdf/1');
  });

  it('«تنزيل» stays under the card', async () => {
    serve(async () => PAGE);
    renderWithClient(<MessageMedia message={row()} />);
    open();
    await screen.findByRole('link', { name: new RegExp(t.inbox.pdf.type) });
    expect(screen.getByRole('button', { name: t.inbox.download.label.replace('{name}', 'خطة الحفظ.pdf') })).toBeTruthy();
  });

  it('no preview (422) or another failure: today’s named link, no image', async () => {
    serve(async () => {
      throw new ApiError(422, { code: 'pdf_no_preview' });
    });
    renderWithClient(<MessageMedia message={row()} />);
    open();
    const link = await screen.findByRole('link', { name: 'خطة الحفظ.pdf' });
    expect(link.getAttribute('href')).toBe(PDF_URL);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/threads/%2B966501234567/messages/m-1/pdf/1'));
    expect(document.querySelector('img')).toBeNull();
  });
});
