import type { Json } from '@ab/db';
import { bundleText, REGISTRY_VERSION, seedPayload } from '@ab/shared';
import arBundle from '@ab/shared/i18n/ar.json';
import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { ConfigStore } from '@/common/configuration/config-store/store/config-store.service';
import { BackgroundJob } from '@/config/role/background-job';

/** Just after boot, not during it: booting touches no network (jobs.wiring test). */
export const SEED_DELAY_MS = 1_000;

/** What config_seed answered: applied/failed, or skipped ('locked' | 'older_build'). */
interface SeedOutcome {
  applied?: number;
  failed?: string[];
  skipped?: string;
  stored?: number;
}

type SeedLog = Pick<Logger, 'log' | 'warn' | 'error'>;

const asOutcome = (data: unknown): SeedOutcome =>
  data !== null && typeof data === 'object' && !Array.isArray(data) ? (data as SeedOutcome) : {};

/** One log line per run: skipped (and why), or applied with the failed keys (a warning when any). */
function report(out: SeedOutcome, log: SeedLog): void {
  if (out.skipped !== undefined) {
    const stored = out.stored === undefined ? '' : ` (stored registry ${out.stored})`;
    log.log(`config seed skipped: ${out.skipped}${stored}`);
    return;
  }
  const failed = out.failed ?? [];
  if (failed.length > 0) log.warn(`config seed applied ${out.applied ?? 0}, failed: ${failed.join(', ')}`);
  else log.log(`config seed applied ${out.applied ?? 0}, failed none`);
}

/**
 * One config_seed call (docs/26 §2b): SEED_ENTRIES' metadata, with the BUNDLED Arabic hint (ar.json,
 * never the overrides) as description_seed, and REGISTRY_VERSION. It carries no value: the RPC never
 * writes one. Never throws: a failure is logged and answered null, so it can never block boot.
 */
export async function runConfigSeed(db: Db, log: SeedLog = new Logger('ConfigSeeder')): Promise<SeedOutcome | null> {
  try {
    const entries = seedPayload(bundleText(arBundle)) as unknown as Json;
    const { data, error } = await db.rpc('config_seed', { entries, registry_version: REGISTRY_VERSION });
    if (error) throw new Error(error.message);
    const out = asOutcome(data);
    report(out, log);
    return out;
  } catch (e) {
    log.error(`config seed failed: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/** Seeds the settings metadata once per boot (shortly after it), then drops the store's cache. */
@BackgroundJob({ name: 'config-seed' })
@Injectable()
export class ConfigSeeder implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(ConfigSeeder.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly store: ConfigStore,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setTimeout(() => void this.run(), SEED_DELAY_MS).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  async run(): Promise<SeedOutcome | null> {
    const out = await runConfigSeed(this.db, this.log);
    if (out?.applied) this.store.invalidate();
    return out;
  }
}
