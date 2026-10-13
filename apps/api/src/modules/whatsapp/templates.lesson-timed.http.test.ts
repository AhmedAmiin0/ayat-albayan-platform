import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { whatsappApp } from './test-app';
import { templateRow } from './whatsapp.fakes';
import type { TemplateRow } from './whatsapp.types';

// Owner 2026-10-13 («just don't list them, don't disable them»): restricted roles saw «تأكيد الحجز» and
// «تذكير حلقة اليوم» in their picker because an admin had ticked «متاح للمعلمين والمبيعات» on them. A
// booking confirmation or lesson reminder (isLessonTimed) is never listed for them, whatever the flag.

type App = Awaited<ReturnType<typeof whatsappApp>>;
const keys = (rows: { key: string }[]) => rows.map((r) => r.key);
const flagged = (key: string) => templateRow({ key, meta_name: key, sales_starter: true });
const INVITE = templateRow({ key: 'free_trial_invite', meta_name: 'free_trial_invite', line: 'chat', sales_starter: true });
const ROWS = [flagged('booking_confirmation_plain'), flagged('lesson_reminder'), flagged('lesson_reminder_meet'), INVITE];
const starter = (key: string, on: boolean) =>
  ({ method: 'PATCH' as const, url: `/messaging/templates/${key}/starter`, body: { sales_starter: on } });

describe('lesson-timed templates and the restricted allow-list', () => {
  let t: App;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.templates.all.mockResolvedValue(ROWS);
    t.templates.update.mockImplementation(async (key: string, patch: Partial<TemplateRow>) => ({ ...templateRow({ key }), ...patch }));
  });
  const list = async (token: string) => keys((await t.call({ method: 'GET', url: '/messaging/templates', token })).json());

  it.each(['sales', 'teacher'])('%s does not list a flagged booking_confirmation_plain or lesson_reminder', async (token) => {
    expect(await list(token)).toEqual(['free_trial_invite']);
  });

  it('the admin still lists every one of them', async () => {
    expect(await list('admin')).toEqual(keys(ROWS));
  });

  it('PATCH on for a lesson-timed key: 400 template_not_offerable, nothing written or audited', async () => {
    for (const key of ['booking_confirmation_plain', 'lesson_reminder', 'teacher_lesson_reminder']) {
      t.templates.get.mockResolvedValue(templateRow({ key }));
      const res = await t.call(starter(key, true));
      expect([key, res.statusCode, res.json().code]).toEqual([key, 400, 'template_not_offerable']);
    }
    expect(t.templates.update).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('PATCH off for a flagged lesson reminder: 200, the flag cleared and audited', async () => {
    t.templates.get.mockResolvedValue(flagged('lesson_reminder'));
    const res = await t.call(starter('lesson_reminder', false));
    expect([res.statusCode, res.json().sales_starter]).toEqual([200, false]);
    expect(t.templates.update).toHaveBeenCalledWith('lesson_reminder', { sales_starter: false });
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'template_starter_set' }));
  });

  it('PATCH on for an offerable row not approved yet: 200 (the admin may tick ahead of approval)', async () => {
    t.templates.get.mockResolvedValue(templateRow({ key: 'renewal_due', status: 'pending' }));
    const res = await t.call(starter('renewal_due', true));
    expect([res.statusCode, res.json().sales_starter]).toEqual([200, true]);
  });
});
