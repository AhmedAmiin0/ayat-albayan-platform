import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { AUTH, closeAll, post, startHook, startStub, templateBody } from './test-server.ts';

afterEach(closeAll);

type Value = { messages?: Record<string, unknown>[]; statuses?: Record<string, unknown>[]; metadata: unknown };
const valueOf = (body: string) =>
  (JSON.parse(body) as { entry: { changes: { value: Value }[] }[] }).entry[0]?.changes[0]?.value;

async function setup() {
  const hook = await startHook();
  const { url, stub } = await startStub({ webhookUrl: hook.url, appSecret: 's3cret', phoneNumberId: 'PN1' });
  return { hook, url, stub };
}

describe('wa-stub: signed inbound simulation (R-MSG-04)', () => {
  it('text: signed with the app secret over the exact bytes, with metadata', async () => {
    const { hook, url } = await setup();
    const res = await post(`${url}/__stub/inbound`, { from: '966598917071', name: 'أم سهيلة', text: 'السلام عليكم' });
    expect(await res.json()).toMatchObject({ forwarded: true, status: 200 });
    const got = hook.received[0];
    expect(got?.sig).toBe(`sha256=${createHmac('sha256', 's3cret').update(got?.body ?? '').digest('hex')}`);
    const value = valueOf(got?.body ?? '{}');
    expect(value?.metadata).toEqual({ display_phone_number: '15550001111', phone_number_id: 'PN1' });
    expect(value?.messages?.[0]).toMatchObject({ from: '966598917071', type: 'text', text: { body: 'السلام عليكم' } });
  });

  it('a template quick-reply tap arrives as type button with our payload and the context wamid', async () => {
    const { hook, url } = await setup();
    await post(`${url}/__stub/inbound`, {
      from: '966598917071',
      button: { text: 'تمام، هنحضر', payload: 'confirm:lesson-1' },
      context: 'wamid.out1',
    });
    expect(valueOf(hook.received[0]?.body ?? '{}')?.messages?.[0]).toMatchObject({
      type: 'button',
      button: { payload: 'confirm:lesson-1' },
      context: { id: 'wamid.out1' },
    });
  });

  it('interactive button replies and media; media is fetchable with a bearer', async () => {
    const { hook, url } = await setup();
    await post(`${url}/__stub/inbound`, { from: '966598917071', interactive: { id: 'reschedule:l1', title: 'تأجيل' } });
    const media = await post(`${url}/__stub/inbound`, {
      from: '966598917071',
      media: { kind: 'image', mime: 'image/jpeg', caption: 'الواجب', base64: Buffer.from('JPEG').toString('base64') },
    });
    const { mediaId } = (await media.json()) as { mediaId: string };
    expect(valueOf(hook.received[0]?.body ?? '{}')?.messages?.[0]).toMatchObject({ type: 'interactive' });
    expect(valueOf(hook.received[1]?.body ?? '{}')?.messages?.[0]).toMatchObject({
      type: 'image',
      image: { id: mediaId, mime_type: 'image/jpeg', caption: 'الواجب' },
    });
    const meta = (await (await fetch(`${url}/v21.0/${mediaId}`, { headers: AUTH })).json()) as { url: string; mime_type: string };
    expect(meta.mime_type).toBe('image/jpeg');
    expect((await fetch(meta.url)).status).toBe(401);
    expect(await (await fetch(meta.url, { headers: AUTH })).text()).toBe('JPEG');
  });
});

describe('wa-stub: delivery statuses (R-MSG-05)', () => {
  it('sent carries conversation + pricing; failed carries the error code', async () => {
    const { hook, url } = await setup();
    const sent = await post(`${url}/v21.0/PN1/messages`, templateBody('lesson_reminder_v2', 2));
    const id = ((await sent.json()) as { messages: { id: string }[] }).messages[0]?.id;
    await post(`${url}/__stub/status`, { id, status: 'sent' });
    await post(`${url}/__stub/status`, { id, status: 'failed', errorCode: 131026 });
    expect(valueOf(hook.received[0]?.body ?? '{}')?.statuses?.[0]).toMatchObject({
      id,
      status: 'sent',
      recipient_id: '966598917071',
      conversation: { origin: { type: 'utility' } },
      pricing: { category: 'utility' },
    });
    expect(valueOf(hook.received[1]?.body ?? '{}')?.statuses?.[0]).toMatchObject({ status: 'failed', errors: [{ code: 131026 }] });
  });

  it('unknown wamid → 404; no webhook configured → 400', async () => {
    const { url } = await setup();
    expect((await post(`${url}/__stub/status`, { id: 'wamid.nope', status: 'read' })).status).toBe(404);
    const bare = await startStub();
    expect((await post(`${bare.url}/__stub/inbound`, { from: '966598917071', text: 'x' })).status).toBe(400);
  });
});
