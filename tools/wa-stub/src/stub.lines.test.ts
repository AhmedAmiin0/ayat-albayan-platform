import { afterEach, describe, expect, it } from 'vitest';
import { bearer, closeAll, post, startHook, startStub, templateBody, TWO_LINES } from './test-server.ts';

afterEach(closeAll);

const NOTIF = bearer(TWO_LINES.accessToken);
const CHAT = bearer(TWO_LINES.chat.accessToken);
const msgPath = (pn: string) => `/v21.0/${pn}/messages`;
const read = (id: string) => ({ messaging_product: 'whatsapp', status: 'read', message_id: id });

async function twoLines() {
  const hook = await startHook();
  return { hook, ...(await startStub({ ...TWO_LINES, webhookUrl: hook.url })) };
}

describe('wa-stub: two lines (docs/12 §13.12, R-MSG-04)', () => {
  it('records the phone-number id of the Graph path on every send', async () => {
    const { url, stub } = await twoLines();
    await post(`${url}${msgPath('PN-N')}`, templateBody('lesson_reminder_v2', 2), NOTIF);
    await post(`${url}/__stub/inbound`, { from: '966500000002', text: 'سلام', phoneNumberId: 'PN-C' });
    const text = { to: '966500000002', type: 'text', text: { body: 'أهلاً' } };
    expect((await post(`${url}${msgPath('PN-C')}`, text, CHAT)).status).toBe(200);
    expect(stub.sent.map((m) => [m.type, m.phoneNumberId])).toEqual([
      ['template', 'PN-N'],
      ['text', 'PN-C'],
    ]);
    const listed = (await (await fetch(`${url}/__stub/messages`)).json()) as { phoneNumberId: string }[];
    expect(listed.map((m) => m.phoneNumberId)).toEqual(['PN-N', 'PN-C']);
  });

  it('logs reads by line; the plain read log is unchanged; reset clears both', async () => {
    const { url } = await twoLines();
    await post(`${url}${msgPath('PN-C')}`, read('wamid.c1'), CHAT);
    await post(`${url}${msgPath('PN-N')}`, read('wamid.n1'), NOTIF);
    expect(await (await fetch(`${url}/__stub/reads`)).json()).toEqual(['wamid.c1', 'wamid.n1']);
    expect(await (await fetch(`${url}/__stub/reads/by-line`)).json()).toEqual([
      { phoneNumberId: 'PN-C', messageId: 'wamid.c1' },
      { phoneNumberId: 'PN-N', messageId: 'wamid.n1' },
    ]);
    await post(`${url}/__stub/reset`, {});
    expect(await (await fetch(`${url}/__stub/reads/by-line`)).json()).toEqual([]);
    await post(`${url}${msgPath('PN-N')}`, read('wamid.n2'), NOTIF);
    await fetch(`${url}/__stub/messages`, { method: 'DELETE' });
    expect(await (await fetch(`${url}/__stub/reads/by-line`)).json()).toEqual([]);
  });

  it('accepts the bearer of ANY configured line on any path; others get 190', async () => {
    const { url } = await twoLines();
    const body = templateBody('lesson_reminder_v2', 2);
    expect((await post(`${url}${msgPath('PN-N')}`, body, CHAT)).status).toBe(200);
    expect((await post(`${url}${msgPath('PN-C')}`, body, NOTIF)).status).toBe(200);
    const bad = await post(`${url}${msgPath('PN-C')}`, body, bearer('stranger'));
    expect(bad.status).toBe(401);
    expect(((await bad.json()) as { error: { code: number } }).error.code).toBe(190);
    expect((await post(`${url}${msgPath('PN-C')}`, body, {})).status).toBe(401);
  });

  it('a chat line without its own token accepts the notifications token only', async () => {
    const { url } = await startStub({ ...TWO_LINES, chat: { phoneNumberId: 'PN-C' } });
    const body = templateBody('lesson_reminder_v2', 2);
    expect((await post(`${url}${msgPath('PN-C')}`, body, NOTIF)).status).toBe(200);
    expect((await post(`${url}${msgPath('PN-C')}`, body, CHAT)).status).toBe(401);
  });

  it('the chat inbound opens the 24 h window for a reply from either path', async () => {
    const { url } = await twoLines();
    const text = { to: '966500000003', type: 'text', text: { body: 'أهلاً' } };
    expect((await post(`${url}${msgPath('PN-C')}`, text, CHAT)).status).toBe(400);
    await post(`${url}/__stub/inbound`, { from: '966500000003', text: 'سلام', phoneNumberId: 'PN-C' });
    expect((await post(`${url}${msgPath('PN-C')}`, text, CHAT)).status).toBe(200);
  });

  it('single-line stub: no chat identity, lenient bearer, sends still carry their path id', async () => {
    const { url, stub } = await startStub();
    expect((await post(`${url}${msgPath('ANY')}`, templateBody('lesson_reminder_v2', 2), bearer('x'))).status).toBe(200);
    expect(stub.sent[0]?.phoneNumberId).toBe('ANY');
    expect([...stub.state.health.keys()]).toEqual(['stub-phone']);
  });
});
