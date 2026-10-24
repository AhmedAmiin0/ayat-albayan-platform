// docs/26 §2b: `pnpm migrate:apply` runs the same settings seeder as an API boot, so a target that
// was filled by the import has every settings row's metadata before the API first starts.
// config_seed writes metadata and the seeded description only, never a value.
import { bundleText, REGISTRY_VERSION, seedPayload } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import type { TargetDb } from './target.ts';

export const configSeedSql = (): { text: string; params: [string, number] } => ({
  text: 'select public.config_seed($1::text::jsonb, $2::int) as r',
  params: [JSON.stringify(seedPayload(bundleText(ar))), REGISTRY_VERSION],
});

/** The seeder's answer ({applied, failed} or {skipped}); a failure is reported, never thrown. */
export async function seedConfig(db: Pick<TargetDb, 'select'>): Promise<string> {
  try {
    const [row] = await db.select<{ r: unknown }>(configSeedSql());
    return JSON.stringify(row?.r ?? null);
  } catch (error) {
    return `failed (${error instanceof Error ? error.message : String(error)})`;
  }
}
