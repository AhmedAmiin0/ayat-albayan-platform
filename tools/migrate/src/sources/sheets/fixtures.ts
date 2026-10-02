// Test helpers: invented, anonymised sheet rows and bundles (never real export rows).
import type { SourceBundle } from '../../entities/contract.ts';
import type { EntityModule } from '../../entities/contract.ts';
import { mapAll } from '../../plan/run.ts';
import type { Desired } from '../../plan/resolve.ts';
import type { Cell, EntityName, SourceAlias, SourceRow } from '../../types.ts';

let next = 2;

export function row(
  fields: Record<string, Cell>,
  at?: { source?: SourceAlias; tab?: string; row?: number },
): SourceRow {
  return {
    ref: { source: at?.source ?? 'HUB', tab: at?.tab ?? 't', row: at?.row ?? next++ },
    fields,
  };
}

export function bundleOf(sheets: Record<string, SourceRow[]>, today = '2026-10-02'): SourceBundle {
  return { sheets, crm: {}, earlier: new Map(), today };
}

/** Runs modules in APPLY_ORDER like the pipeline and returns accepted records by entity. */
export function pipeline(bundle: SourceBundle, modules: readonly EntityModule[]) {
  const r = mapAll(bundle, modules);
  const by = (e: EntityName): Desired[] => r.desired.filter((d) => d.key.entity === e);
  return { ...r, by };
}

/** A «الطلاب» row with sane defaults; override any field. */
export function studentRow(fields: Record<string, Cell>, at?: { row?: number }): SourceRow {
  return row(
    {
      legacy_code: null,
      student_name: 'ليان',
      phone: '966551110001',
      gender: 'أنثى',
      teacher: 'abrar',
      status: 'جديد — لسه ما اتواصلناش',
      package_text: 'حلقة تجريبية مجانية بس',
      ...fields,
    },
    { tab: 'الطلاب', row: at?.row },
  );
}

/** A «تقارير الحلقات» row (new linked shape unless overridden). */
export function reportRow(fields: Record<string, Cell>, at?: { row?: number }): SourceRow {
  return row(
    {
      submitted_at: '2026-09-10T19:30:05',
      teacher_slug: 'abrar',
      student_registry_name: 'ليان',
      phone: '966551110001',
      lesson_date: '2026-09-10',
      lesson_number_text: 'الحلقة الثالثة',
      attendance: 'حضرت في الموعد',
      recited: 'سورة الملك',
      new_memorization: 'سورة القلم ١-١٠',
      revision: 'جزء عم',
      grade_overall: 'ممتاز',
      grade_tajweed: 'جيد جدًا',
      notes: 'ممتازة',
      send_status: 'اتبعت PDF ✅ wamid.TEST',
      ...fields,
    },
    { tab: 'تقارير الحلقات', row: at?.row },
  );
}
