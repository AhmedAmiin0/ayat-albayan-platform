import type { TablesInsert } from '@ab/db';
import { isHiddenPayload } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { PHONE_NUMBER_ID } from '@/modules/messaging/webhook/meta.fakes';
import { services } from '@/modules/messaging/webhook/webhook.fakes';
import { WebhookService } from '@/modules/messaging/webhook/webhook.service';
import {
  AD_WELCOME_ITEM,
  DOCUMENT_ECHO,
  EDIT_ECHO,
  IMAGE_ECHO,
  ORIGINAL,
  REACTION_ECHO,
  REVOKE_ECHO,
  UNREACT_ECHO,
  UNSUPPORTED_ITEM,
} from './kapso-markers.fixtures';

// The WhatsApp Business app's actions through the webhook (smb_message_echoes): an edit, revoke or
// reaction is a hidden marker row (the database applies it, migration 992), never a bubble; a file
// is a file, never «[image]»; nothing reads the chat or pushes.

const PHONE = '+966501234567';
const echoes = (items: unknown[]) => ({
  entry: [
    {
      changes: [
        {
          field: 'smb_message_echoes',
          value: { metadata: { phone_number_id: PHONE_NUMBER_ID }, message_echoes: items },
        },
      ],
    },
  ],
});

async function deliver(items: unknown[], seed: TablesInsert<'messages'>[] = []) {
  const s = services();
  s.queries.stored.push(...seed);
  const config = {
    appSecrets: ['s'],
    verifyToken: 't',
    numbers: { notifications: PHONE_NUMBER_ID },
  };
  await new WebhookService(config, s.inbound, s.statuses).handle(echoes(items));
  return s;
}
const row = (s: Awaited<ReturnType<typeof deliver>>, id: string) =>
  s.queries.stored.find((r) => r.wa_message_id === id);
const unread: TablesInsert<'messages'> = {
  direction: 'inbound',
  phone_e164: PHONE,
  wa_message_id: 'wamid.IN1',
  created_at: '2026-10-26T08:00:00Z',
  read_at: null,
};

describe('webhook echoes: edit, revoke and reaction are markers', () => {
  it('an edit is a hidden marker naming the original and its new text; no body', async () => {
    const s = await deliver([EDIT_ECHO]);
    const r = row(s, 'wamid.EDIT1');
    expect(r).toMatchObject({ direction: 'outbound', phone_e164: PHONE, body: null });
    expect(r?.interactive_payload).toEqual({
      type: 'edit',
      marker: true,
      target: ORIGINAL,
      text: 'الحلقة الساعة 6 مساءً',
    });
    expect(isHiddenPayload(r?.interactive_payload)).toBe(true);
  });

  it('a revoke and a reaction (and its removal) are markers too', async () => {
    const s = await deliver([REVOKE_ECHO, REACTION_ECHO, UNREACT_ECHO]);
    expect(row(s, 'wamid.REVOKE1')?.interactive_payload).toEqual({
      type: 'revoke',
      marker: true,
      target: ORIGINAL,
    });
    expect(row(s, 'wamid.REACT1')?.interactive_payload).toMatchObject({
      type: 'reaction',
      reaction: { message_id: ORIGINAL, emoji: '👍' },
    });
    expect(row(s, 'wamid.REACT2')?.interactive_payload).toMatchObject({ reaction: { emoji: '' } });
    for (const id of ['wamid.REVOKE1', 'wamid.REACT1', 'wamid.REACT2'])
      expect(row(s, id)?.body).toBeNull();
  });

  it('a marker is no reply: the unread family message stays unread, no push', async () => {
    const s = await deliver([EDIT_ECHO, REVOKE_ECHO, REACTION_ECHO], [{ ...unread }]);
    expect(row(s, 'wamid.IN1')?.read_at).toBeNull();
    expect(s.external.ext.markAnsweredRead).not.toHaveBeenCalled();
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('a marker whose original is not stored yet is still kept once (pending), replay-safe', async () => {
    const s = await deliver([EDIT_ECHO, EDIT_ECHO]);
    expect(s.queries.stored.filter((r) => r.wa_message_id === 'wamid.EDIT1')).toHaveLength(1);
  });
});

describe('webhook echoes: files and notes', () => {
  it('a caption-less image or document is the file itself, never «[image]»', async () => {
    const s = await deliver([IMAGE_ECHO, DOCUMENT_ECHO]);
    expect(row(s, 'wamid.IMG1')).toMatchObject({
      body: null,
      media_id: '1092837465',
      media_mime: 'image/jpeg',
    });
    expect(row(s, 'wamid.DOC1')).toMatchObject({
      body: null,
      media_mime: 'application/pdf',
      media_name: 'تقرير الحلقة.pdf',
    });
  });

  it("the ad's welcome and an unsupported echo carry their type, no placeholder", async () => {
    const s = await deliver([AD_WELCOME_ITEM, UNSUPPORTED_ITEM]);
    expect(row(s, AD_WELCOME_ITEM.id)).toMatchObject({
      body: null,
      interactive_payload: { type: 'errors', welcome: null },
    });
    expect(row(s, 'wamid.UNS1')).toMatchObject({
      body: null,
      interactive_payload: { type: 'unsupported' },
    });
  });

  it('a real file still answers the chat (it is a message)', async () => {
    const s = await deliver([IMAGE_ECHO], [{ ...unread }]);
    expect(row(s, 'wamid.IN1')?.read_at).not.toBeNull();
  });
});
