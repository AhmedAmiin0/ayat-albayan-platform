import { backupRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { BackupCalls } from './backup-api.types';

/** The Drive backup's status line (docs/45 §5), on one api client. */
export function backupCalls(client: ApiClient): BackupCalls {
  const call = callWith(client);
  return {
    status: () => call({ route: backupRoutes.status }),
  };
}
