import { afterEach, describe, expect, it } from 'vitest';
import { bearer, closeAll, post, startStub, templateBody, TWO_LINES } from './test-server.ts';

// Templates per WABA (owner 2026-10-12, docs/12 §13.12): the chat WABA has its own starter, which
// the notifications number cannot send; the academy's 8 are on both, as on the real main number.

afterEach(closeAll);

type TemplateList = { data: { name: string; category: string; status: string }[] };
const NOTIF = bearer('notif-token');
const names = async (url: string, waba: string) =>
  ((await (await fetch(`${url}/v21.0/${waba}/message_templates`, { headers: NOTIF })).json()) as TemplateList).data.map((t) => t.name);

describe('wa-stub: templates per WABA (two lines)', () => {
  it('the chat WABA lists its approved starter next to the shared 8; the notifications WABA does not', async () => {
    const { url } = await startStub(TWO_LINES);
    const chat = await names(url, 'WABA-C');
    expect(chat).toContain('academy_welcome');
    expect(chat).toContain('booking_confirmation');
    expect(chat).toHaveLength(9);
    const notifications = await names(url, 'WABA-N');
    expect(notifications).not.toContain('academy_welcome');
    expect(notifications).toHaveLength(8);
  });

  it('a chat starter sent through the notifications number → 132001; through the chat number → 200', async () => {
    const { url } = await startStub(TWO_LINES);
    const body = templateBody('academy_welcome', 1);
    const wrong = await post(`${url}/v21.0/PN-N/messages`, body, NOTIF);
    expect([wrong.status, ((await wrong.json()) as { error: { code: number } }).error.code]).toEqual([404, 132001]);
    expect((await post(`${url}/v21.0/PN-C/messages`, body, NOTIF)).status).toBe(200);
  });

  it('/__stub/reset brings the chat starter back', async () => {
    const { url, stub } = await startStub(TWO_LINES);
    stub.state.templates = [];
    await post(`${url}/__stub/reset`, {});
    expect(stub.state.templates.map((t) => t.name)).toContain('academy_welcome');
  });

  it('single line: no starter, every path lists the 8, as before', async () => {
    const { url } = await startStub();
    expect(await names(url, 'ANY')).toHaveLength(8);
    expect((await post(`${url}/v21.0/PHONE/messages`, templateBody('academy_welcome', 1), NOTIF)).status).toBe(404);
  });
});
