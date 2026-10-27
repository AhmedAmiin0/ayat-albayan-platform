import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../../common/storage/storage.service';
import { CrmWhatsappClient } from '../drivers/crm/crm.client';
import { KAPSO_ENV } from '../drivers/kapso/kapso.fakes';
import { HttpWhatsappClient } from '../whatsapp.client';
import { RECORDED, scriptedFetch, STUB_ENV } from '../whatsapp.fakes';
import type { WhatsappLines } from '../whatsapp.types';
import { MessageDispatch } from './message.dispatch';
import { dueMessage } from './sender.fakes';

// Message reactions (owner 2026-10-27): a queued reaction row goes out as Meta's {type:'reaction'} on the
// meta and kapso drivers (the same body), never as a text; the crm driver has no reaction call. No network.

const client = { sendTemplate: vi.fn(), sendText: vi.fn(), sendDocument: vi.fn(), sendReaction: vi.fn() };
const lines = { notifications: client, chat: client } as unknown as WhatsappLines;
const dispatch = (l: WhatsappLines = lines) => new MessageDispatch(l, {} as StorageService);
const reactionRow = (emoji: string) =>
  dueMessage({
    template_key: null,
    template_params: null,
    lesson_id: null,
    line: 'chat',
    body: emoji,
    interactive_payload: { type: 'reaction', reaction: { message_id: 'wamid.T', emoji }, target_id: 'm1' },
  });

describe('MessageDispatch — reactions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sends a reaction (not a text) to the target wamid; an empty emoji removes ours', async () => {
    await dispatch().send(reactionRow('👍'), null, 'chat');
    expect(client.sendReaction).toHaveBeenCalledWith({ to: '+966551234567', messageId: 'wamid.T', emoji: '👍' });
    await dispatch().send(reactionRow(''), null, 'chat');
    expect(client.sendReaction).toHaveBeenLastCalledWith({ to: '+966551234567', messageId: 'wamid.T', emoji: null });
    expect(client.sendText).not.toHaveBeenCalled();
  });

  it('a driver without a reaction call (the crm line) fails the send, never a text', async () => {
    const crm = { ...client, sendReaction: undefined };
    const noReaction = { notifications: crm, chat: crm } as unknown as WhatsappLines;
    await expect(dispatch(noReaction).send(reactionRow('👍'), null, 'chat')).rejects.toThrow('cannot send a reaction');
    expect(client.sendText).not.toHaveBeenCalled();
    expect(new CrmWhatsappClient(null)).not.toHaveProperty('sendReaction');
  });
});

describe('the reaction body on meta and kapso', () => {
  const input = { to: '+966551234567', messageId: 'wamid.T', emoji: '❤️' };

  it('is Meta’s reaction payload, the same on Kapso’s Meta proxy', async () => {
    const meta = scriptedFetch(RECORDED.sendOk);
    const kapso = scriptedFetch(RECORDED.sendOk);
    await new HttpWhatsappClient(STUB_ENV, { fetch: meta.fetch, timeoutMs: 1_000 }).sendReaction(input);
    await new HttpWhatsappClient(KAPSO_ENV, { fetch: kapso.fetch, timeoutMs: 1_000 }).sendReaction(input);
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '966551234567',
      type: 'reaction',
      reaction: { message_id: 'wamid.T', emoji: '❤️' },
    };
    expect(meta.requests[0]?.body).toEqual(body);
    expect(kapso.requests[0]?.body).toEqual(body);
  });

  it('a removal sends an empty emoji, and the allow-list is checked first', async () => {
    const meta = scriptedFetch(RECORDED.sendOk);
    await new HttpWhatsappClient(STUB_ENV, { fetch: meta.fetch, timeoutMs: 1_000 }).sendReaction({ ...input, emoji: null });
    expect(meta.requests[0]?.body).toMatchObject({ reaction: { message_id: 'wamid.T', emoji: '' } });
    const blocked = scriptedFetch();
    const c = new HttpWhatsappClient(STUB_ENV, { fetch: blocked.fetch, timeoutMs: 1_000, allowed: ['+966500000001'] });
    await expect(c.sendReaction(input)).rejects.toThrow('recipient not allowed');
    expect(blocked.requests).toHaveLength(0);
  });
});
