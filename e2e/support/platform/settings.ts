import { withSql } from '../schedule';

// A6 helpers: put settings rows back after a spec changed them, and read one as text. The template
// registry helpers are in template-registry.ts, the outbound queue helpers in message-queue.ts.

/** The settings rows for `keys` as they are now (a missing key is absent from the list). */
export async function snapshotSettings(keys: string[]): Promise<{ key: string; value: unknown }[]> {
  return withSql((sql) => sql<{ key: string; value: unknown }[]>`
    select key, value from public.settings where key = any(${keys})`);
}

/** Writes the snapshot back; a key that had no row gets its row deleted again. */
export async function restoreSettings(input: { keys: string[]; rows: { key: string; value: unknown }[] }): Promise<void> {
  await withSql(async (sql) => {
    for (const key of input.keys) {
      const row = input.rows.find((r) => r.key === key);
      if (row) {
        // JSON text + ::text::jsonb, not sql.json(): a JSON null (late_cancel_hours OFF) must stay jsonb null.
        // A bare ::jsonb made postgres.js send the text as a JSON string ("false"), which the settings_kind
        // check of migration 630 refuses once the seeder has set value_type.
        await sql`insert into public.settings (key, value) values (${key}, ${JSON.stringify(row.value)}::text::jsonb)
          on conflict (key) do update set value = excluded.value`;
      } else {
        await sql`delete from public.settings where key = ${key}`;
      }
    }
  });
}

/** One settings value as text (jsonb scalar, or the array as JSON); null when there is no row. */
export async function settingText(key: string): Promise<string | null> {
  return withSql(async (sql) => {
    const [row] = await sql<{ v: string | null }[]>`
      select value #>> '{}' as v from public.settings where key = ${key}`;
    return row?.v ?? null;
  });
}
