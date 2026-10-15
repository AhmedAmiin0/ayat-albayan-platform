// What the lesson reports say about each student (pure), matched against the students being built
// (a preliminary earlier map): the single teacher of all their reports (A3: 38 of 60 reported
// students have no registry teacher, or a stale one), whether they had a chargeable lesson, and
// whether they attended a free trial lesson (on_time / late: lesson completed or late, R-STU-05).
import type { SourceBundle } from '../../entities/contract.ts';
import { keyId } from '../../keys.ts';
import type { Desired } from '../../plan/resolve.ts';
import { collectReports } from '../reports/collect.ts';

export interface Taught {
  /** student keyId → teacher slug, for students whose reports all name the same teacher. */
  teacher: Map<string, string>;
  /** student keyIds with at least one non-trial (chargeable) reported lesson. */
  chargeable: Set<string>;
  /** student keyIds with a trial report whose attendance is on_time or late. */
  trialAttended: Set<string>;
}

const ATTENDED: ReadonlySet<string> = new Set(['on_time', 'late']);

export function reportFacts(bundle: SourceBundle, students: readonly Desired[]): Taught {
  const earlier = new Map(bundle.earlier);
  earlier.set('students', students);
  const seen = new Map<string, Set<string>>();
  const chargeable = new Set<string>();
  const trialAttended = new Set<string>();
  for (const r of collectReports({ ...bundle, earlier }).reports) {
    const id = keyId(r.student);
    seen.set(id, (seen.get(id) ?? new Set()).add(r.teacher));
    if (!r.trial) chargeable.add(id);
    else if (ATTENDED.has(r.attendance)) trialAttended.add(id);
  }
  const teacher = new Map<string, string>();
  for (const [id, set] of seen) {
    const [only] = set;
    if (set.size === 1 && only) teacher.set(id, only);
  }
  return { teacher, chargeable, trialAttended };
}
