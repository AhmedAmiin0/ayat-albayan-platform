import { bundleText, REGISTRY_VERSION, seedPayload } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import type { Sql, TransactionSql } from 'postgres';
import { withSql } from '../core/schedule';

/** The payload the API's ConfigSeeder sends at boot (docs/26 §2b): metadata only, never a value. */
const SEED_PAYLOAD = seedPayload(bundleText(ar));

/** One «boot» of the seeder: config_seed with the real registry payload (JSON text, not sql.json). */
export async function runConfigSeed(sql: Sql | TransactionSql): Promise<Record<string, unknown>> {
  const [row] = await sql<{ r: Record<string, unknown> }[]>`
    select public.config_seed(${JSON.stringify(SEED_PAYLOAD)}::text::jsonb, ${REGISTRY_VERSION}::int) as r`;
  return row?.r ?? {};
}

/** After resetDb (it truncates settings_revision too): what an API boot would leave behind. */
export async function seedConfig(): Promise<void> {
  await withSql(async (sql) => {
    await runConfigSeed(sql);
  });
}
