import { pdfMetaLine, type MessageView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { MessageMedia } from '@/features/messaging/inbox/messages/components/MessageMedia';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// A chat PDF like WhatsApp's on the web (owner 2026-10-29, 2026-11-01): page 1 as a card, no click
// first.
const PDF_URL = 'https://storage.test/wa-media/m-1.pdf?token=x';
const THUMB = 'https://storage.test/wa-media/pdf/m-1/1.jpg?token=x';
const PAGE = { url: THUMB, expires_at: '2026-10-29T12:00:00Z', page: 1, pages: 12, bytes: 1.2 * 1024 * 1024 };
const row = (patch: Partial<MessageView> = {}) =>
  message({ id: 'm-1', body: null, media_mime: 'application/pdf', media_name: 'خطة الحفظ.pdf', ...patch });
const serve = (page: () => Promise<unknown>) =>
  apiFetch.mockImplementation(async (path: string) =>
    path.endsWith('/pdf/1') ? page() : { url: PDF_URL, expires_at: '2026-10-29T12:00:00Z', mime: 'application/pdf' },
  );
const PAGE_1 = '/threads/%2B966501234567/messages/m-1/pdf/1';
const pageCalls = () => apiFetch.mock.calls.filter(([p]) => p === PAGE_1).length;
const label = (name: string, meta: string) => `${t.inbox.pdf.open.replace('{name}', name)} · ${meta}`;

describe('PdfCard', () => {
  afterEach(() => apiFetch.mockReset());

  it('a family’s PDF shows the thumb, name and meta line with no click, in a link to the PDF in a new tab', async () => {
    serve(async () => PAGE);
    renderWithClient(<MessageMedia message={row({ direction: 'inbound' })} />);
    const meta = pdfMetaLine(PAGE, t.inbox.pdf);
    const card = await screen.findByRole('link', { name: label('خطة الحفظ.pdf', meta) });
    expect(card.getAttribute('href')).toBe(PDF_URL);
    expect(card.getAttribute('target')).toBe('_blank');
    expect(card.getAttribute('rel')).toContain('noopener');
    expect(card.querySelector('img')?.getAttribute('src')).toBe(THUMB);
    expect(card.textContent).toContain(meta);
    expect(screen.queryByRole('button', { name: t.inbox.viewMedia.replace('{kind}', t.inbox.media.document) })).toBeNull();
    expect(pageCalls()).toBe(1);
  });

  it('while page 1 is asked: the card at once (aria-busy, an empty strip, «PDF» as its meta line)', async () => {
    let answer: (page: unknown) => void = () => undefined;
    serve(() => new Promise((r) => (answer = r)));
    const { container } = { container: document.body };
    renderWithClient(<MessageMedia message={row()} />);
    const card = await waitFor(() => {
      const a = container.querySelector('a[aria-busy="true"]');
      if (!a) throw new Error('no card yet');
      return a;
    });
    expect(card.getAttribute('aria-label')).toBe(label('خطة الحفظ.pdf', t.inbox.pdf.type));
    expect(card.querySelector('img')).toBeNull();
    answer(PAGE);
    await waitFor(() => expect(card.querySelector('img')?.getAttribute('src')).toBe(THUMB));
    await waitFor(() => expect(card.getAttribute('aria-busy')).toBe('false'));
  });

  it.each([
    ['no file name: the caption’s first line that reads as one', { media_name: null, body: 'plan.pdf' }, 'plan.pdf'],
    ['no file name, no such caption: «ملف PDF», never «ملف / ملف»', { media_name: null, body: 'hi' }, t.inbox.pdf.untitled],
  ])('the name: %s', async (_, patch, name) => {
    serve(async () => PAGE);
    renderWithClient(<MessageMedia message={row(patch)} />);
    expect(await screen.findByRole('link', { name: label(name, pdfMetaLine(PAGE, t.inbox.pdf)) })).toBeTruthy();
  });

  it('a thumb that fails to load (its URL expired in a tab left open) is asked again, once', async () => {
    serve(async () => PAGE);
    renderWithClient(<MessageMedia message={row()} />);
    const card = await screen.findByRole('link', { name: new RegExp(t.inbox.pdf.type) });
    const img = () => card.querySelector('img') ?? card;
    fireEvent.error(img());
    await waitFor(() => expect(pageCalls()).toBe(2));
    fireEvent.error(img());
    await new Promise((r) => setTimeout(r, 20));
    expect(pageCalls()).toBe(2);
  });

  it('«تنزيل» stays under the card', async () => {
    serve(async () => PAGE);
    renderWithClient(<MessageMedia message={row()} />);
    await screen.findByRole('link', { name: new RegExp(t.inbox.pdf.type) });
    expect(screen.getByRole('button', { name: t.inbox.download.label.replace('{name}', 'خطة الحفظ.pdf') })).toBeTruthy();
  });

  it('no preview (422): today’s «عرض ملف», which opens the named link, no image', async () => {
    serve(async () => {
      throw new ApiError(422, { code: 'pdf_no_preview' });
    });
    renderWithClient(<MessageMedia message={row()} />);
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.viewMedia.replace('{kind}', t.inbox.media.document) }));
    const link = await screen.findByRole('link', { name: 'خطة الحفظ.pdf' });
    expect(link.getAttribute('href')).toBe(PDF_URL);
    expect(pageCalls()).toBe(1);
    expect(document.querySelector('img')).toBeNull();
  });
});
