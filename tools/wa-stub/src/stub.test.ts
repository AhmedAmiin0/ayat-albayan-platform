import { afterEach, describe, expect, it } from 'vitest';
import { AUTH, closeAll, post, startHook, startStub, templateBody } from './test-server.ts';

afterEach(closeAll);

const MSG = '/v21.0/PHONE/messages';

describe('wa-stub: POST /messages (docs/12 §5)', () => {
  it('accepts an approved template with the right parameter count and logs it', async () => {
    const { url, stub } = await startStub();
    const res = await post(`${url}${MSG}`, templateBody('lesson_reminder_v2', 2));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { messages: { id: string }[] };
    expect(json.messages[0]?.id).toMatch(/^wamid\./);
    expect(stub.sent[0]).toMatchObject({ to: '966598917071', template: 'lesson_reminder_v2' });
  });

  it('reproduces 132001 for a template Meta does not have (issue C1)', async () => {
    const { url, stub } = await startStub();
    const res = await post(`${url}${MSG}`, templateBody('lesson_reminder_1h', 2));
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: number } }).error.code).toBe(132001);
    expect(stub.sent).toHaveLength(0);
  });

  it('132000 when the body parameter count is wrong', async () => {
    const { url } = await startStub();
    const res = await post(`${url}${MSG}`, templateBody('booking_confirmation_plain', 1));
    expect(((await res.json()) as { error: { code: number } }).error.code).toBe(132000);
  });

  it('190 without a bearer token; a configured token must match', async () => {
    const { url } = await startStub({ accessToken: 'secret' });
    expect((await post(`${url}${MSG}`, templateBody('lesson_reminder_v2', 2), {})).status).toBe(401);
    expect((await post(`${url}${MSG}`, templateBody('lesson_reminder_v2', 2))).status).toBe(401);
    const ok = await post(`${url}${MSG}`, templateBody('lesson_reminder_v2', 2), { authorization: 'Bearer secret' });
    expect(ok.status).toBe(200);
  });

  it('free text needs an inbound in the last 24 h (131047), then goes through', async () => {
    const hook = await startHook();
    const { url } = await startStub({ webhookUrl: hook.url, appSecret: 's' });
    const text = { to: '+966500000001', type: 'text', text: { body: 'أهلاً' } };
    const closed = await post(`${url}${MSG}`, text);
    expect(((await closed.json()) as { error: { code: number } }).error.code).toBe(131047);
    await post(`${url}/__stub/inbound`, { from: '966500000001', text: 'السلام عليكم' });
    expect((await post(`${url}${MSG}`, text)).status).toBe(200);
    expect((await post(`${url}${MSG}`, { ...text, type: 'document', document: { link: 'https://x/r.pdf' } })).status).toBe(200);
  });

  it('marks an inbound message read without logging a send', async () => {
    const { url, stub } = await startStub();
    const res = await post(`${url}${MSG}`, { messaging_product: 'whatsapp', status: 'read', message_id: 'wamid.in1' });
    expect(await res.json()).toEqual({ success: true });
    expect(stub.sent).toHaveLength(0);
    expect(await (await fetch(`${url}/__stub/reads`)).json()).toEqual(['wamid.in1']);
  });

  it('injected failure hits the next send to that number only', async () => {
    const { url } = await startStub();
    await post(`${url}/__stub/fail`, { to: '+966598917071', code: 131026 });
    const failed = await post(`${url}${MSG}`, templateBody('lesson_reminder_v2', 2));
    expect(((await failed.json()) as { error: { code: number } }).error.code).toBe(131026);
    expect((await post(`${url}${MSG}`, templateBody('lesson_reminder_v2', 2))).status).toBe(200);
  });

  it('exposes, clears and resets its state', async () => {
    const { url } = await startStub();
    await post(`${url}${MSG}`, templateBody('lesson_reminder_v2', 2));
    expect(((await (await fetch(`${url}/__stub/messages`)).json()) as unknown[]).length).toBe(1);
    await fetch(`${url}/__stub/messages`, { method: 'DELETE' });
    expect(((await (await fetch(`${url}/__stub/messages`)).json()) as unknown[]).length).toBe(0);
    expect((await fetch(`${url}/__stub/health`)).status).toBe(200);
    expect((await post(`${url}/__stub/reset`, {})).status).toBe(200);
    expect((await fetch(`${url}/nope`, { headers: AUTH })).status).toBe(404);
  });
});
