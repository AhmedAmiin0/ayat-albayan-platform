import { afterEach, describe, expect, it } from 'vitest';
import {
  bearer,
  closeAll,
  hmacHex,
  post,
  read,
  receivedAt,
  sentIds,
  startHook,
  startStub,
  templateBody,
  TWO_LINES,
} from './test-server.ts';

afterEach(closeAll);

interface Envelope {
  entry: { id: string; changes: { value: { metadata: unknown; statuses?: unknown[] } }[] }[];
}
const entryOf = (body: string) => (JSON.parse(body) as Envelope).entry[0];
const metadataOf = (body: string) => entryOf(body)?.changes[0]?.value.metadata;
const hmac = (body: string, secret: string) => `sha256=${hmacHex(secret, body)}`;

async function setup() {
  const hook = await startHook();
  const { url } = await startStub({ ...TWO_LINES, webhookUrl: hook.url });
  return { hook, url };
}

describe('wa-stub: signed webhooks per line (docs/12 §13.12)', () => {
  it('a chat inbound carries the chat metadata and entry id, signed with the chat secret', async () => {
    const { hook, url } = await setup();
    await post(`${url}/__stub/inbound`, {
      from: '966500000010',
      text: 'سلام',
      phoneNumberId: 'PN-C',
    });
    const got = receivedAt(hook, 0);
    expect(got.sig).toBe(hmac(got.body, 'chat-secret'));
    expect(entryOf(got.body)?.id).toBe('WABA-C');
    expect(metadataOf(got.body)).toEqual({
      display_phone_number: '15550002222',
      phone_number_id: 'PN-C',
    });
  });

  it('the default inbound stays on the notifications line with its secret and identity', async () => {
    const { hook, url } = await setup();
    await post(`${url}/__stub/inbound`, { from: '966500000011', text: 'سلام' });
    const got = receivedAt(hook, 0);
    expect(got.sig).toBe(hmac(got.body, 'notif-secret'));
    expect(entryOf(got.body)?.id).toBe('stub-waba');
    expect(metadataOf(got.body)).toEqual({
      display_phone_number: '15550001111',
      phone_number_id: 'PN-N',
    });
  });

  it('signWith overrides the signing secret (the bad-signature case)', async () => {
    const { hook, url } = await setup();
    await post(`${url}/__stub/inbound`, {
      from: '966500000012',
      text: 'x',
      phoneNumberId: 'PN-C',
      signWith: 'wrong',
    });
    const got = receivedAt(hook, 0);
    expect(got.sig).toBe(hmac(got.body, 'wrong'));
  });

  it('an unknown phoneNumberId is forwarded as given, with the notifications identity', async () => {
    const { hook, url } = await setup();
    const res = await post(`${url}/__stub/inbound`, {
      from: '966500000013',
      text: 'x',
      phoneNumberId: 'PN-OTHER',
    });
    expect(await res.json()).toMatchObject({ forwarded: true, status: 200 });
    const got = receivedAt(hook, 0);
    expect(got.sig).toBe(hmac(got.body, 'notif-secret'));
    expect(metadataOf(got.body)).toEqual({
      display_phone_number: '15550001111',
      phone_number_id: 'PN-OTHER',
    });
  });

  it('a chat line without its own secret signs with the notifications secret (one shared app)', async () => {
    const hook = await startHook();
    const { url } = await startStub({
      ...TWO_LINES,
      webhookUrl: hook.url,
      chat: { phoneNumberId: 'PN-C' },
    });
    await post(`${url}/__stub/inbound`, { from: '966500000014', text: 'x', phoneNumberId: 'PN-C' });
    const got = receivedAt(hook, 0);
    expect(got.sig).toBe(hmac(got.body, 'notif-secret'));
  });

  it('a delivery status of a chat send is reported on the chat line', async () => {
    const { hook, url } = await setup();
    await post(`${url}/__stub/inbound`, { from: '966500000015', text: 'x', phoneNumberId: 'PN-C' });
    const text = { to: '966500000015', type: 'text', text: { body: 'أهلاً' } };
    const sent = await post(`${url}/v21.0/PN-C/messages`, text, bearer('chat-token'));
    const id = (await read(sent, sentIds)).messages[0]?.id;
    await post(`${url}/__stub/status`, { id, status: 'delivered' });
    const got = receivedAt(hook, 1);
    expect(got.sig).toBe(hmac(got.body, 'chat-secret'));
    expect(metadataOf(got.body)).toMatchObject({ phone_number_id: 'PN-C' });
  });

  it('a delivery status of a template send is reported on the notifications line', async () => {
    const { hook, url } = await setup();
    const tpl = await post(
      `${url}/v21.0/PN-N/messages`,
      templateBody('lesson_reminder_v2', 2),
      bearer('notif-token'),
    );
    const tid = (await read(tpl, sentIds)).messages[0]?.id;
    await post(`${url}/__stub/status`, { id: tid, status: 'sent' });
    const got = receivedAt(hook, 0);
    expect(got.sig).toBe(hmac(got.body, 'notif-secret'));
    expect(metadataOf(got.body)).toMatchObject({ phone_number_id: 'PN-N' });
  });
});
