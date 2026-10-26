import { describe, expect, it } from 'vitest';
import { kapsoText, SENT_AT } from '../external/external.fakes';
import { PHONE_NUMBER_ID, TS_DATE } from '../meta.fakes';
import { services } from '../webhook.fakes';
import { WebhookService } from '../webhook.service';
import { parseWebhook } from './webhook.parse';

// Meta's smb_message_echoes (WhatsApp Business app coexistence): the business's own messages, with content.

const echo = kapsoText({ id: 'wamid.ECHO1', from: '15550001111', kapso: undefined });
const echoes = (items: unknown[], phoneNumberId = PHONE_NUMBER_ID) => ({
  entry: [{ changes: [{ field: 'smb_message_echoes', value: { metadata: { phone_number_id: phoneNumberId }, message_echoes: items } }] }],
});

describe('smb_message_echoes', () => {
  it('parses each echo with where it came in; nothing as inbound', () => {
    const batch = parseWebhook(echoes([echo]), { now: TS_DATE, numbers: { notifications: PHONE_NUMBER_ID } });
    expect(batch.messages).toEqual([]);
    expect(batch.echoes).toEqual([{ message: echo, line: null, phoneNumberId: PHONE_NUMBER_ID }]);
  });

  it('an echo for a number that is neither line is ignored', () => {
    const batch = parseWebhook(echoes([echo], 'someone-else'), { now: TS_DATE, numbers: { notifications: PHONE_NUMBER_ID } });
    expect(batch.echoes).toEqual([]);
  });

  it('stored as an outbound row with WhatsApp\'s time and its content, once, with no push and no lead', async () => {
    const s = services();
    s.queries.numberIdFor.mockResolvedValue('num-1');
    const config = { appSecrets: ['s'], verifyToken: 't', numbers: { notifications: PHONE_NUMBER_ID } };
    const svc = new WebhookService(config, s.inbound, s.statuses);
    await svc.handle(echoes([echo]));
    await svc.handle(echoes([echo]));
    expect(s.queries.stored).toEqual([
      expect.objectContaining({
        direction: 'outbound', wa_message_id: 'wamid.ECHO1', body: 'تم تأكيد الموعد', status: 'sent',
        created_at: SENT_AT.toISOString(), sent_at: SENT_AT.toISOString(), created_by: null, number_id: 'num-1',
      }),
    ]);
    expect(s.external.kapso.message).not.toHaveBeenCalled();
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
    expect(s.leads.upsertByPhone).not.toHaveBeenCalled();
  });
});
