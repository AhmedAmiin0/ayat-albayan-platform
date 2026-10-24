// After an apply: imported lessons are the old system's (the Apps Script already put them in Google),
// but the lessons insert trigger queues each one for Google sync before its import item is written
// (v_platform_origin_lessons sees no import item yet). Drop those queue rows so a live sync never
// duplicates the old script's events. Rows a later change queues are excluded by the view itself.
import type { TargetDb } from './target.ts';

export const unqueueImportedSql = () => ({
  text: `with gone as (
           delete from public.google_sync_items
           where google_id is null
             and lesson_id in (select target_id from public.import_items where target_table = 'lessons')
           returning 1)
         select count(*)::int as n from gone`,
  params: [],
});

/** How many queue rows were dropped; a failure is reported, never thrown (the apply already committed). */
export async function unqueueImportedLessons(db: Pick<TargetDb, 'select'>): Promise<string> {
  try {
    const [row] = await db.select<{ n: number }>(unqueueImportedSql());
    return String(row?.n ?? 0);
  } catch (error) {
    return `failed (${error instanceof Error ? error.message : String(error)})`;
  }
}
