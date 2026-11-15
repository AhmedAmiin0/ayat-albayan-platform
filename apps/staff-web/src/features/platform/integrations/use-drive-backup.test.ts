import { counted } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import {
  backupLines,
  bytesText,
  skippedLines,
  waitingLine,
  type DriveBackupView,
} from './use-drive-backup';

const b = t.integrations.driveBackup;
const GB = 1024 ** 3;

const view = (over: Partial<DriveBackupView> = {}): DriveBackupView => ({
  enabled: true,
  ready: { minio: true, google: true },
  last: { label: '2026-11-07', objects: 12, bytes_raw: 3 * GB, bytes_compressed: GB },
  last_error: null,
  quota: { limit: 15 * GB, free: 9 * GB },
  low_quota: false,
  skipped: { count: 0, items: [] },
  waiting: 0,
  ...over,
});

describe('the Drive backup status line (docs/45 §5)', () => {
  it('sizes: one decimal over a gigabyte, whole megabytes below', () => {
    expect(bytesText(1.45 * GB)).toBe(b.sizeGb.replace('{n}', '1.4'));
    expect(bytesText(5 * 1024 * 1024)).toBe(b.sizeMb.replace('{n}', '5'));
  });

  it('on and ready: the last archive raw → compressed, the quota, the note', () => {
    const lines = backupLines(view());
    expect(lines[0]).toContain(bytesText(3 * GB));
    expect(lines[0]).toContain(bytesText(GB));
    expect(lines[0]).toContain('2026-11-07');
    expect(lines).toContain(b.note);
    expect(lines.some((l) => l.includes(bytesText(9 * GB)))).toBe(true);
  });

  it.each([
    [{ enabled: false }, b.off],
    [{ ready: { minio: false, google: true } }, b.needsMinio],
    [{ ready: { minio: true, google: false } }, b.needsGoogle],
  ])('says why it does not run: %o', (over, text) => {
    expect(backupLines(view(over))[0]).toBe(text);
  });

  it('no archive yet, an error, an unlimited Drive', () => {
    const lines = backupLines(
      view({
        last: null,
        last_error: '403 storageQuotaExceeded',
        quota: { limit: null, free: null },
      }),
    );
    expect(lines).toContain(b.none);
    expect(lines).toContain(b.error.replace('{error}', '403 storageQuotaExceeded'));
    expect(lines).toContain(b.quotaUnlimited);
  });

  it.each([1, 2, 5, 12, 100])('the file count in Arabic count forms: %i', (objects) => {
    const sizes = { bytes_raw: GB, bytes_compressed: GB };
    const last = { label: '2026-11-07', objects, ...sizes };
    expect(backupLines(view({ last }))[0]).toContain(`(${counted(b.files, objects)})`);
  });

  it('skipped objects: counted, then each named with its size and why', () => {
    const items = [{ id: 'recordings/r.mp4', size: 2 * GB, reason: 'too_large' as const }];
    const lines = skippedLines(view({ skipped: { count: 3, items } }));
    expect(lines[0]).toBe(counted(b.skipped, 3));
    expect(lines[1]).toBe(
      b.skippedItem
        .replace('{name}', 'recordings/r.mp4')
        .replace('{size}', bytesText(2 * GB))
        .replace('{why}', b.skipReasons.too_large),
    );
    expect(skippedLines(view())).toEqual([]);
  });

  it('objects waiting for room on Drive: counted; none: no line', () => {
    expect(waitingLine(view({ waiting: 4 }))).toBe(counted(b.waiting, 4));
    expect(waitingLine(view())).toBeNull();
  });
});
