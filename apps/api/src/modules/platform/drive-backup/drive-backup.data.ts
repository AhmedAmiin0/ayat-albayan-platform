import { Injectable } from '@nestjs/common';
import { BackupStateRepo } from './db/backup-state.repo';
import { DriveBackupRepo } from './db/drive-backup.repo';
import { DriveBackupAlerts } from './drive-backup.alerts';

/** The backup's bookkeeping and alerts in one injectable (the runner's constructor stays short). */
@Injectable()
export class DriveBackupData {
  constructor(
    readonly store: DriveBackupRepo,
    readonly state: BackupStateRepo,
    readonly alerts: DriveBackupAlerts,
  ) {}
}
