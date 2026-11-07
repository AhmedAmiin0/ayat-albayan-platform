import { Injectable } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { storageEnv } from '@/config/env/env.storage';
import { GoogleConnection } from '@/modules/platform/google-sync';
import { BackupStateRepo } from '@/modules/platform/drive-backup/db/backup-state.repo';
import { type BackupStatusView, lastArchive, lowQuota, quotaView } from './backup-view';

/** The status line: settings and readiness, the last archive, the last error, Drive's quota. */
@Injectable()
export class BackupStatusService {
  constructor(
    private readonly state: BackupStateRepo,
    private readonly connection: GoogleConnection,
  ) {}

  async view(): Promise<BackupStatusView> {
    const cfg = storageEnv(loadEnv());
    const [s, token] = await Promise.all([this.state.read(), this.connection.refreshToken()]);
    const recent = s.folder_id ? await this.state.recent(s.folder_id) : [];
    const quota = quotaView(s);
    return {
      enabled: cfg.driveBackup,
      ready: { minio: cfg.minio !== null, google: token !== null },
      last: lastArchive(recent),
      last_run_at: s.last_run_at,
      last_error: s.last_error,
      quota,
      low_quota: lowQuota(quota),
    };
  }
}
