import type { NotificationsOverview } from '@ab/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rulesApp } from './test-app';

type App = Awaited<ReturnType<typeof rulesApp>>;

describe('GET /admin/notifications (docs/23 §3 phase 1)', () => {
  let t: App;
  beforeAll(async () => {
    t = await rulesApp();
  });
  afterAll(() => t.app.close());

  it('admin (settings.read) → 200: every catalogue row, with the kept line numbers', async () => {
    t.queries.lines.mockResolvedValueOnce([{ line: 'notifications', display_phone_e164: '+966551234567', verified_name: null, checked_at: '2026-10-22T08:00:00Z' }]);
    const res = await t.get('/admin/notifications');
    expect(res.statusCode).toBe(200);
    const body: NotificationsOverview = res.json();
    expect(body.entries.length).toBeGreaterThan(20);
    expect(body.lines.map((l) => l.display_phone_e164)).toEqual(['+966551234567']);
    // Today's defaults: sending off, so no WhatsApp row is on (fail-closed).
    expect(body.entries.filter((e) => e.channels.includes('whatsapp') && e.state === 'on')).toEqual([]);
  });

  it('teacher and sales → 403 and nothing is read', async () => {
    t.queries.templates.mockClear();
    for (const token of ['teacher', 'sales']) expect((await t.get('/admin/notifications', token)).statusCode).toBe(403);
    expect(t.queries.templates).not.toHaveBeenCalled();
  });

  it('no token → 401; read-only (no PATCH yet)', async () => {
    const anon = await t.app.inject({ method: 'GET', url: '/admin/notifications' });
    expect(anon.statusCode).toBe(401);
    const patch = await t.app.inject({ method: 'PATCH', url: '/admin/notifications', headers: { authorization: 'Bearer admin' } });
    expect(patch.statusCode).toBe(404);
  });
});
