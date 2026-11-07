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
import { budgetOf, DriveFull, freeOf, gbText, isLow } from './run/quota';
import { DriveBackupData } from './drive-backup.data';

export type RunOutcome = 'off' | 'not_connected' | 'ran' | 'failed';

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

  async runOnce(input: { now?: Date; signal?: AbortSignal } = {}): Promise<RunOutcome> {
    const now = input.now ?? new Date();
    const cfg = this.factory.config();
    const minio = cfg.driveBackup ? cfg.minio : null;
    if (!minio) return 'off';
    const drive = await this.connect();
    if (!drive) return 'not_connected';
    const { api, token } = drive;
    return this.run({ api, cfg, minio, now, signal: input.signal }).then(
      () => 'ran' as const,
      (e: unknown) => this.failed({ e, now, token }).then(() => 'failed' as const),
    );
  }

  /** Drive on the connection's token now (kept: a failure checks it is still the current one). */
  private async connect(): Promise<{ api: DriveBackupApi; token: string } | null> {
    const token = await this.connection.refreshToken();
    const api = token ? this.factory.drive(token) : null;
    return api && token ? { api, token } : null;
  }

  /**
   * The night's byte budget: Drive's free space minus the reserve (2 GB, the low-quota line): no
   * run under it, and never more than that budget raw (each part checks Drive again: room.ts).
   */
  private async budget(api: DriveBackupApi, now: Date) {
    const quota = await api.quota();
    const free = freeOf(quota);
    const at = { quota_limit: quota.limit, quota_usage: quota.usage, quota_at: now.toISOString() };
    await this.data.state.save(at);
    if (isLow(free)) await this.data.alerts.lowQuota({ free: gbText(free ?? 0), now });
    const budget = budgetOf(free);
    if (budget <= 0) throw new DriveFull();
    return { budget, email: quota.email };
  }

  private async run(input: RunInput) {
    const { api, cfg, now } = input;
    const { budget, email } = await this.budget(api, now);
    const folderId = await ensureFolder(api, this.data.state, email);
    const source = this.factory.source(input.minio, input.signal);
    const deps = {
      store: this.data.store,
      api,
      source,
      buckets: bucketsOf(cfg),
      caps: { ...DEFAULT_CAPS, run: Math.min(DEFAULT_CAPS.run, budget) },
      ...(input.signal && { signal: input.signal }),
    };
    const sum = await runBackup(deps, { folderId, now });
    await this.data.state.save({ last_run_at: now.toISOString(), last_error: null });
    if (sum.skipped > 0) await this.data.alerts.skipped({ count: sum.skipped, now });
    this.log.log(summaryLine(sum));
  }

  private async failed(input: { e: unknown; now: Date; token: string }): Promise<void> {
    const { e, now } = input;
    const error = errorText(e);
    this.log.warn(`drive backup failed: ${error}`);
    const held = await this.connection.refreshToken().catch(() => null);
    const current = held === input.token;
    await (current ? this.onError[classify(e)] : this.onError.fatal)();
    await this.data.state.save({ last_run_at: now.toISOString(), last_error: error });
    await this.data.alerts.failed({ error, now });
  }
}

const summaryLine = (s: RunSummary): string =>
  `drive backup ${s.kind} ${s.label}: ${s.parts} part(s), ${s.objects} object(s), ` +
  `${s.rawBytes} → ${s.compressedBytes} bytes, ${s.skipped} skipped, ${s.left} left`;
