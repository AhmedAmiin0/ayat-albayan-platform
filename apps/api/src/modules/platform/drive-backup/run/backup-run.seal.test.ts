import { describe, expect, it } from 'vitest';
import { restoreChain } from '@/modules/platform/drive-backup/plan/restore-chain';
import { B, setup } from './backup-run.fakes';

// docs/45 §5.1: a full is sealed only when it holds every object that still exists.

describe('sealing a full', () => {
  it('a vanished object (deleted since the listing) does not keep the full open', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'ok.pdf', body: 'fine' });
    t.minio.set({ bucket: B.reports, key: 'gone.pdf', body: 'gone' });
    t.minio.vanish.add('reports/gone.pdf');
    expect(await t.night('2026-11-07')).toMatchObject({ skipped: 1, unread: 0, sealed: true });
  });

  it('an unreadable object keeps it open: the restore still uses the previous sealed full', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    await t.night('2026-11-07'); // full W45, sealed
    t.minio.unreadable.add('reports/a.pdf');
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a2' });
    expect(await t.night('2026-11-13')).toMatchObject({
      kind: 'full',
      label: '2026-W46',
      sealed: false,
    });
    const files = [...t.drive.files.values()].map((f) => f.meta);
    const chain = restoreChain(files, '2026-11-13').map((f) => f.name);
    expect(chain).toContain('full-2026-W45.tar.zst');
    t.minio.unreadable.clear();
    expect(await t.night('2026-11-14')).toMatchObject({
      kind: 'full',
      label: '2026-W46',
      sealed: true,
    });
  });
});
