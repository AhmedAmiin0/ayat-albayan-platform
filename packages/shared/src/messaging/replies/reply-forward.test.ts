import { describe, expect, it } from 'vitest';
import { waSendKind } from '../chat/chat-files';
import {
  canForward,
  canReply,
  isUnavailableQuote,
  mediaKindOf,
  quoteIcon,
  quoteKindOf,
  quoteLine,
  quoteSnippet,
  UNAVAILABLE_QUOTE,
} from './reply-forward';
import { threadFileSendSchema, threadTextSchema } from '../schemas';

const ID = '00000000-0000-4000-8000-000000000001';
const REQ = '00000000-0000-4000-8000-000000000002';

describe('replyToMessageId on the send bodies', () => {
  it('is an optional uuid on a text and a file', () => {
    expect(threadTextSchema.parse({ text: 'نعم', replyToMessageId: ID }).replyToMessageId).toBe(ID);
    expect(threadTextSchema.safeParse({ text: 'نعم', replyToMessageId: 'wamid.x' }).success).toBe(false);
    const file = { clientRequestId: REQ, path: 'out/a/b/c.pdf', filename: 'a.pdf', replyToMessageId: ID };
    expect(threadFileSendSchema.parse(file).replyToMessageId).toBe(ID);
  });
});

describe('canReply / canForward', () => {
  const m = { template_key: null, body: 'السلام عليكم', media_mime: null, replyable: true, forwardable: true };

  it('reply needs a wamid (replyable), template or not', () => {
    expect(canReply(m)).toBe(true);
    expect(canReply({ replyable: false })).toBe(false);
    expect(canReply({})).toBe(false);
  });

  it('forward: a text or a file we hold, never a template or an empty row', () => {
    expect(canForward(m)).toBe(true);
    expect(canForward({ ...m, body: null, media_mime: 'audio/ogg' })).toBe(true);
    expect(canForward({ ...m, template_key: 'trial_reminder' })).toBe(false);
    expect(canForward({ ...m, body: '  ', media_mime: null })).toBe(false);
    expect(canForward({ ...m, forwardable: false })).toBe(false);
  });
});

describe('quoteLine / mediaKindOf / waSendKind', () => {
  it('shows the first line only', () => {
    expect(quoteLine('  أهلًا\nكيف الحال')).toBe('أهلًا');
    expect(quoteLine(null)).toBe('');
  });

  it('labels a quoted or forwarded file by its kind', () => {
    expect(mediaKindOf('image/webp')).toBe('image');
    expect(mediaKindOf('audio/ogg; codecs=opus')).toBe('audio');
    expect(mediaKindOf('video/mp4')).toBe('video');
    expect(mediaKindOf('application/pdf')).toBe('document');
    expect(mediaKindOf(null)).toBeNull();
  });

  it('sends JPEG/PNG as image, a WebP as a sticker, voice and video as themselves, else a document', () => {
    expect(waSendKind('image/png')).toBe('image');
    expect(waSendKind('image/webp')).toBe('sticker');
    expect(waSendKind('audio/ogg; codecs=opus')).toBe('audio');
    expect(waSendKind('video/mp4')).toBe('video');
    expect(waSendKind('application/pdf')).toBe('document');
    expect(waSendKind(null)).toBe('document');
  });
});

describe('quoteKindOf / quoteIcon / quoteSnippet / isUnavailableQuote (owner 2026-10-31)', () => {
  const q = { id: 'q1', direction: 'inbound' as const, body: null, media_mime: null, template_key: null, sender_name: null };
  const words = {
    media: { image: 'صورة', audio: 'رسالة صوتية', video: 'فيديو', pdf: 'ملف PDF', document: 'ملف', other: '؟' },
    template: 'رسالة قالب',
  };

  it('names a PDF apart from other files, each kind with its icon', () => {
    expect(quoteKindOf('application/pdf; name=a.pdf')).toBe('pdf');
    expect(quoteKindOf('application/msword')).toBe('document');
    expect(quoteKindOf(null)).toBeNull();
    const icons = ['image/jpeg', 'application/pdf', 'audio/ogg', 'video/mp4'].map((m) => quoteIcon({ media_mime: m }));
    expect(icons).toEqual(['📷', '📄', '🎤', '🎥']);
    expect(quoteIcon({ media_mime: null })).toBeNull();
  });

  it('the first line, else the kind of the file, else the template or «cannot be shown»', () => {
    expect(quoteSnippet({ ...q, body: ' أهلًا \nثانٍ', media_mime: 'image/jpeg' }, words)).toBe('أهلًا');
    expect(quoteSnippet({ ...q, media_mime: 'application/pdf' }, words)).toBe('ملف PDF');
    expect(quoteSnippet({ ...q, template_key: 'renewal_due' }, words)).toBe('رسالة قالب');
    expect(quoteSnippet(q, words)).toBe('؟');
  });

  it('tells the unavailable marker from a quoted message', () => {
    expect(isUnavailableQuote(UNAVAILABLE_QUOTE)).toBe(true);
    expect(isUnavailableQuote(q)).toBe(false);
  });
});
