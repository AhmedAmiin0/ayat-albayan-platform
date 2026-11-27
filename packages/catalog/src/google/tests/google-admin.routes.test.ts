import { describe, expect, it } from 'vitest';
import { googleAdminRoutes as routes } from '..';
import { anItem, aStatus } from './google-views.fixtures';

describe('googleAdminRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /admin/google/status',
      'GET /admin/google/connect',
      'POST /admin/google/disconnect',
      'PUT /admin/google/settings',
      'POST /admin/google/discover',
      'PUT /admin/google/drive',
      'GET /admin/google/items',
      'POST /admin/google/items/:id/retry',
      'POST /admin/google/reconcile',
    ]);
  });

  it('lets settings readers see the status and the log, and writers change the rest', () => {
    const reads = [routes.status, routes.items];
    for (const route of Object.values(routes)) {
      const key = reads.includes(route) ? 'settings.read' : 'settings.write';
      expect(route.permissions).toEqual([key]);
      expect(route.tags).toEqual(['google-sync']);
    }
  });

  it('answers the status view to the status and to every change of it', () => {
    const changes = [routes.disconnect, routes.settings, routes.discover, routes.drive];
    for (const route of [routes.status, ...changes]) {
      expect(route.response.parse(aStatus())).toEqual(aStatus());
    }
  });

  it('refuses a status without a count for every state or with an unknown mode', () => {
    const { pending: _, ...counts } = aStatus().counts;
    expect(routes.status.response.safeParse({ ...aStatus(), counts }).success).toBe(false);
    const settings = { ...aStatus().settings, mode: 'write' };
    expect(routes.status.response.safeParse({ ...aStatus(), settings }).success).toBe(false);
  });

  it('takes the settings and drive bodies of the request schemas', () => {
    expect(routes.settings.body.parse({ enabled: true })).toEqual({ enabled: true });
    expect(routes.settings.body.safeParse({ extra: 1 }).success).toBe(false);
    expect(routes.drive.body.safeParse({ root_folder_id: 'x' }).success).toBe(false);
  });

  it('answers the consent url and the queued count', () => {
    const url = 'https://accounts.google.com/o/oauth2/auth';
    expect(routes.connect.response.parse({ url })).toEqual({ url });
    expect(routes.reconcile.response.parse({ queued: 3 })).toEqual({ queued: 3 });
    expect(routes.reconcile.response.safeParse({ queued: -1 }).success).toBe(false);
  });

  it('answers the sync log and one retried item', () => {
    expect(routes.items.response.parse([anItem()])).toEqual([anItem()]);
    expect(routes.retry.response.parse(anItem())).toEqual(anItem());
    expect(routes.retry.params.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });

  it('refuses an item with an unknown skip reason or a time without its offset', () => {
    const bad = [{ skip_reason: 'lost' }, { updated_at: '2026-11-27 10:00' }];
    for (const change of bad) {
      expect(routes.retry.response.safeParse({ ...anItem(), ...change }).success).toBe(false);
    }
  });
});
