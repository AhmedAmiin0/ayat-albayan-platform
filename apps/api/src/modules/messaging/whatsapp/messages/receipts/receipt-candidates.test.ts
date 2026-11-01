import { describe, expect, it } from 'vitest';
import type { MediaMessage } from '@/modules/messaging/whatsapp/messages/inbound-media.repo';
import { RECEIPT_FILTERS, receiptMime, receiptName } from './receipt-candidates';

type Row = Pick<MediaMessage, 'media_mime' | 'media_name' | 'interactive_payload'>;
const row = (mime: string | null, payload: unknown = null, name: string | null = null): Row => ({
  media_mime: mime,
  media_name: name,
  interactive_payload: payload,
});
const doc = (filename: string) => ({ type: 'document', document: { filename } });
const offered: [string, Row, string][] = [
  ['a photo', row('image/jpeg', { type: 'image' }), 'image/jpeg'],
  ['a photo with parameters', row('image/jpeg; q=1', { type: 'image' }), 'image/jpeg'],
  ['an imported photo (no payload)', row('image/jpeg'), 'image/jpeg'],
  ['a png sent as a file', row('image/png', doc('x.png')), 'image/png'],
  ['a heic', row('image/heic', { type: 'image' }), 'image/heic'],
  ['a PDF', row('application/pdf', doc('فاتورة.pdf')), 'application/pdf'],
  ['an octet-stream «x.PDF» (Meta’s name)', row('application/octet-stream', doc('إيصال.PDF')), 'application/pdf'],
  ['a mime-less «x.pdf» (our name)', row(null, null, 'invoice.pdf'), 'application/pdf'],
  ['a webp photo', row('image/webp', { type: 'image' }), 'image/webp'],
];
const refused: [string, Row][] = [
  ['a sticker', row('image/webp', { type: 'sticker', sticker: { animated: false } })],
  ['an imported webp (no type: a sticker)', row('image/webp')],
  ['a sticker whatever its mime', row('image/jpeg', { type: 'sticker' })],
  ['a voice note', row('audio/ogg; codecs=opus', { type: 'audio' })],
  ['a video', row('video/mp4', { type: 'video' })],
  ['an octet-stream that is not a PDF', row('application/octet-stream', doc('notes.docx'))],
  ['a text', row(null)],
];

describe('receiptMime: the chat pickers offer photos and PDFs, never a sticker (owner 2026-10-31)', () => {
  it.each(offered)('%s → offered', (_name, r, want) => {
    expect(receiptMime(r)).toBe(want);
  });

  it.each(refused)('%s → not a candidate', (_name, r) => {
    expect(receiptMime(r)).toBeNull();
  });

  it('receiptName: ours first, else the name Meta sent with the document; blank is none', () => {
    expect(receiptName(row('application/pdf', doc('meta.pdf'), 'ours.pdf'))).toBe('ours.pdf');
    expect(receiptName(row('application/pdf', doc('meta.pdf')))).toBe('meta.pdf');
    expect(receiptName(row('image/jpeg', { type: 'image' }, ' '))).toBeNull();
  });
});

describe('RECEIPT_FILTERS: the same rule in PostgREST, so the query filters before its limit', () => {
  const kind = RECEIPT_FILTERS.kind;

  it('photos and PDFs by exact base type (bare or with parameters), never audio or video', () => {
    for (const m of ['image/jpeg', 'image/png', 'image/heic', 'application/pdf']) {
      expect(kind).toContain(`media_mime.ilike.${m},media_mime.ilike.${m};*`);
    }
    expect(kind).not.toMatch(/audio|video/);
  });

  it('a webp only when Meta named it a photo or a file; a named PDF with no or an octet-stream mime', () => {
    expect(kind).toContain('and(or(media_mime.ilike.image/webp,media_mime.ilike.image/webp;*),interactive_payload->>type.in.(image,document))');
    expect(kind).toContain('and(or(media_mime.is.null,media_mime.ilike.application/octet-stream,');
    expect(kind).toContain('or(media_name.ilike.*.pdf,interactive_payload->document->>filename.ilike.*.pdf))');
    expect(kind.match(/image\/webp/g)).toHaveLength(2);
  });

  it('never a sticker, keeping the imported rows (no payload); a stored copy or a media id', () => {
    expect(RECEIPT_FILTERS.notSticker).toBe('interactive_payload->>type.is.null,interactive_payload->>type.neq.sticker');
    expect(RECEIPT_FILTERS.source).toBe('media_id.not.is.null,media_path.not.is.null');
  });
});
