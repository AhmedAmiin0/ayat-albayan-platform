import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { DriveBackupStatus } from './DriveBackupStatus';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const b = t.integrations.driveBackup;
const GB = 1024 ** 3;
const answer = {
  enabled: true,
  ready: { minio: true, google: true },
  last: { kind: 'full', label: '2026-W45', objects: 3, bytes_raw: 2 * GB, bytes_compressed: GB },
  last_error: null,
  quota: { limit: 15 * GB, free: GB, usage: 14 * GB, at: '2026-11-07T01:00:00Z' },
  low_quota: true,
  last_run_at: '2026-11-07T01:00:00Z',
};

afterEach(() => apiFetch.mockReset());

describe('<DriveBackupStatus> under «التخزين»', () => {
  it('reads GET /settings/integrations/storage-backup and warns under 2 GB free', async () => {
    apiFetch.mockResolvedValue(answer);
    renderWithClient(<DriveBackupStatus />);
    expect((await screen.findByRole('alert')).textContent).toContain(b.lowQuota);
    expect(screen.getByText(b.note)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/settings/integrations/storage-backup');
  });

  it('a failed read says so', async () => {
    apiFetch.mockRejectedValue(new Error('network'));
    renderWithClient(<DriveBackupStatus />);
    expect((await screen.findByRole('alert')).textContent).toContain(b.loadError);
  });
});
