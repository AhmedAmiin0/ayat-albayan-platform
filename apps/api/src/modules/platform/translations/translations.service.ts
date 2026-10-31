import { applyStrings, type FlatStrings, type Locale, type TranslationKeysPage, type TranslationKeysQuery } from '@ab/shared';
import { BadRequestException, Injectable, Logger, NotFoundException, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ar } from '@/common/infra/i18n/server-text';
import { kickConfigReload } from '@/config/role/worker-kick';
import { DEFAULTS, listKeys, overrideProblem, type OverrideMaps } from './translations.catalog';
import { TranslationsQueries, type OverrideRow, type OverrideWrite } from './translations.queries';
import { assertNotValuesOwned } from './values-owned';

/** Overrides saved on another API copy reach this one within this interval (or at once: kickConfigReload). */
export const REFRESH_MS = 5 * 60_000;
/** First load just after boot, not during it: booting touches no network (jobs.wiring test). */
export const BOOT_LOAD_MS = 1_000;

export interface OverridesSnapshot {
  values: FlatStrings;
  etag: string;
}

function group(rows: readonly OverrideRow[]): Record<Locale, FlatStrings> {
  const out: Record<Locale, FlatStrings> = { ar: {}, en: {} };
  for (const r of rows) {
    if (r.locale !== 'ar' && r.locale !== 'en') continue;
    // A key the bundle no longer has (renamed in a later release) is ignored, never served.
    if (Object.hasOwn(DEFAULTS[r.locale], r.key)) out[r.locale][r.key] = r.value;
  }
  return out;
}

const etagOf = (values: FlatStrings): string =>
  `"${createHash('sha1').update(JSON.stringify(values)).digest('base64url')}"`;

/**
 * The admins' translation overrides, held in memory: loaded right after boot (never blocking it), after
 * every save / restore (here, on the worker and on the other API copies), and every REFRESH_MS. Each load re-merges the Arabic overrides into the
 * server's live copy (common/i18n/server-text `ar`), starting from the bundled defaults, so a
 * restored key goes back to its original text.
 */
@Injectable()
export class TranslationsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(TranslationsService.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private maps: OverrideMaps = { ar: {}, en: {} };
  private etags: Record<Locale, string> = { ar: etagOf({}), en: etagOf({}) };

  constructor(private readonly queries: TranslationsQueries) {}

  onApplicationBootstrap(): void {
    const tick = () => void this.refresh();
    this.timers.push(setTimeout(tick, BOOT_LOAD_MS).unref(), setInterval(tick, REFRESH_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /** Never throws: on a read failure the last good overrides (or the bundle) stay in use. */
  async refresh(): Promise<boolean> {
    try {
      this.apply(group(await this.queries.all()));
      return true;
    } catch (e) {
      this.log.warn(`translation overrides not loaded: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  overrides(locale: Locale): OverridesSnapshot {
    return { values: { ...this.maps[locale] }, etag: this.etags[locale] };
  }

  keys(query: TranslationKeysQuery): TranslationKeysPage {
    return listKeys(query, this.maps);
  }

  /**
   * 404 unknown key; 409 `{ code: 'edit_on_values', settingKey }` for the ar text of a settings hint
   * (edited on «القيم», docs/26 §3); 400 `{ message: 'placeholders_missing', missing }` when slots are dropped.
   */
  async save(w: OverrideWrite): Promise<void> {
    const problem = overrideProblem(w.locale, w.key, w.value);
    if (problem?.kind === 'unknown_key') throw new NotFoundException({ message: 'unknown_key' });
    assertNotValuesOwned(w.locale, w.key);
    if (problem) throw new BadRequestException({ message: problem.kind, missing: problem.missing });
    await this.queries.upsert(w);
    await this.reload();
  }

  /** Back to the bundled text (deleting a key that has no override is a no-op). 409 as save(). */
  async restore(locale: Locale, key: string): Promise<void> {
    if (!Object.hasOwn(DEFAULTS[locale], key)) throw new NotFoundException({ message: 'unknown_key' });
    assertNotValuesOwned(locale, key);
    await this.queries.remove(locale, key);
    await this.reload();
  }

  /** After a save or restore: here, then the worker and the other API copies (kickConfigReload). */
  private async reload(): Promise<void> {
    await this.refresh();
    kickConfigReload();
  }

  private apply(maps: Record<Locale, FlatStrings>): void {
    this.maps = maps;
    this.etags = { ar: etagOf(maps.ar), en: etagOf(maps.en) };
    applyStrings(ar, { ...DEFAULTS.ar, ...maps.ar });
  }
}
