import { Module } from '@nestjs/common';
import { googleEnv, loadEnv } from '@/config/env/env';
import { storageEnv } from '@/config/env/env.storage';
import { GoogleSyncModule, oauthClient } from '@/modules/platform/google-sync';
import { BackupStatusController } from './admin/backup-status.controller';
import { BackupStatusService } from './admin/backup-status.service';
import { ArchiveObjectsRepo } from './db/archive-objects.repo';
import { BackupStateRepo } from './db/backup-state.repo';
import { DriveBackupRepo } from './db/drive-backup.repo';
import { DRIVE_BACKUP_FACTORY, type DriveBackupFactory } from './drive/drive-backup.port';
import { DriveBackupHttp } from './drive/drive-backup.http';
import { DriveBackupAlerts } from './drive-backup.alerts';
import { DriveBackupData } from './drive-backup.data';
import { DriveBackupJob } from './drive-backup.job';
import { DriveBackupRunner } from './drive-backup.runner';
import { MinioSource } from './source/minio-source';

/** The real adapters: the Google env is read at call time (a client saved in «التكاملات»). */
export const httpBackupFactory: DriveBackupFactory = {
  drive: (refreshToken, signal) => {
    const env = googleEnv(loadEnv());
    if (!env) return null;
    const auth = oauthClient(env);
    auth.setCredentials({ refresh_token: refreshToken });
    return new DriveBackupHttp(auth, env.endpoints, signal);
  },
  source: (minio, signal) => new MinioSource(minio, signal),
  config: () => storageEnv(loadEnv()),
};

/** Compressed MinIO archives to Google Drive on the academy's connection (docs/45 §5). */
@Module({
  imports: [GoogleSyncModule],
  controllers: [BackupStatusController],
  providers: [
    { provide: DRIVE_BACKUP_FACTORY, useValue: httpBackupFactory },
    ArchiveObjectsRepo,
    DriveBackupRepo,
    BackupStateRepo,
    DriveBackupAlerts,
    DriveBackupData,
    DriveBackupRunner,
    DriveBackupJob,
    BackupStatusService,
  ],
})
export class DriveBackupModule {}
