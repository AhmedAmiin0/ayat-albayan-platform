// message_templates the target already holds (seeded by migration 141 or made in the app). The
// import syncs Meta's own columns onto them by (meta_name, language) (map/templates/write.ts), so
// the plan says so: such a template is an `update` with its field changes in review.xlsx, never a
// silent overwrite planned as a `create`. SELECT only; a target without the table plans creates.
import type { TargetDb } from '../db/target.ts';
import { keyId } from '../keys.ts';
import { SYNCED } from '../map/templates/write.ts';
import type { Existing } from '../types.ts';
import { type FieldChange, sameValue } from './changes.ts';
import type { Desired } from './resolve.ts';

interface TemplateRow {
  meta_name: string;
  language: string;
  row: Record<string, unknown>;
}

/** jsonb columns travel as JSON text in the record; compare them as values. */
const value = (v: unknown): unknown => {
  if (typeof v !== 'string' || !/^[[{]/.test(v)) return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

/** Pure: mutates `existing` (found → update) and returns the synced fields that would change. */
export function templateChanges(o: {
  fresh: readonly Desired[];
  rows: readonly TemplateRow[];
  existing: Map<string, Existing>;
}): FieldChange[] {
  const out: FieldChange[] = [];
  for (const d of o.fresh) {
    const c = d.record.columns;
    const hit = o.rows.find((r) => r.meta_name === c['meta_name'] && r.language === c['language']);
    if (!hit) continue;
    o.existing.set(keyId(d.key), { targetId: null, hash: 'in target, not imported yet' });
    for (const field of SYNCED) {
      const [from, to] = [hit.row[field] ?? null, value(c[field] ?? null)];
      if (!sameValue(from, to))
        out.push({ entity: d.key.entity, key: d.key.key, ref: d.ref, field, from, to });
    }
  }
  return out;
}

export async function matchTemplates(o: {
  db: TargetDb;
  desired: readonly Desired[];
  existing: Map<string, Existing>;
}): Promise<FieldChange[]> {
  const fresh = o.desired.filter(
    (d) => d.key.entity === 'message_templates' && !o.existing.has(keyId(d.key)),
  );
  if (fresh.length === 0) return [];
  const rows = await o.db
    .select<TemplateRow>({
      text: `select meta_name, language, to_jsonb(t) as row from public.message_templates t
             where meta_name = any($1)`,
      params: [fresh.map((d) => String(d.record.columns['meta_name']))],
    })
    .catch((err: unknown) => {
      if ((err as { code?: string }).code === '42P01') return [] as TemplateRow[];
      throw err;
    });
  return templateChanges({ fresh, rows, existing: o.existing });
}
