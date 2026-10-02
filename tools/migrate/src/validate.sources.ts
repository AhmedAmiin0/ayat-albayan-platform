// docs/06 validation against the sources (info only, counts only): students per teacher vs SUBS,
// completed lessons per student vs ATT-* attendance rows (fewer after de-dup is expected).
import type { TargetDb } from './db/target.ts';
import type { SourceBundle } from './entities/contract.ts';
import { personName, teacherSlug } from './keys.ts';
import { teacherFromText } from './sources/values.ts';
import type { SourceRow } from './types.ts';
import type { CheckResult } from './validate.ts';

const tally = (keys: readonly string[]): Map<string, number> => {
  const m = new Map<string, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
};

/** SUBS «الطلاب» rows per teacher slug ('?' = no or unknown teacher). */
export function subsByTeacher(rows: readonly SourceRow[]): Map<string, number> {
  return tally(rows.map((r) => teacherFromText(String(r.fields['teacher'] ?? '')) ?? '?'));
}

/** ATT rows per student, by personName of the student folder of the attendance file. */
export function attByStudent(rows: readonly SourceRow[]): Map<string, number> {
  return tally(rows.map((r) => personName((r.ref.file ?? '').split('/').at(-2) ?? '')));
}

export interface StudentLessons {
  name: string;
  n: number;
}

/** ATT students whose completed-lesson count differs, and those with no (or no unique) DB match. */
export function compareAtt(o: { att: ReadonlyMap<string, number>; db: readonly StudentLessons[] }) {
  const byName = new Map<string, StudentLessons[]>();
  for (const s of o.db) {
    const k = personName(s.name);
    byName.set(k, [...(byName.get(k) ?? []), s]);
  }
  let differ = 0;
  let unmatched = 0;
  for (const [name, n] of o.att) {
    const hits = byName.get(name) ?? [];
    if (hits.length !== 1) unmatched++;
    else if (hits[0]?.n !== n) differ++;
  }
  return { differ, unmatched };
}

export async function sourceChecks(db: TargetDb, bundle: SourceBundle): Promise<CheckResult[]> {
  const perTeacher = await db.select<{ name_en: string | null; n: number }>({
    text: `select t.display_name_en as name_en, count(*)::int as n from public.students s
           join public.teachers t on t.id = s.teacher_id where s.status = 'active' group by 1`,
    params: [],
  });
  const dbBy = new Map(perTeacher.map((r) => [teacherSlug(r.name_en ?? '?'), r.n]));
  const subs = subsByTeacher(bundle.sheets['subs_students'] ?? []);
  const slugs = [...new Set([...subs.keys(), ...dbBy.keys()])].sort();
  const out: CheckResult[] = slugs.map((slug) => ({
    name: `active students of ${slug} (SUBS ${subs.get(slug) ?? 0})`,
    n: dbBy.get(slug) ?? 0,
    ok: true,
  }));
  const lessons = await db.select<StudentLessons>({
    text: `select s.name, count(l.id) filter (where l.status = 'completed')::int as n
           from public.students s left join public.lesson_students ls on ls.student_id = s.id
           left join public.lessons l on l.id = ls.lesson_id group by s.id, s.name`,
    params: [],
  });
  const att = compareAtt({ att: attByStudent(bundle.sheets['att_attendance'] ?? []), db: lessons });
  out.push(
    { name: 'ATT students: completed lessons ≠ attendance rows', n: att.differ, ok: true },
    { name: 'ATT students without one matching DB student', n: att.unmatched, ok: true },
  );
  return out;
}
