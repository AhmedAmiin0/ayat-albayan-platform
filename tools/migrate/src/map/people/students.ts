// students ← collectPeople (HUB «الطلاب» ∪ «ردود التسجيل» ∪ confirmed bookings ∪ HEART), checked
// against SUBS and the ATT folders (subs.ts) and what the lesson reports say (taught.ts).
import { normalizeArabic } from '@ab/shared';
import type { EntityModule, SourceBundle } from '../../entities/contract.ts';
import { keyId, keys } from '../../keys.ts';
import { personTz, phoneCell } from '../../sources/sheets/cells.ts';
import { accepted, issueOnly, issuesFor } from '../../sources/sheets/issues.ts';
import { gender, teacherFromText } from '../../sources/values.ts';
import type { ColumnValue, Mapped, RowIssue, TargetRecord } from '../../types.ts';
import { type Person, collectPeople } from './collect.ts';
import { writeStudent } from './students.write.ts';
import { subsFacts } from './subs.ts';
import { reportFacts } from './taught.ts';

/** Phones of HEART «subscription» rows: those families pay, so their children are active. */
function payingPhones(bundle: SourceBundle): Set<string> {
  const out = new Set<string>();
  for (const r of bundle.sheets['heart_subscriptions'] ?? []) {
    const p = phoneCell(r.fields['phone']);
    if (p.ok) out.add(p.e164);
  }
  return out;
}

interface Built {
  columns: Record<string, ColumnValue>;
  refs: TargetRecord['refs'];
  issues: RowIssue[];
}

export function studentRecord(p: Person, paying: ReadonlySet<string>): Built {
  const issue = issuesFor('students', p.ref);
  const issues: RowIssue[] = [];
  const f = p.fields;
  const age = f.age !== null && f.age >= 3 && f.age <= 99 ? Math.round(f.age) : null;
  if (f.age !== null && age === null)
    issues.push(issue({ code: 'unmapped_value', severity: 'warn', field: 'age' }));
  const g = gender(f.gender) ?? null;
  if (f.gender && !g)
    issues.push(issue({ code: 'unmapped_value', severity: 'warn', field: 'gender' }));
  const teacher = f.teacherText ? teacherFromText(f.teacherText) : null;
  const columns: Record<string, ColumnValue> = {
    name: p.name,
    name_normalized: normalizeArabic(p.name), // same as the API's students.mapper
    age,
    gender: g,
    program: 'quran',
    level: f.level,
    memorized: f.memorized,
    goal: f.goal,
    riwaya: f.riwaya,
    tz: personTz({ declared: f.tzCountry ?? f.country, phone: p.phone }),
    status: p.active || paying.has(p.phone) ? 'active' : 'new',
    notes: f.notes,
  };
  // Legacy AB-nnnn kept (docs/06 step 5): written with OVERRIDING SYSTEM VALUE (students.write.ts).
  if (p.legacy !== null) columns['code_seq'] = p.legacy;
  const refs: TargetRecord['refs'] = { guardian_id: keys.guardian(p.phone) };
  if (teacher) refs['teacher_id'] = keys.teacher(teacher);
  return { columns, refs, issues };
}

/** A3: the single teacher of all a student's reports beats an empty or stale registry teacher. */
function reportTeacher(o: { p: Person; refs: TargetRecord['refs']; slug: string | undefined }) {
  const now = o.refs['teacher_id']?.key;
  if (!o.slug || now === o.slug) return { refs: o.refs, issues: [] };
  const refs = { ...o.refs, teacher_id: keys.teacher(o.slug) };
  if (!now) return { refs, issues: [] };
  const issue = issuesFor(
    'students',
    o.p.ref,
  )({
    code: 'conflict',
    severity: 'review',
    field: 'teacher',
    detail: `registry teacher ${now}, but every lesson report names ${o.slug}: report teacher used`,
  });
  return { refs, issues: [issue] };
}

export function mapStudents(bundle: SourceBundle): Mapped[] {
  const { people, issues } = collectPeople(bundle);
  const paying = payingPhones(bundle);
  const built = people.map((p) => ({ p, ...studentRecord(p, paying) }));
  const prelim = built.map((b) => ({
    key: b.p.key,
    record: { columns: b.columns, refs: b.refs, aliases: b.p.aliases },
    hash: '',
    ref: b.p.ref,
  }));
  const taught = reportFacts(bundle, prelim);
  const subs = subsFacts(bundle, prelim);
  // Legacy codes first: apply keeps this order, so every AB code is inserted (and the sequence
  // moved past it) before a new student draws one from the sequence.
  const legacyFirst = [...built].sort(
    (a, b) => Number(b.p.legacy !== null) - Number(a.p.legacy !== null),
  );
  const out = legacyFirst.map(({ p, columns, refs, issues: own }) => {
    const id = keyId(p.key);
    const t = reportTeacher({ p, refs, slug: taught.teacher.get(id) });
    // Subscribed: «طالب حالي», a مشترك booking, a paying HEART phone, a chargeable reported
    // lesson, or more than one lesson in SUBS. Otherwise not subscribed (R-STU-05, docs/18): an
    // attended trial report → pending_subscription, else new — never trial (bookings not imported).
    const active =
      columns['status'] === 'active' || taught.chargeable.has(id) || subs.active.has(id);
    const waiting = taught.trialAttended.has(id) ? 'pending_subscription' : 'new';
    return accepted({
      key: p.key,
      ref: p.ref,
      columns: { ...columns, status: active ? 'active' : waiting },
      refs: t.refs,
      issues: [...own, ...t.issues],
      aliases: p.aliases,
    });
  });
  return [...out, ...issueOnly([...issues, ...subs.issues])];
}

export const studentsModule: EntityModule = {
  entity: 'students',
  table: 'students',
  map: mapStudents,
  write: writeStudent,
};
