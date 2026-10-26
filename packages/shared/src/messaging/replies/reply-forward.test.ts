import { describe, expect, it } from 'vitest';
import { waSendKind } from '../chat/chat-files.js';
import { canForward, canReply, FORWARD_MAX_TARGETS, mediaKindOf, quoteLine, threadForwardSchema } from './reply-forward.js';
import { threadFileSendSchema, threadTextSchema } from '../schemas.js';

const ID = '00000000-0000-4000-8000-000000000001';
const REQ = '00000000-0000-4000-8000-000000000002';
const phones = (n: number) => Array.from({ length: n }, (_, i) => `+2010000000${i}`);

describe('threadForwardSchema', () => {
  it('takes one to five distinct E.164 targets', () => {
    expect(threadForwardSchema.safeParse({ messageId: ID, targets: phones(1), clientRequestId: REQ }).success).toBe(true);
    expect(threadForwardSchema.safeParse({ messageId: ID, targets: phones(FORWARD_MAX_TARGETS), clientRequestId: REQ }).success).toBe(true);
  });

  it('refuses none, six, a duplicate, a free-text number or no request id', () => {
    const bad = [
      { messageId: ID, targets: [], clientRequestId: REQ },
      { messageId: ID, targets: phones(6), clientRequestId: REQ },
      { messageId: ID, targets: ['+201000000001', '+201000000001'], clientRequestId: REQ },
      { messageId: ID, targets: ['01000000001'], clientRequestId: REQ },
      { messageId: ID, targets: phones(1) },
    ];
    for (const body of bad) expect(threadForwardSchema.safeParse(body).success).toBe(false);
  });
});

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

  it('sends JPEG/PNG as image, voice and video as themselves, anything else as a document', () => {
    expect(waSendKind('image/png')).toBe('image');
    expect(waSendKind('image/webp')).toBe('document');
    expect(waSendKind('audio/ogg; codecs=opus')).toBe('audio');
    expect(waSendKind('video/mp4')).toBe('video');
    expect(waSendKind('application/pdf')).toBe('document');
    expect(waSendKind(null)).toBe('document');
  });
});
