import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../../common/storage/storage.service';
import { MessageDispatch } from './message.dispatch';
import { dueMessage } from './sender.fakes';
import { REMINDER_24H, REPORT_READY, templateRow } from '../whatsapp.fakes';
import { WaError, type WhatsappLines } from '../whatsapp.types';

const client = { sendTemplate: vi.fn(), sendText: vi.fn() };
const lines = { notifications: client, chat: client } as unknown as WhatsappLines;
const storage = { signedDownload: vi.fn() };
const dispatch = () => new MessageDispatch(lines, storage as unknown as StorageService);
const doc = { bucket: 'reports', path: 's1/l1.pdf', filename: 'AB-0183_2026-09-29.pdf' };

describe('MessageDispatch — one row, one Graph call', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    client.sendTemplate.mockResolvedValue({ waMessageId: 'wamid.t' });
    client.sendText.mockResolvedValue({ waMessageId: 'wamid.x' });
    storage.signedDownload.mockResolvedValue({ url: 'https://storage.local/signed', expires_at: 'x' });
  });

  it('a template row sends the template with its params; nothing is signed without a document', async () => {
    const row = dueMessage();
    await expect(dispatch().send(row, templateRow(), 'notifications')).resolves.toEqual({ waMessageId: 'wamid.t' });
    expect(client.sendTemplate).toHaveBeenCalledWith({
      to: '+966551234567',
      template: templateRow(),
      params: { '1': 'سلمى', '2': 'الأحد 4 أكتوبر 17:00', button: 'ab-sara-x1' },
      documentUrl: null,
      payloads: [''],
    });
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('report_ready: signs the PDF in the reports bucket for 7 days at send time', async () => {
    const row = dueMessage({ template_key: 'report_ready', template_params: { '1': 'سلمى', '2': 'x', document: doc } });
    await dispatch().send(row, REPORT_READY, 'notifications');
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'reports', path: 's1/l1.pdf', seconds: 7 * 24 * 3600 });
    expect(client.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({ documentUrl: 'https://storage.local/signed' }));
  });

  it('never signs another bucket (permanent error)', async () => {
    const row = dueMessage({ template_key: 'report_ready', template_params: { document: { ...doc, bucket: 'receipts' } } });
    await expect(dispatch().send(row, REPORT_READY, 'notifications')).rejects.toMatchObject({ info: { code: 100 } });
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('quick-reply payloads point at the lesson, else the lead, else the message', async () => {
    await dispatch().send(dueMessage({ template_key: REMINDER_24H.key }), REMINDER_24H, 'notifications');
    expect(client.sendTemplate).toHaveBeenLastCalledWith(expect.objectContaining({
      payloads: ['confirm:l0000000-0000-4000-8000-000000000001', 'reschedule:l0000000-0000-4000-8000-000000000001'],
    }));
    await dispatch().send(dueMessage({ template_key: REMINDER_24H.key, lesson_id: null, lead_id: 'lead-1' }), REMINDER_24H, 'notifications');
    expect(client.sendTemplate).toHaveBeenLastCalledWith(expect.objectContaining({ payloads: ['confirm:lead-1', 'reschedule:lead-1'] }));
  });

  it('a session text (B2 inbox reply) goes as text, in reply to the quoted message', async () => {
    const row = dueMessage({ template_key: null, template_params: null, body: 'وعليكم السلام', reply_to_wa_id: 'wamid.in' });
    await expect(dispatch().send(row, null, 'notifications')).resolves.toEqual({ waMessageId: 'wamid.x' });
    expect(client.sendText).toHaveBeenCalledWith({ to: '+966551234567', text: 'وعليكم السلام', replyTo: 'wamid.in' });
  });

  it('nothing to send (no approved template, no text) is a permanent error', async () => {
    const send = dispatch().send(dueMessage({ template_key: null, body: null }), null, 'notifications');
    await expect(send).rejects.toBeInstanceOf(WaError);
    await expect(dispatch().send(dueMessage(), null, 'notifications')).rejects.toMatchObject({ info: { code: 100 } });
  });
});
