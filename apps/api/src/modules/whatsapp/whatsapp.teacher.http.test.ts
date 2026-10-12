import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { whatsappApp } from './test-app';
import { REPORT_READY, templateRow } from './whatsapp.fakes';

type App = Awaited<ReturnType<typeof whatsappApp>>;
const ID = 'b0000000-0000-4000-8000-000000000009';
const GATE = { open: false, reason: 'switch_off', queued: 3 };

describe('WhatsApp routes in teacher mode (R-MSG-05, R-TCH-03)', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.gate.view.mockResolvedValue(GATE);
    t.templates.all.mockResolvedValue([
      templateRow(),
      templateRow({ key: 'lesson_reminder' }),
      templateRow({ key: 'lesson_reminder_meet', status: 'pending' }),
      templateRow({ key: 'lesson_reminder_plain', header_format: 'document' }),
      templateRow({ key: 'free_trial_invite', line: 'chat', sales_starter: true }),
      { ...REPORT_READY, status: 'approved' },
    ]);
  });

  // Owner 2026-10-12: the restricted allow-list replaced the reminder templates (no manual reminders).
  it('T1: a teacher lists only the allow-list, never a lesson reminder; the admin sees all', async () => {
    const teacher = await t.call({ method: 'GET', url: '/messaging/templates', token: 'teacher' });
    expect(teacher.statusCode).toBe(200);
    expect(teacher.json().map((v: { key: string }) => v.key)).toEqual(['free_trial_invite']);
    const admin = await t.call({ method: 'GET', url: '/messaging/templates' });
    expect(admin.json()).toHaveLength(6);
  });

  it('G: the send gate is readable by a teacher (the composer’s «الإرسال متوقف» note)', async () => {
    const res = await t.call({ method: 'GET', url: '/messages/gate', token: 'teacher' });
    expect([res.statusCode, res.json()]).toEqual([200, GATE]);
  });

  it('health, submit, retry, sent-manually and hand-off stay admin only', async () => {
    for (const [method, url] of [
      ['POST', '/messaging/templates/health'],
      ['POST', '/messaging/templates/lesson_reminder/submit'],
      ['POST', `/messages/${ID}/retry`],
      ['POST', `/messages/${ID}/sent-manually`],
      ['POST', `/messages/${ID}/hand-off`],
    ] as const) {
      expect((await t.call({ method, url, token: 'teacher' })).statusCode).toBe(403);
    }
    expect(t.messages.requeue).not.toHaveBeenCalled();
  });
});
