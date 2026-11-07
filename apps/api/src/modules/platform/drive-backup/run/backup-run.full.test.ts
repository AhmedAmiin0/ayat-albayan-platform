import { describe, expect, it } from 'vitest';
import { B, fit, names, setup } from './backup-run.fakes';

// docs/45 §5: a weekly full (Friday or later, UTC), parts under a size cap, a per-run byte cap,
// and retention: the last 4 fulls and the incrementals after the oldest, deleted from Drive for
// good (not its trash) only after a newer full is sealed.

const day = (base: string, plus: number): string =>
  new Date(Date.parse(`${base}T00:00:00Z`) + plus * 86_400_000).toISOString().slice(0, 10);

describe('weekly full archive', () => {
  it('Friday starts the week’s full; the days before are incrementals', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    await t.night('2026-11-07'); // Saturday W45: first full
    for (const [i, d] of ['2026-11-09', '2026-11-12', '2026-11-13'].entries()) {
      t.minio.set({ bucket: B.reports, key: `n${i}.pdf`, body: d });
      await t.night(d);
    }
    expect(names(t.drive, t.folderId)).toEqual([
      'full-2026-W45.tar.zst',
      'incr-2026-11-09.tar.zst',
      'incr-2026-11-12.tar.zst',
      'full-2026-W46.tar.zst',
    ]);
    const full = t.store.rows.find((r) => r.label === '2026-W46');
    expect(full?.objects.map((o) => o.key)).toEqual(['a.pdf', 'n0.pdf', 'n1.pdf', 'n2.pdf']);
  });

  it('keeps the last 4 fulls and the incrementals after the oldest; deletes the rest', async () => {
    const t = await setup();
    for (let week = 0; week < 6; week += 1) {
      t.minio.set({ bucket: B.reports, key: `w${week}.pdf`, body: `w${week}` });
      await t.night(day('2026-11-13', 7 * week)); // Fridays
      t.minio.set({ bucket: B.reports, key: `x${week}.pdf`, body: `x${week}` });
      await t.night(day('2026-11-14', 7 * week)); // Saturdays
    }
    const live = names(t.drive, t.folderId).filter((n) => n.startsWith('full'));
    expect(live).toEqual([
      'full-2026-W48.tar.zst',
      'full-2026-W49.tar.zst',
      'full-2026-W50.tar.zst',
      'full-2026-W51.tar.zst',
    ]);
    expect(names(t.drive, t.folderId)).not.toContain('incr-2026-11-21.tar.zst');
    expect(names(t.drive, t.folderId)).toContain('incr-2026-11-28.tar.zst');
    expect(t.store.rows.filter((r) => r.status === 'trashed')).toHaveLength(4);
    expect(t.drive.deleted).toHaveLength(4);
    expect([...t.drive.files.values()].filter((f) => f.trashed)).toHaveLength(0);
  });

  it('nothing is deleted while a newer full has not been sealed', async () => {
    const t = await setup({ part: 10, run: 10 });
    for (let week = 0; week < 4; week += 1) {
      t.minio.set({ bucket: B.reports, key: `w${week}.pdf`, body: 'x'.repeat(8) });
      await t.night(day('2026-11-13', 7 * week));
      await t.night(day('2026-11-13', 7 * week + 1));
    }
    t.minio.set({ bucket: B.reports, key: 'late.pdf', body: 'x'.repeat(8) });
    const open = await t.night(day('2026-11-13', 28)); // the 5th full needs 5 nights (run cap)
    expect(open).toMatchObject({ kind: 'full', sealed: false, trashed: 0 });
    expect(t.store.rows.filter((r) => r.status === 'trashed')).toHaveLength(0);
  });
});

describe('caps', () => {
  it('splits a large archive into parts under the part cap', async () => {
    const t = await setup({ part: fit(2), run: 1024 ** 3 });
    for (const k of ['a', 'b', 'c', 'd', 'e'])
      t.minio.set({ bucket: B.reports, key: k, body: 'x'.repeat(10) });
    const sum = await t.night('2026-11-07');
    expect(sum).toMatchObject({ parts: 3, objects: 5, sealed: true });
    expect(names(t.drive, t.folderId)).toEqual([
      'full-2026-W45.tar.zst',
      'full-2026-W45.p2.tar.zst',
      'full-2026-W45.p3.tar.zst',
    ]);
    expect(t.drive.files.get(t.store.rows[2]?.drive_file_id ?? '')?.meta.appProperties.sealed).toBe(
      '1',
    );
  });

  it('stops at the run’s byte cap; the next night continues the same full, then seals it', async () => {
    const t = await setup({ part: fit(2), run: 2 * fit(2) - 1 });
    for (const k of ['a', 'b', 'c', 'd'])
      t.minio.set({ bucket: B.reports, key: k, body: 'x'.repeat(10) });
    expect(await t.night('2026-11-07')).toMatchObject({
      kind: 'full',
      objects: 2,
      left: ['reports/c', 'reports/d'],
      sealed: false,
    });
    expect(await t.night('2026-11-08')).toMatchObject({
      kind: 'full',
      label: '2026-W45',
      objects: 2,
      sealed: true,
    });
    expect(names(t.drive, t.folderId)).toEqual([
      'full-2026-W45.tar.zst',
      'full-2026-W45.p2.tar.zst',
    ]);
  });
});
