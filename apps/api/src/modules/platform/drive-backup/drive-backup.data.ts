import { Inject, Injectable } from '@nestjs/common';
import { BackupStateRepo } from './db/backup-state.repo';
import { DriveBackupRepo } from './db/drive-backup.repo';
import { DriveBackupAlerts } from './drive-backup.alerts';

/** The backup's bookkeeping and alerts in one injectable (the runner's constructor stays short). */
@Injectable()
export class DriveBackupData {
  // @Inject(Class): the classes are values here (DI), not only types (docs/31b §3.2).
  constructor(
    @Inject(DriveBackupRepo) readonly store: DriveBackupRepo,
    @Inject(BackupStateRepo) readonly state: BackupStateRepo,
    @Inject(DriveBackupAlerts) readonly alerts: DriveBackupAlerts,
  ) {}
}
