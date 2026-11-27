import { describe, expect, it } from 'vitest';
import { aMessageView } from '../../../../testing';
import { chatFileSendRoutes } from '../chat-files.routes';

const ID = '00000000-0000-4000-8000-000000000001';
const PHONE = '+966500000001';
const SIGNED = { bucket: 'wa-media', path: 'out/a.pdf', token: 't', signed_url: 'https://s.test/a' };
const SEND = { clientRequestId: ID, path: 'out/a.pdf', filename: 'إيصال.pdf' };

describe('chatFileSendRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(chatFileSendRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['POST /threads/:phone/file-upload-url', 'POST /threads/:phone/file']);
  });

  it('reads any spelling of the phone and refuses a bad one', () => {
    const params = chatFileSendRoutes.send.params;
    expect(params.parse({ phone: '966500000001' })).toEqual({ phone: PHONE });
    expect(params.safeParse({ phone: 'abc' }).success).toBe(false);
  });

  it('asks an upload for a chat file type only, with a whole size', () => {
    const body = chatFileSendRoutes.uploadUrl.body;
    const upload = { clientRequestId: ID, mime: 'application/pdf', size: 1200 };
    expect(body.parse(upload)).toEqual(upload);
    expect(body.safeParse({ ...upload, mime: 'image/webp' }).success).toBe(false);
    expect(body.safeParse({ ...upload, size: 0 }).success).toBe(false);
    expect(chatFileSendRoutes.uploadUrl.response.parse(SIGNED)).toEqual(SIGNED);
    expect(chatFileSendRoutes.uploadUrl.response.safeParse({ path: 'x' }).success).toBe(false);
  });

  it('sends a named file and refuses a name with a path or a line break', () => {
    const body = chatFileSendRoutes.send.body;
    expect(body.parse(SEND)).toEqual(SEND);
    expect(body.safeParse({ ...SEND, filename: 'a/b.pdf' }).success).toBe(false);
    expect(body.safeParse({ ...SEND, filename: 'a\nb.pdf' }).success).toBe(false);
    expect(body.safeParse({ ...SEND, replyToMessageId: 'm1' }).success).toBe(false);
  });

  it('answers the sent message as a message view', () => {
    const sent = aMessageView({ media_mime: 'application/pdf' });
    expect(chatFileSendRoutes.send.response.parse(sent)).toEqual(sent);
    const bad = { ...sent, direction: 'sideways' };
    expect(chatFileSendRoutes.send.response.safeParse(bad).success).toBe(false);
  });

  it('lets inbox.send in and tags both inbox', () => {
    const access = Object.values(chatFileSendRoutes).map((r) => [r.permissions, r.tags]);
    expect(access).toEqual([
      [['inbox.send'], ['inbox']],
      [['inbox.send'], ['inbox']],
    ]);
  });
});
