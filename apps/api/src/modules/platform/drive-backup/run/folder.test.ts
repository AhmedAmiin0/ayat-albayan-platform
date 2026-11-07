import { describe, expect, it } from 'vitest';
import type { BackupState } from '@/modules/platform/drive-backup/db/backup-state.repo';
import { runBackup } from './backup-run';
import { B, setup } from './backup-run.fakes';
import { ensureFolder } from './folder';

// docs/45 §5.1: the safe way to free Drive is trashing the WHOLE backup folder; the next night
// must then start a fresh complete copy (a new folder, nothing recorded as covered in it).

const EMAIL = 'academy@example.test';
const night = (day: string) => new Date(`${day}T01:00:00Z`);

function stateOf(folderId: string) {
  let s: BackupState = {
    folder_id: folderId,
    account_email: EMAIL,
    quota_limit: null,
    quota_usage: null,
    quota_at: null,
    last_run_at: null,
    last_error: null,
    skipped: [],
    skipped_count: 0,
    waiting: 0,
  };
  return {
    read: () => Promise.resolve(s),
    save: (patch: Partial<BackupState>) => {
      s = { ...s, ...patch };
      return Promise.resolve();
    },
  };
}

describe('the whole backup folder moved to the trash', () => {
  it('the next night makes a new folder and sends every object again', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    t.minio.set({ bucket: B.receipts, key: 'b.jpg', body: 'b' });
    const state = stateOf(t.folderId);
    const first = await ensureFolder(t.drive, state, EMAIL);
    expect(await runBackup(t.deps, { folderId: first, now: night('2026-11-07') })).toMatchObject({
      objects: 2,
    });
    const held = t.drive.files.get(first);
    if (held) held.trashed = true; // the owner, by hand in Drive
    const fresh = await ensureFolder(t.drive, state, EMAIL);
    expect(fresh).not.toBe(first);
    expect(await state.read()).toMatchObject({ folder_id: fresh });
    const sum = await runBackup(t.deps, { folderId: fresh, now: night('2026-11-08') });
    expect(sum).toMatchObject({ objects: 2, waiting: 0 });
  });
});
