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
import type { BackupState } from './db/backup-state.repo';
import { DEFAULT_CAPS } from './plan/parts';
import type { RunDeps } from './run/backup-store.port';
import { runBackup, type RunSummary } from './run/backup-run';
import { ensureFolder } from './run/folder';
import { isStorageFull } from './run/quota';
import { DriveBackupData } from './drive-backup.data';
import { reportNight } from './drive-backup.report';

export type RunOutcome = 'off' | 'not_connected' | 'ran' | 'failed';

/** A failed night's counts: an older night's waiting or skipped are never shown as this one's. */
const NO_COUNTS: Pick<BackupState, 'waiting' | 'skipped' | 'skipped_count'> = {
  waiting: 0,
  skipped: [],
  skipped_count: 0,
};

interface RunInput {
  api: DriveBackupApi;
  cfg: StorageEnv;
  minio: MinioEnv;
  now: Date;
  signal: AbortSignal | undefined;
}

/** Every bucket; recordings only while they are written to MinIO at all (MINIO_RECORDINGS). */
export const bucketsOf = (cfg: Pick<StorageEnv, 'recordings'>): Bucket[] =>
  Object.values(BUCKETS).filter((b) => cfg.recordings || b !== BUCKETS.recordings);

/**
 * One backup night (docs/45 §5): only with MINIO_DRIVE_BACKUP on, MinIO configured and the Google
 * account connected. Any failure is recorded on the status line and told to the admins once; a
 * refused token goes through the Google sync's own handling (disconnect + its alert), but only
 * while that token is still the connection's (a reconnect meanwhile is never undone by this run).
 */
@Injectable()
export class DriveBackupRunner {
  private readonly log = new Logger(DriveBackupRunner.name);
  private readonly onError: Record<ErrorClass, () => Promise<void>>;

  // @Inject(Class): the classes are values here (DI), not only types (docs/31b §3.2).
  constructor(
    @Inject(GoogleConnection) private readonly connection: GoogleConnection,
    @Inject(DriveBackupData) private readonly data: DriveBackupData,
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

  async runOnce(input: { now?: Date; signal?: AbortSignal } = {}): Promise<RunOutcome> {
    const now = input.now ?? new Date();
    const cfg = this.factory.config();
    const minio = cfg.driveBackup ? cfg.minio : null;
    if (!minio) return 'off';
    const drive = await this.connect(input.signal);
    if (!drive) return 'not_connected';
    const { api, token } = drive;
    return this.run({ api, cfg, minio, now, signal: input.signal }).then(
      () => 'ran' as const,
      (e: unknown) => this.failed({ e, now, token }).then(() => 'failed' as const),
    );
  }

  /** Drive on the connection's token now (kept: a failure checks it is still the current one). */
  private async connect(signal?: AbortSignal) {
    const token = await this.connection.refreshToken();
    const api = token ? this.factory.drive(token, signal) : null;
    return api && token ? { api, token } : null;
  }

  /** Drive's quota on the status line; the account's email. */
  private async quota(api: DriveBackupApi, now: Date): Promise<string> {
    const quota = await api.quota();
    const at = { quota_limit: quota.limit, quota_usage: quota.usage, quota_at: now.toISOString() };
    await this.data.state.save(at);
    return quota.email;
  }

  /** The night (run/backup-run.ts): add-only, Drive's room read again before each part. */
  private async run(input: RunInput) {
    const { api, now } = input;
    const folderId = await ensureFolder(api, this.data.state, await this.quota(api, now));
    const source = this.factory.source(input.minio, input.signal);
    const deps: RunDeps = {
      store: this.data.store,
      api,
      source,
      buckets: bucketsOf(input.cfg),
      caps: DEFAULT_CAPS,
      ...(input.signal && { signal: input.signal }),
    };
    const sum = await runBackup(deps, { folderId, now });
    await reportNight(this.data, { now, sum });
    this.log.log(summaryLine(sum));
  }

  private async failed(input: { e: unknown; now: Date; token: string }): Promise<void> {
    const { e, now } = input;
    const error = errorText(e);
    this.log.warn(`drive backup failed: ${error}`);
    const held = await this.connection.refreshToken().catch(() => null);
    const current = held === input.token;
    await (current ? this.onError[classify(e)] : this.onError.fatal)();
    await this.data.state.save({ last_run_at: now.toISOString(), last_error: error, ...NO_COUNTS });
    await (isStorageFull(e)
      ? this.data.alerts.driveFull({ now })
      : this.data.alerts.failed({ error, now }));
  }
}

const summaryLine = (s: RunSummary): string =>
  `drive backup add ${s.label}: ${s.parts} part(s), ${s.objects} object(s), ` +
  `${s.rawBytes} → ${s.compressedBytes} bytes, ${s.skipped.length} skipped, ` +
  `${s.waiting} waiting for room`;
