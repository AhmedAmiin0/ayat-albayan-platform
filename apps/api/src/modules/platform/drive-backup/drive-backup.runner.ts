import { Inject, Injectable, Logger } from '@nestjs/common';
import { BUCKETS, type Bucket } from '@/common/storage/storage.paths';
import type { MinioEnv, StorageEnv } from '@/config/env/env.storage';
import {
  classify,
  errorText,
  GoogleConnection,
  type ErrorClass,
} from '@/modules/platform/google-sync';
import {
  DRIVE_BACKUP_FACTORY,
  type DriveBackupApi,
  type DriveBackupFactory,
} from './drive/drive-backup.port';
import { DEFAULT_CAPS } from './plan/parts';
import { runBackup, type RunSummary } from './run/backup-run';
import { ensureFolder } from './run/folder';
import { DriveFull, freeOf, gbText, isFull, isLow } from './run/quota';
import { DriveBackupData } from './drive-backup.data';

export type RunOutcome = 'off' | 'not_connected' | 'ran' | 'failed';

/** Every bucket; recordings only while they are written to MinIO at all (MINIO_RECORDINGS). */
export const bucketsOf = (cfg: Pick<StorageEnv, 'recordings'>): Bucket[] =>
  Object.values(BUCKETS).filter((b) => cfg.recordings || b !== BUCKETS.recordings);

/**
 * One backup night (docs/45 §5): only with MINIO_DRIVE_BACKUP on, MinIO configured and the Google
 * account connected. Any failure is recorded on the status line and told to the admins once; a
 * refused token goes through the Google sync's own handling (disconnect + its alert).
 */
@Injectable()
export class DriveBackupRunner {
  private readonly log = new Logger(DriveBackupRunner.name);
  private readonly onError: Record<ErrorClass, () => Promise<void>>;

  constructor(
    private readonly connection: GoogleConnection,
    private readonly data: DriveBackupData,
    @Inject(DRIVE_BACKUP_FACTORY) private readonly factory: DriveBackupFactory,
  ) {
    const none = () => Promise.resolve();
    this.onError = {
      auth: () => connection.authFailed(),
      config: () => connection.configFailed(),
      retry: none,
      fatal: none,
    };
  }

  async runOnce(now = new Date()): Promise<RunOutcome> {
    const cfg = this.factory.config();
    const minio = cfg.driveBackup ? cfg.minio : null;
    if (!minio) return 'off';
    const token = await this.connection.refreshToken();
    const api = token ? this.factory.drive(token) : null;
    if (!api) return 'not_connected';
    return this.run({ api, cfg, minio, now }).then(
      () => 'ran' as const,
      (e: unknown) => this.failed(e, now).then(() => 'failed' as const),
    );
  }

  private async run(input: { api: DriveBackupApi; cfg: StorageEnv; minio: MinioEnv; now: Date }) {
    const { api, cfg, now } = input;
    const quota = await api.quota();
    const free = freeOf(quota);
    const quotaAt = {
      quota_limit: quota.limit,
      quota_usage: quota.usage,
      quota_at: now.toISOString(),
    };
    await this.data.state.save(quotaAt);
    if (isFull(free)) throw new DriveFull();
    if (isLow(free)) await this.data.alerts.lowQuota({ free: gbText(free ?? 0), now });
    const folderId = await ensureFolder(api, this.data.state, quota.email);
    const source = this.factory.source(input.minio);
    const deps = {
      store: this.data.store,
      api,
      source,
      buckets: bucketsOf(cfg),
      caps: DEFAULT_CAPS,
    };
    const sum = await runBackup(deps, { folderId, now });
    await this.data.state.save({ last_run_at: now.toISOString(), last_error: null });
    if (sum.skipped > 0) await this.data.alerts.skipped({ count: sum.skipped, now });
    this.log.log(summaryLine(sum));
  }

  private async failed(e: unknown, now: Date): Promise<void> {
    const error = errorText(e);
    this.log.warn(`drive backup failed: ${error}`);
    await this.onError[classify(e)]();
    await this.data.state.save({ last_run_at: now.toISOString(), last_error: error });
    await this.data.alerts.failed({ error, now });
  }
}

const summaryLine = (s: RunSummary): string =>
  `drive backup ${s.kind} ${s.label}: ${s.parts} part(s), ${s.objects} object(s), ` +
  `${s.rawBytes} → ${s.compressedBytes} bytes, ${s.skipped} skipped, ${s.left} left`;
