import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AUTH,
  closeAll,
  hmacHex,
  post,
  read,
  receivedAt,
  sentIds,
  startHook,
  startStub,
  templateBody,
} from './test-server.ts';

afterEach(closeAll);

interface Value {
  messages?: Record<string, unknown>[];
  statuses?: Record<string, unknown>[];
  metadata: unknown;
}
const valueOf = (body: string) =>
  (JSON.parse(body) as { entry: { changes: { value: Value }[] }[] }).entry[0]?.changes[0]?.value;
const messageOf = (body: string) => valueOf(body)?.messages?.[0];
const statusOf = (body: string) => valueOf(body)?.statuses?.[0];

async function setup() {
  const hook = await startHook();
  const { url, stub } = await startStub({
    webhookUrl: hook.url,
    appSecret: 's3cret',
    phoneNumberId: 'PN1',
  });
  return { hook, url, stub };
}

describe('wa-stub: signed inbound simulation (R-MSG-04)', () => {
  it('text: signed with the app secret over the exact bytes, with metadata', async () => {
    const { hook, url } = await setup();
    const res = await post(`${url}/__stub/inbound`, {
      from: '966598917071',
      name: 'أم سهيلة',
      text: 'السلام عليكم',
    });
    expect(await res.json()).toMatchObject({ forwarded: true, status: 200 });
    const got = receivedAt(hook, 0);
    expect(got.sig).toBe(`sha256=${hmacHex('s3cret', got.body)}`);
    expect(valueOf(got.body)?.metadata).toEqual({
      display_phone_number: '15550001111',
      phone_number_id: 'PN1',
    });
    expect(messageOf(got.body)).toMatchObject({
      from: '966598917071',
      type: 'text',
      text: { body: 'السلام عليكم' },
    });
  });

  it('a template quick-reply tap arrives as type button with our payload and the context wamid', async () => {
    const { hook, url } = await setup();
    await post(`${url}/__stub/inbound`, {
      from: '966598917071',
      button: { text: 'تمام، هنحضر', payload: 'confirm:lesson-1' },
      context: 'wamid.out1',
    });
    expect(messageOf(receivedAt(hook, 0).body)).toMatchObject({
      type: 'button',
      button: { payload: 'confirm:lesson-1' },
      context: { id: 'wamid.out1' },
    });
  });

  it('interactive button replies and media; media is fetchable with a bearer', async () => {
    const { hook, url } = await setup();
    await post(`${url}/__stub/inbound`, {
      from: '966598917071',
      interactive: { id: 'reschedule:l1', title: 'تأجيل' },
    });
    const media = await post(`${url}/__stub/inbound`, {
      from: '966598917071',
      media: {
        kind: 'image',
        mime: 'image/jpeg',
        caption: 'الواجب',
        base64: Buffer.from('JPEG').toString('base64'),
      },
    });
    const { mediaId } = await read(media, z.object({ mediaId: z.string() }));
    expect(messageOf(receivedAt(hook, 0).body)).toMatchObject({ type: 'interactive' });
    expect(messageOf(receivedAt(hook, 1).body)).toMatchObject({
      type: 'image',
      image: { id: mediaId, mime_type: 'image/jpeg', caption: 'الواجب' },
    });
    const meta = await read(
      fetch(`${url}/v21.0/${mediaId}`, { headers: AUTH }),
      z.object({ url: z.string(), mime_type: z.string() }),
    );
    expect(meta.mime_type).toBe('image/jpeg');
    expect((await fetch(meta.url)).status).toBe(401);
    expect(await (await fetch(meta.url, { headers: AUTH })).text()).toBe('JPEG');
  });
});

describe('wa-stub: delivery statuses (R-MSG-05)', () => {
  it('sent carries conversation + pricing; failed carries the error code', async () => {
    const { hook, url } = await setup();
    const sent = await post(`${url}/v21.0/PN1/messages`, templateBody('lesson_reminder_v2', 2));
    const id = (await read(sent, sentIds)).messages[0]?.id;
    await post(`${url}/__stub/status`, { id, status: 'sent' });
    await post(`${url}/__stub/status`, { id, status: 'failed', errorCode: 131026 });
    expect(statusOf(receivedAt(hook, 0).body)).toMatchObject({
      id,
      status: 'sent',
      recipient_id: '966598917071',
      conversation: { origin: { type: 'utility' } },
      pricing: { category: 'utility' },
    });
    expect(statusOf(receivedAt(hook, 1).body)).toMatchObject({
      status: 'failed',
      errors: [{ code: 131026 }],
    });
  });

  it('unknown wamid → 404; no webhook configured → 400', async () => {
    const { url } = await setup();
    expect((await post(`${url}/__stub/status`, { id: 'wamid.nope', status: 'read' })).status).toBe(
      404,
    );
    const bare = await startStub();
    expect(
      (await post(`${bare.url}/__stub/inbound`, { from: '966598917071', text: 'x' })).status,
    ).toBe(400);
  });
});
