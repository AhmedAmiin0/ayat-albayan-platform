import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { DriveBackupStatus } from './DriveBackupStatus';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
const granted = vi.hoisted(() => new Set<string>(['settings.write']));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: (p: string) => granted.has(p) }),
}));

const b = t.integrations.driveBackup;
const GB = 1024 ** 3;
const answer = {
  enabled: true,
  ready: { minio: true, google: true },
  last: { kind: 'full', label: '2026-W45', objects: 3, bytes_raw: 2 * GB, bytes_compressed: GB },
  last_error: null,
  quota: { limit: 15 * GB, free: GB, usage: 14 * GB, at: '2026-11-07T01:00:00Z' },
  low_quota: true,
  frozen: null,
  left: null,
  last_run_at: '2026-11-07T01:00:00Z',
};

afterEach(() => {
  apiFetch.mockReset();
  granted.clear();
  granted.add('settings.write');
});

describe('<DriveBackupStatus> under «التخزين»', () => {
  it('reads GET /settings/integrations/storage-backup and warns under 2 GB free', async () => {
    apiFetch.mockResolvedValue(answer);
    renderWithClient(<DriveBackupStatus />);
    expect((await screen.findByRole('alert')).textContent).toContain(b.lowQuota);
    expect(screen.getByText(b.note)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/settings/integrations/storage-backup');
  });

  it('a frozen backup: «النسخ الاحتياطي متوقف» with its reason', async () => {
    const frozen = { since: '2026-11-03T01:00:00Z', reason: 'drive_full' };
    apiFetch.mockResolvedValue({ ...answer, low_quota: false, frozen });
    renderWithClient(<DriveBackupStatus />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(b.frozenReasons.drive_full);
    expect(alert.textContent).toContain('2026-11-03');
  });

  it('a failed read says so', async () => {
    apiFetch.mockRejectedValue(new Error('network'));
    renderWithClient(<DriveBackupStatus />);
    expect((await screen.findByRole('alert')).textContent).toContain(b.loadError);
  });

  it('a user the API would refuse: no row, no request, no false load error', () => {
    granted.clear();
    apiFetch.mockRejectedValue(new Error('403'));
    renderWithClient(<DriveBackupStatus />);
    expect(screen.queryByRole('region', { name: b.title })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
