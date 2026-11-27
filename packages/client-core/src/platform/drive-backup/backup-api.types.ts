import type { BackupStatusView } from '@ab/shared';

export interface BackupCalls {
  status: () => Promise<{ data: BackupStatusView }>;
}
