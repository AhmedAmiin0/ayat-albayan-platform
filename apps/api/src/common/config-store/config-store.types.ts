/** Injection token of the cache TTL in ms (env SETTINGS_CACHE_MS; 0 in e2e). */
export const SETTINGS_CACHE_MS = Symbol('SETTINGS_CACHE_MS');
export const DEFAULT_TTL_MS = 30_000;

/** A cache older than this asks the database for the revision before it is used (docs/26 §2c). */
export const REVISION_CHECK_MS = 2_000;

/**
 * Optional hook (provided by TranslationsModule): reload the «الترجمات» overrides after a description
 * edit, since config_describe also writes the ar override of the row's hint key (docs/26 §3).
 */
export const OVERRIDES_REFRESH = Symbol('OVERRIDES_REFRESH');
export type OverridesRefresh = () => Promise<unknown>;

/** One public.settings row as the store reads it. `value` may be JSON null (= unset = the default). */
export interface ConfigRow {
  key: string;
  value: unknown;
  version: number;
  description: string | null;
  descriptionSeed: string | null;
  descriptionEdited: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  retiredAt: string | null;
}

/** The rows and the settings_revision.rev they were read at (the rows are at least that new). */
export interface ConfigSnapshot {
  rev: number;
  rows: ConfigRow[];
}

/** One key of a config_set call. `value: null` stores JSON null, never a delete. */
export interface ConfigChange {
  key: string;
  value: unknown;
  expectedVersion: number;
}

/** config_set raised SQLSTATE P0409: `key` was saved by someone else (now at `currentVersion`). */
export class ConfigConflictError extends Error {
  constructor(
    readonly key: string,
    readonly currentVersion: number,
  ) {
    super(`config conflict on ${key} (current version ${currentVersion})`);
    this.name = 'ConfigConflictError';
  }
}

/** A seeded row nobody ever wrote (JSON null, no writer): it shows no «changed by …». */
export const neverWritten = (row: { value: unknown; updatedBy: string | null }): boolean =>
  row.value === null && row.updatedBy === null;
