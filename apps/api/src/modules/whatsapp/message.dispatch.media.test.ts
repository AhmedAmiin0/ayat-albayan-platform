import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../common/storage/storage.service';
import { MessageDispatch, mediaLink } from './message.dispatch';
import { dueMessage } from './sender.fakes';
import { WaError, type WhatsappLines } from './whatsapp.types';

// A file staff sent from the chat (owner 2026-10-19 #2): by link, before the text branch.

const client = { sendTemplate: vi.fn(), sendText: vi.fn(), sendDocument: vi.fn() };
const lines = { notifications: client, chat: client } as unknown as WhatsappLines;
const storage = { signedDownload: vi.fn() };
const store = storage as unknown as StorageService;
const dispatch = () => new MessageDispatch(lines, store);
const file = (over: Parameters<typeof dueMessage>[0]) =>
  dueMessage({ template_key: null, template_params: null, lesson_id: null, line: 'chat', ...over });

describe('MessageDispatch — a sent file', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    client.sendDocument.mockResolvedValue({ waMessageId: 'wamid.f' });
    storage.signedDownload.mockResolvedValue({ url: 'https://storage.local/signed-out', expires_at: 'x' });
  });

  it('a captioned JPEG goes as type image with the caption, never as a text', async () => {
    const row = file({ body: 'الواجب', media_path: 'out/u1/r1/a.jpg', media_mime: 'image/jpeg', media_name: 'واجب.jpg' });
    await expect(dispatch().send(row, null, 'chat')).resolves.toEqual({ waMessageId: 'wamid.f' });
    expect(client.sendText).not.toHaveBeenCalled();
    expect(client.sendDocument).toHaveBeenCalledWith({
      to: '+966551234567',
      kind: 'image',
      url: 'https://storage.local/signed-out',
      filename: 'واجب.jpg',
      caption: 'الواجب',
    });
  });

  it('a PDF goes as type document with its filename; a missing caption stays null', async () => {
    const row = file({ body: null, media_path: 'out/u1/r1/b.pdf', media_mime: 'application/pdf', media_name: 'خطة.pdf' });
    await dispatch().send(row, null, 'chat');
    expect(client.sendDocument).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'document', filename: 'خطة.pdf', caption: null }),
    );
  });

  it('signs wa-media for the WhatsApp lifetime (7 days), once per try', async () => {
    const row = file({ body: null, media_path: 'out/u1/r1/b.pdf', media_mime: 'application/pdf' });
    await dispatch().send(row, null, 'chat');
    await dispatch().send(row, null, 'chat');
    expect(storage.signedDownload).toHaveBeenCalledTimes(2);
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'wa-media', path: 'out/u1/r1/b.pdf', seconds: 7 * 24 * 3600 });
  });

  it('only out/ paths are signed: an inbound cache path is a permanent error with no signing', async () => {
    const row = file({ body: 'x', media_path: 'm1.jpg', media_mime: 'image/jpeg' });
    await expect(dispatch().send(row, null, 'chat')).rejects.toBeInstanceOf(WaError);
    await expect(mediaLink(store, '../reports/s1/l1.pdf')).rejects.toMatchObject({ info: { code: 100 } });
    await expect(mediaLink(store, 'out/../m1.jpg')).rejects.toMatchObject({ info: { code: 100 } });
    expect(storage.signedDownload).not.toHaveBeenCalled();
    expect(client.sendDocument).not.toHaveBeenCalled();
  });
});
