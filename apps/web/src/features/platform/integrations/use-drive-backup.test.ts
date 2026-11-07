import { counted } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { backupLines, bytesText, frozenLine, type DriveBackupView } from './use-drive-backup';

const b = t.integrations.driveBackup;
const GB = 1024 ** 3;

const view = (over: Partial<DriveBackupView> = {}): DriveBackupView => ({
  enabled: true,
  ready: { minio: true, google: true },
  last: { kind: 'incr', label: '2026-11-07', objects: 12, bytes_raw: 3 * GB, bytes_compressed: GB },
  last_error: null,
  quota: { limit: 15 * GB, free: 9 * GB },
  low_quota: false,
  frozen: null,
  left: null,
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
    const last = { kind: 'full' as const, label: '2026-W45', objects, ...sizes };
    expect(backupLines(view({ last }))[0]).toContain(`(${counted(b.files, objects)})`);
  });

  it('a frozen backup says so, since when and why; none while it moves', () => {
    const frozen = { since: '2026-11-03T01:00:00Z', reason: 'too_large' as const };
    const line = frozenLine(view({ frozen }));
    expect(line).toBe(
      b.frozen.replace('{since}', '2026-11-03').replace('{reason}', b.frozenReasons.too_large),
    );
    expect(frozenLine(view())).toBeNull();
  });

  it('objects left for later nights: the count and the oldest, with its day', () => {
    const left = { count: 3, key: 'recordings/r.mp4', since: '2026-11-05T01:00:00Z' };
    const line = backupLines(view({ left }))[1];
    expect(line).toContain(counted(b.files, 3));
    expect(line).toContain('recordings/r.mp4');
    expect(line).toContain('2026-11-05');
    expect(backupLines(view()).some((l) => l.includes('recordings/'))).toBe(false);
  });
});
