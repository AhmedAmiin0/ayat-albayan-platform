// Upsert into the template registry by (meta_name, language). message_templates is keyed by `key`
// (no uuid id), so the default insert-returning-id write does not fit. On a match only Meta's side
// changes: the registry key, params, category and header stay as the platform defined them.
import type { SqlText } from '../../db/sql.ts';
import { param } from '../../db/sql.ts';
import type { WriteContext, WriteResult } from '../../entities/contract.ts';
import type { ColumnValue } from '../../types.ts';

const COLUMNS = [
  ['key', ''],
  ['meta_name', ''],
  ['language', ''],
  ['category', '::public.template_category'],
  ['header_format', ''],
  ['body_ar', ''],
  ['footer_ar', ''],
  ['params', '::jsonb'],
  ['buttons', '::jsonb'],
  ['status', '::public.template_status'],
  ['meta_id', ''],
] as const;

/** Columns Meta owns: synced onto an existing row. */
export const SYNCED = ['status', 'body_ar', 'footer_ar', 'buttons', 'meta_id'] as const;

export function upsertTemplateSql(columns: Readonly<Record<string, ColumnValue>>): SqlText {
  const names = COLUMNS.map(([c]) => c).join(', ');
  const values = COLUMNS.map(([, cast], i) => `$${i + 1}${cast}`).join(', ');
  const sets = SYNCED.map((c) => `${c} = excluded.${c}`).join(', ');
  return {
    text:
      `insert into public.message_templates (${names}) values (${values}) ` +
      `on conflict (meta_name, language) do update set ${sets}`,
    params: COLUMNS.map(([c]) => param(columns[c] ?? null)),
  };
}

/** import_items keeps the natural key (meta name); the row has no uuid to record. */
export async function writeTemplate(ctx: WriteContext): Promise<WriteResult> {
  await ctx.tx.exec(upsertTemplateSql(ctx.columns));
  return { targetId: null, targetPath: null };
}
