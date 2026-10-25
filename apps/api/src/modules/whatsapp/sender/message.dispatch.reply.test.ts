import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../common/storage/storage.service';
import { crmMediaBody } from '../drivers/crm/crm-body';
import { MessageDispatch } from './message.dispatch';
import { dueMessage } from './sender.fakes';
import { mediaMessage } from '../messages/wa-components';
import type { WhatsappLines } from '../whatsapp.types';

// «رد» / «إعادة توجيه» (owner 2026-10-25): the quoted wamid rides a text AND a file; a forwarded voice
// note or video goes as its own type on Meta / Kapso, as a document on the crm driver.

const client = { sendTemplate: vi.fn(), sendText: vi.fn(), sendDocument: vi.fn() };
const lines = { notifications: client, chat: client } as unknown as WhatsappLines;
const storage = { signedDownload: vi.fn() };
const dispatch = () => new MessageDispatch(lines, storage as unknown as StorageService);
const row = (over: Parameters<typeof dueMessage>[0]) =>
  dueMessage({ template_key: null, template_params: null, lesson_id: null, line: 'chat', ...over });

describe('MessageDispatch — replies and forwarded files', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    storage.signedDownload.mockResolvedValue({ url: 'https://storage.local/s', expires_at: 'x' });
  });

  it('a reply text passes the quoted wamid', async () => {
    await dispatch().send(row({ body: 'نعم', reply_to_wa_id: 'wamid.Q' }), null, 'chat');
    expect(client.sendText).toHaveBeenCalledWith({ to: '+966551234567', text: 'نعم', replyTo: 'wamid.Q' });
  });

  it('a reply file passes it too; a voice note goes as audio, a video as video', async () => {
    await dispatch().send(row({ body: null, media_path: 'out/u/r/fwd-1.ogg', media_mime: 'audio/ogg', reply_to_wa_id: 'wamid.Q' }), null, 'chat');
    expect(client.sendDocument).toHaveBeenCalledWith(expect.objectContaining({ kind: 'audio', replyTo: 'wamid.Q' }));
    await dispatch().send(row({ body: 'شاهد', media_path: 'out/u/r/fwd-2.mp4', media_mime: 'video/mp4' }), null, 'chat');
    expect(client.sendDocument).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'video', caption: 'شاهد' }));
  });
});

describe('media bodies', () => {
  const base = { to: '+966551234567', url: 'https://storage.local/s' };

  it('Meta: context on a reply, no caption on an audio', () => {
    expect(mediaMessage({ ...base, kind: 'audio', caption: 'x', replyTo: 'wamid.Q' })).toEqual({
      messaging_product: 'whatsapp', recipient_type: 'individual', to: '966551234567',
      type: 'audio', audio: { link: base.url }, context: { message_id: 'wamid.Q' },
    });
    expect(mediaMessage({ ...base, kind: 'image', caption: 'x' })).not.toHaveProperty('context');
  });

  it('crm: an audio or video goes as a document, and no context (its own uuid)', () => {
    expect(crmMediaBody({ ...base, kind: 'audio', replyTo: 'wamid.Q', filename: 'fwd.ogg' })).toEqual({
      to: base.to, type: 'document', media_url: base.url, filename: 'fwd.ogg',
    });
    expect(crmMediaBody({ ...base, kind: 'image' }).type).toBe('image');
  });
});
