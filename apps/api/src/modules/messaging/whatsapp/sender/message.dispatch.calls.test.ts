import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../../common/storage/storage.service';
import { callPermissionMessage } from '../messages/wa-call-permission';
import { MessageDispatch } from './message.dispatch';
import { dueMessage } from './sender.fakes';
import type { WhatsappLines } from '../whatsapp.types';

const permissionRow = () =>
  dueMessage({ template_key: null, template_params: null, body: 'هل تسمحون لنا بالاتصال؟', line: 'chat', interactive_payload: { type: 'call_permission_request' } });

describe('MessageDispatch — «اطلب إذن الاتصال» (docs/28)', () => {
  it('a marked row goes out as the interactive request from its line, never as a plain text', async () => {
    const chat = { sendText: vi.fn(), sendCallPermissionRequest: vi.fn(async () => ({ waMessageId: 'wamid.cp' })) };
    const lines = { notifications: { sendText: vi.fn() }, chat } as unknown as WhatsappLines;
    const sent = await new MessageDispatch(lines, {} as StorageService).send(permissionRow(), null, 'chat');
    expect(sent).toEqual({ waMessageId: 'wamid.cp' });
    expect(chat.sendCallPermissionRequest).toHaveBeenCalledWith({ to: '+966551234567', text: 'هل تسمحون لنا بالاتصال؟' });
    expect(chat.sendText).not.toHaveBeenCalled();
  });

  it('a driver without it (crm) fails the row permanently instead of sending text', async () => {
    const lines = { notifications: { sendText: vi.fn() }, chat: { sendText: vi.fn() } } as unknown as WhatsappLines;
    await expect(new MessageDispatch(lines, {} as StorageService).send(permissionRow(), null, 'chat')).rejects.toMatchObject({ info: { code: 100 } });
  });

  it('the Graph body is Meta\'s interactive call_permission_request', () => {
    expect(callPermissionMessage({ to: '+201001234567', text: 'نص' })).toEqual({
      messaging_product: 'whatsapp', recipient_type: 'individual', to: '201001234567', type: 'interactive',
      interactive: { type: 'call_permission_request', action: { name: 'call_permission_request' }, body: { text: 'نص' } },
    });
  });
});
