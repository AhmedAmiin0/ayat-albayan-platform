import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../../common/storage/storage.service';
import { MessageDispatch } from './message.dispatch';
import { dueMessage } from './sender.fakes';
import type { WhatsappLines } from '../whatsapp.types';

// A voice note recorded in the app (owner 2026-10-27): the API's ogg/opus copy goes as voice:true.
const client = { sendTemplate: vi.fn(), sendText: vi.fn(), sendDocument: vi.fn() };
const lines = { notifications: client, chat: client } as unknown as WhatsappLines;
const storage = { signedDownload: vi.fn() };
const dispatch = () => new MessageDispatch(lines, storage as unknown as StorageService);
const file = (over: Parameters<typeof dueMessage>[0]) =>
  dueMessage({ template_key: null, template_params: null, lesson_id: null, line: 'chat', body: null, ...over });

describe('MessageDispatch — a voice note', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    client.sendDocument.mockResolvedValue({ waMessageId: 'wamid.v' });
    storage.signedDownload.mockResolvedValue({ url: 'https://storage.local/voice', expires_at: 'x' });
  });

  it('an audio/ogg row goes as audio with voice:true, to the row’s own phone', async () => {
    const row = file({ media_path: 'out/u1/r1/voice.ogg', media_mime: 'audio/ogg', media_name: 'voice.ogg' });
    await dispatch().send(row, null, 'chat');
    expect(client.sendDocument).toHaveBeenCalledWith(expect.objectContaining({ to: row.phone_e164, kind: 'audio', voice: true }));
  });

  it('an m4a (no ffmpeg) is plain audio: voice false', async () => {
    await dispatch().send(file({ media_path: 'out/u1/r1/a.m4a', media_mime: 'audio/mp4' }), null, 'chat');
    expect(client.sendDocument).toHaveBeenCalledWith(expect.objectContaining({ kind: 'audio', voice: false }));
  });

  it('an image or a PDF never carries voice', async () => {
    await dispatch().send(file({ media_path: 'out/u1/r1/a.jpg', media_mime: 'image/jpeg' }), null, 'chat');
    await dispatch().send(file({ media_path: 'out/u1/r1/a.pdf', media_mime: 'application/pdf' }), null, 'chat');
    for (const [input] of client.sendDocument.mock.calls as [{ voice: boolean }][]) expect(input.voice).toBe(false);
  });
});
