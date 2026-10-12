import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { whatsappApp } from './test-app';
import { REPORT_READY, templateRow } from './whatsapp.fakes';

type App = Awaited<ReturnType<typeof whatsappApp>>;
const ID = 'b0000000-0000-4000-8000-000000000009';
const GATE = { open: true, reason: null, queued: 0 };
const keys = (rows: { key: string }[]) => rows.map((r) => r.key);

// Owner report 2026-10-12 («it is not able to start the conversation»): messages.read is a sales grant now.
describe('WhatsApp templates for a salesperson (messages.read, docs/16)', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.gate.view.mockResolvedValue(GATE);
    t.templates.all.mockResolvedValue([
      templateRow({ sales_starter: true }),
      templateRow({ key: 'follow_up_slots' }),
      templateRow({ key: 'renewal_due', status: 'pending', sales_starter: true }),
      templateRow({ key: 'lesson_reminder' }),
      templateRow({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat', sales_starter: true }),
      templateRow({ key: 'lesson_join_link', sales_starter: true }),
      templateRow({ key: 'lesson_feedback_request' }),
      templateRow({ key: 'lesson_rating' }),
      { ...REPORT_READY, status: 'approved', sales_starter: true },
    ]);
  });

  // Owner 2026-10-12: starters only (the admin ticks them; chat-line imports come ticked).
  it('T1: sales lists only the approved starters she may send (no PDF, no own-button one), not 403', async () => {
    const res = await t.call({ method: 'GET', url: '/messaging/templates', token: 'sales' });
    expect(res.statusCode).toBe(200);
    expect(keys(res.json())).toEqual(['booking_confirmation', 'academy_welcome']);
  });

  it('the teacher filter and the admin list are unchanged; the classroom assistant stays 403', async () => {
    expect(keys((await t.call({ method: 'GET', url: '/messaging/templates', token: 'teacher' })).json())).toEqual(['lesson_reminder']);
    expect((await t.call({ method: 'GET', url: '/messaging/templates' })).json()).toHaveLength(9);
    expect((await t.call({ method: 'GET', url: '/messaging/templates', token: 'assistant' })).statusCode).toBe(403);
  });

  it('G: sales reads the send gate (open or not, the queue size: no message, no money)', async () => {
    const res = await t.call({ method: 'GET', url: '/messages/gate', token: 'sales' });
    expect([res.statusCode, res.json()]).toEqual([200, GATE]);
  });

  it('health, submit, the starter flag, retry, sent-manually and hand-off stay admin only', async () => {
    for (const [method, url] of [
      ['POST', '/messaging/templates/health'],
      ['POST', '/messaging/templates/follow_up_slots/submit'],
      ['PATCH', '/messaging/templates/follow_up_slots/starter'],
      ['POST', `/messages/${ID}/retry`],
      ['POST', `/messages/${ID}/sent-manually`],
      ['POST', `/messages/${ID}/hand-off`],
    ] as const) {
      expect([url, (await t.call({ method, url, token: 'sales' })).statusCode]).toEqual([url, 403]);
    }
    expect(t.messages.requeue).not.toHaveBeenCalled();
    expect(t.templates.update).not.toHaveBeenCalled();
  });
});
