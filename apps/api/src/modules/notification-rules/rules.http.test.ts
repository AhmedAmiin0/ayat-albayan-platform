import type { NotificationsOverview } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { rulesApp } from './test-app';

type App = Awaited<ReturnType<typeof rulesApp>>;

const V1_ENTRY_KEYS = ['key', 'audience', 'channels', 'automatic', 'manual', 'essential', 'locked', 'state', 'blocker', 'templates', 'lines', 'timing'];

describe('GET /admin/notifications (docs/23 §3 phases 1 and 4)', () => {
  let t: App;
  beforeAll(async () => {
    t = await rulesApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.table.rows.clear();
    t.table.fail = false;
  });

  it('admin (settings.read) → 200: every catalogue row, with the kept line numbers', async () => {
    t.queries.lines.mockResolvedValueOnce([{ line: 'notifications', display_phone_e164: '+966500000000', verified_name: null, checked_at: '2026-10-22T08:00:00Z' }]);
    const res = await t.get('/admin/notifications');
    expect(res.statusCode).toBe(200);
    const body: NotificationsOverview = res.json();
    expect(body.entries.length).toBeGreaterThan(20);
    expect(body.lines.map((l) => l.display_phone_e164)).toEqual(['+966500000000']);
    // Today's defaults: sending off, so no WhatsApp row is on (fail-closed).
    expect(body.entries.filter((e) => e.channels.includes('whatsapp') && e.state === 'on')).toEqual([]);
  });

  it('untagged → exactly the frozen v1 keys: no rule, approval, mode or reach', async () => {
    const body: NotificationsOverview = (await t.get('/admin/notifications')).json();
    expect(Object.keys(body).sort()).toEqual(['entries', 'lines']);
    for (const e of body.entries) expect(Object.keys(e)).toEqual(V1_ENTRY_KEYS);
    expect(t.queries.reach).not.toHaveBeenCalled();
  });

  it('a malformed X-AB-Client header reads as untagged (v1)', async () => {
    const body: NotificationsOverview = (await t.get('/admin/notifications', { client: 'not a tag' })).json();
    expect(body.mode).toBeUndefined();
  });

  it('tagged (X-AB-Client) → v2: rule, approval, mode and reach', async () => {
    const body: NotificationsOverview = (await t.get('/admin/notifications', { client: 'web/test' })).json();
    expect(body).toMatchObject({ mode: 'legacy', reach: { guardian: 2, teacher: 1, lead: 4 } });
    const reminder = body.entries.find((e) => e.key === 'lesson_reminder');
    expect(reminder?.rule).toMatchObject({ key: 'lesson_reminder', enabled: true, timing: { minutes_before: 60 }, editable: true, updated_at: null });
    expect(reminder?.approval).toBe('none');
  });

  it('LiveKit not configured: lesson_join_link is classroom_off in v2, row_off in v1', async () => {
    t.queries.classroom.mockReturnValue(false);
    t.gate.state.mockResolvedValue({ open: true, reason: null });
    Object.assign(t.state, { messaging_enabled: true, auto_messages_enabled: true });
    try {
      const v2: NotificationsOverview = (await t.get('/admin/notifications', { client: 'web/test' })).json();
      const v1: NotificationsOverview = (await t.get('/admin/notifications')).json();
      expect(v2.entries.find((e) => e.key === 'lesson_join_link')?.blocker).toBe('classroom_off');
      expect(v1.entries.find((e) => e.key === 'lesson_join_link')?.blocker).toBe('row_off');
    } finally {
      t.queries.classroom.mockReturnValue(true);
      t.gate.state.mockResolvedValue({ open: false, reason: 'switch_off' });
      Object.assign(t.state, { messaging_enabled: false, auto_messages_enabled: false });
    }
  });

  it('fail closed: the rules unread → every row but the locked one off, never a 500', async () => {
    t.table.fail = true;
    const res = await t.get('/admin/notifications', { client: 'web/test' });
    expect(res.statusCode).toBe(200);
    const body: NotificationsOverview = res.json();
    expect(body.entries.filter((e) => e.state === 'on').map((e) => e.key)).toEqual(['reminder_failed']);
    expect(body.entries.find((e) => e.key === 'new_lead')?.blocker).toBe('row_off');
  });

  it('module mode: the row decides; the v1 timing comes from the effective rules', async () => {
    t.state.comms_source = 'module';
    t.table.rows.set('lesson_reminder', { key: 'lesson_reminder', enabled: true, channels: null, timing: { minutes_before: 30 }, number_id: null, updated_at: '2026-10-24T00:00:00Z', updated_by: null });
    try {
      const v1: NotificationsOverview = (await t.get('/admin/notifications')).json();
      const timing = (k: string) => v1.entries.find((e) => e.key === k)?.timing?.value;
      expect([timing('lesson_reminder'), timing('lesson_join_link'), timing('teacher_lesson_reminder')]).toEqual(['30', '30', '30']);
    } finally {
      t.state.comms_source = 'legacy';
    }
  });

  it('teacher and sales → 403 and nothing is read', async () => {
    t.queries.templates.mockClear();
    for (const token of ['teacher', 'sales']) expect((await t.get('/admin/notifications', { token })).statusCode).toBe(403);
    expect(t.queries.templates).not.toHaveBeenCalled();
  });

  it('no token → 401; PATCH without a key → 404', async () => {
    const anon = await t.app.inject({ method: 'GET', url: '/admin/notifications' });
    expect(anon.statusCode).toBe(401);
    const patch = await t.app.inject({ method: 'PATCH', url: '/admin/notifications', headers: { authorization: 'Bearer admin' } });
    expect(patch.statusCode).toBe(404);
  });
});
