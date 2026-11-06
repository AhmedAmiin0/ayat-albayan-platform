import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';
import { MessageDispatch } from './message.dispatch';
import { dueMessage } from './sender.fakes';

// docs/19 «Evolution driver»: a Baileys number with automatic sends off takes staff chat only.
// A job's row (no author) is refused before any call; a staff member's row goes out.

const STAFF = '00000000-0000-4000-8000-0000000000aa';

function lines(automaticOff: boolean): WhatsappLines {
  const sent = async () => ({ waMessageId: 'EVO-1' });
  const send = { sendText: vi.fn(sent), sendTemplate: vi.fn(sent) };
  const chat = { automaticOff: () => automaticOff, ...send };
  return { notifications: chat, chat } as unknown as WhatsappLines;
}

const job = dueMessage({ created_by: null, template_key: 'booking_confirmation' });
const params = { template_params: { '1': 'سارة', '2': 'الأحد', button: 'room-1' } };
const text = dueMessage({ created_by: STAFF, template_key: null, template_params: null, body: 'مرحبا' });

describe('MessageDispatch on a staff-only number', () => {
  it("refuses a job's row with evolution_auto_off; nothing is sent", async () => {
    const l = lines(true);
    const p = new MessageDispatch(l, {} as StorageService).send({ ...job, ...params }, templateRow(), 'chat');
    await expect(p).rejects.toMatchObject({ info: { blocked: 'evolution_auto_off' } });
    expect(l.chat.sendTemplate).not.toHaveBeenCalled();
  });

  it("sends a staff member's text; with the switch on, a job's row goes too", async () => {
    await expect(new MessageDispatch(lines(true), {} as StorageService).send(text, null, 'chat')).resolves.toEqual({ waMessageId: 'EVO-1' });
    const on = new MessageDispatch(lines(false), {} as StorageService);
    await expect(on.send({ ...job, ...params }, templateRow(), 'chat')).resolves.toEqual({ waMessageId: 'EVO-1' });
  });
});
