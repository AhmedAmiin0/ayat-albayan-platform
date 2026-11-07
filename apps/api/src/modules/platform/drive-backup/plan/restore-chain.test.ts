import { describe, expect, it } from 'vitest';
import type { BackupFile } from '@/modules/platform/drive-backup/drive/drive-backup.port';
import { restoreChain } from './restore-chain';

let seq = 0;
const file = (props: Record<string, string>): BackupFile => {
  seq += 1;
  const createdTime = new Date(Date.UTC(2026, 10, 1) + seq * 1000).toISOString();
  return {
    id: `f${seq}`,
    name: `${props.kind}-${props.label}.p${props.part}`,
    size: 1,
    createdTime,
    appProperties: { ab_backup: 'minio', ...props },
  };
};

describe('restoreChain', () => {
  it('the newest sealed full by `to`, its parts last-first, after the newer incrementals', () => {
    const f1 = file({ kind: 'full', label: '2026-W44', part: '1', day: '2026-10-30', sealed: '1' });
    const i1 = file({ kind: 'incr', label: '2026-10-31', part: '1', day: '2026-10-31' });
    const p1 = file({ kind: 'full', label: '2026-W45', part: '1', day: '2026-11-06' });
    const p2 = file({ kind: 'full', label: '2026-W45', part: '2', day: '2026-11-07', sealed: '1' });
    const i2 = file({ kind: 'incr', label: '2026-11-08', part: '1', day: '2026-11-08' });
    const i3 = file({ kind: 'incr', label: '2026-11-09', part: '1', day: '2026-11-09' });
    const stray = {
      ...file({ kind: 'incr', label: 'x', part: '1', day: '2026-11-08' }),
      appProperties: {},
    };
    const all = [f1, i1, p1, p2, i2, i3, stray];
    expect(restoreChain(all, '2026-11-08').map((f) => f.id)).toEqual([i2.id, p2.id, p1.id]);
    expect(restoreChain(all, '2026-11-06').map((f) => f.id)).toEqual([i1.id, f1.id]);
  });
});
