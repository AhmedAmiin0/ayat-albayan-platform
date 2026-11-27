import { describe, expect, it } from 'vitest';
import { backupRoutes as routes, SKIP_WHYS } from '..';
import { aBackupView } from './backup-status.fixtures';

describe('backupRoutes', () => {
  it('keeps the path of today, for settings writers, under the settings tag', () => {
    expect(`${routes.status.method} ${routes.status.path}`).toBe(
      'GET /settings/integrations/storage-backup',
    );
    expect(routes.status.permissions).toEqual(['settings.write']);
    expect(routes.status.tags).toEqual(['settings']);
  });

  it('answers the status line in its data envelope', () => {
    const answer = { data: aBackupView() };
    expect(routes.status.response.parse(answer)).toEqual(answer);
    const never = { data: { ...aBackupView(), last: null, quota: null } };
    expect(routes.status.response.parse(never)).toEqual(never);
  });

  it('names every reason an object is skipped', () => {
    expect(SKIP_WHYS).toEqual(['too_large', 'read_failed', 'changed', 'upload_failed']);
    const item = { id: 'a/b', size: 1, reason: 'lost' };
    const view = { ...aBackupView(), skipped: { count: 1, items: [item] } };
    expect(routes.status.response.safeParse({ data: view }).success).toBe(false);
  });

  it('refuses a time without offset, a negative count or a day that is not a date', () => {
    const base = aBackupView();
    const bad = [
      { ...base, last_run_at: '2026-11-26 23:00' },
      { ...base, waiting: -1 },
      { ...base, skipped: { count: -1, items: [] } },
      { ...base, last: base.last && { ...base.last, label: 'yesterday' } },
      { ...base, last: base.last && { ...base.last, objects: 1.5 } },
    ];
    for (const view of bad) {
      expect(routes.status.response.safeParse({ data: view }).success).toBe(false);
    }
  });
});
