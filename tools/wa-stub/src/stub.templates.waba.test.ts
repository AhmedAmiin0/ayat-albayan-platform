import { afterEach, describe, expect, it } from 'vitest';
import { bearer, closeAll, post, startStub, templateBody, TWO_LINES } from './test-server.ts';

// Per-number template tests stay honest (2026-10-18): a created template lives on the WABA it was
// created on only, the review control route can pick the WABA, and Meta's rejected_reason is listed.

afterEach(closeAll);

type Listed = { name: string; status: string; rejected_reason: string };
const NOTIF = bearer('notif-token');
const BODY = { type: 'BODY', text: 'السلام عليكم {{1}}، ما الوقت المناسب؟', example: { body_text: [['أحمد']] } };
const create = (url: string, waba: string, name = 'trial_reschedule') =>
  post(`${url}/v21.0/${waba}/message_templates`, { name, language: 'ar', category: 'UTILITY', components: [BODY] }, NOTIF);
const list = async (url: string, waba: string): Promise<Listed[]> =>
  ((await (await fetch(`${url}/v21.0/${waba}/message_templates`, { headers: NOTIF })).json()) as { data: Listed[] }).data;
const names = async (url: string, waba: string) => (await list(url, waba)).map((t) => t.name);

describe('wa-stub: templates created per WABA', () => {
  it('a template created on the chat WABA is listed there only, and only the chat number sends it', async () => {
    const { url } = await startStub(TWO_LINES);
    expect((await create(url, 'WABA-C')).status).toBe(200);
    expect(await names(url, 'WABA-C')).toContain('trial_reschedule');
    expect(await names(url, 'WABA-N')).not.toContain('trial_reschedule');
    await post(`${url}/__stub/templates/trial_reschedule`, { status: 'APPROVED' });
    const body = templateBody('trial_reschedule', 1);
    expect((await post(`${url}/v21.0/PN-N/messages`, body, NOTIF)).status).toBe(404);
    expect((await post(`${url}/v21.0/PN-C/messages`, body, NOTIF)).status).toBe(200);
  });

  it('the same name may be created on each WABA once; a second create on the same WABA is a duplicate', async () => {
    const { url } = await startStub(TWO_LINES);
    expect((await create(url, 'WABA-C')).status).toBe(200);
    expect((await create(url, 'WABA-N')).status).toBe(200);
    expect((await create(url, 'WABA-N')).status).toBe(400);
  });

  it('a create on the kapso prefix lands on its WABA too', async () => {
    const { url } = await startStub({ ...TWO_LINES, kapso: { apiKey: 'k' } });
    const res = await post(`${url}/kapso/v24.0/WABA-C/message_templates`, { name: 'kx', language: 'ar', components: [BODY] }, { 'x-api-key': 'k' });
    expect(res.status).toBe(200);
    expect(await names(url, 'WABA-N')).not.toContain('kx');
    expect(await names(url, 'WABA-C')).toContain('kx');
  });

  it('a path no configured line owns keeps the old behaviour: the template is on every WABA', async () => {
    const { url } = await startStub();
    await create(url, 'WABA');
    expect(await names(url, 'ANY')).toContain('trial_reschedule');
  });
});

describe('wa-stub: the review control route', () => {
  it('takes an optional waba: only that WABA’s copy changes', async () => {
    const { url } = await startStub(TWO_LINES);
    await create(url, 'WABA-C');
    await create(url, 'WABA-N');
    expect((await post(`${url}/__stub/templates/trial_reschedule`, { status: 'APPROVED', waba: 'WABA-C' })).status).toBe(200);
    expect((await list(url, 'WABA-C')).find((t) => t.name === 'trial_reschedule')?.status).toBe('APPROVED');
    expect((await list(url, 'WABA-N')).find((t) => t.name === 'trial_reschedule')?.status).toBe('PENDING');
    expect((await post(`${url}/__stub/templates/academy_welcome`, { status: 'PAUSED', waba: 'WABA-N' })).status).toBe(404);
  });

  it('lists rejected_reason: NONE by default, Meta’s reason once rejected', async () => {
    const { url } = await startStub(TWO_LINES);
    await create(url, 'WABA-C');
    expect((await list(url, 'WABA-C')).find((t) => t.name === 'trial_reschedule')?.rejected_reason).toBe('NONE');
    await post(`${url}/__stub/templates/trial_reschedule`, { status: 'REJECTED', rejected_reason: 'INVALID_FORMAT', waba: 'WABA-C' });
    expect((await list(url, 'WABA-C')).find((t) => t.name === 'trial_reschedule')).toMatchObject({ status: 'REJECTED', rejected_reason: 'INVALID_FORMAT' });
  });
});
