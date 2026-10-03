import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Ltr } from '@/components/ui/ltr';
import { studentListQuery } from '@/features/students/api';
import { StudentSearch } from '@/features/students/StudentSearch';
import type { StudentRef } from '@/features/students/types';
import { t } from '@/lib/i18n';
import type { PickedStudent } from './draft';

export interface StudentStepProps {
  /** The student the wizard opened for; null when it opened without one. */
  primary: PickedStudent | null;
  /** The primary's siblings (same guardian): tick them for a group lesson. */
  siblings: readonly StudentRef[];
  picked: readonly PickedStudent[];
  onPicked: (students: PickedStudent[]) => void;
  /** Reopens the wizard for another student (their profile carries tz, program, siblings). */
  onOpenStudent: (id: string) => void;
}

const asPicked = (s: StudentRef): PickedStudent => ({ id: s.id, name: s.name, code: s.code });

/** Step 1 (R-SCH-06): the student, plus siblings for a group lesson, or search for someone else. */
export function StudentStep({ primary, siblings, picked, onPicked, onOpenStudent }: StudentStepProps) {
  const [term, setTerm] = useState('');
  // A cached unfiltered list must not show up as «results» before anything was searched.
  const query = useQuery({ ...studentListQuery(term, 1), enabled: term !== '' });
  const results = term ? query : { isFetching: false, data: undefined };
  const isPicked = (id: string) => picked.some((s) => s.id === id);
  const toggle = (s: StudentRef) =>
    onPicked(isPicked(s.id) ? picked.filter((p) => p.id !== s.id) : [...picked, asPicked(s)]);

  return (
    <div className="grid gap-6">
      {primary && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold">{t.booking.studentsPicked}</legend>
          <label className="flex min-h-11 items-center gap-2.5">
            <input type="checkbox" checked disabled className="size-4 accent-[var(--lapis)]" />
            <span className="font-semibold">{primary.name}</span>
            {primary.code && <Ltr className="text-xs text-ink-3">{primary.code}</Ltr>}
          </label>
          {siblings.map((s) => (
            <label key={s.id} className="flex min-h-11 items-center gap-2.5">
              <input type="checkbox" checked={isPicked(s.id)} onChange={() => toggle(s)} className="size-4 accent-[var(--lapis)]" />
              <span>{s.name}</span>
              {s.code && <Ltr className="text-xs text-ink-3">{s.code}</Ltr>}
            </label>
          ))}
          {siblings.length > 0 && <p className="text-xs text-ink-3">{t.students.siblings}</p>}
        </fieldset>
      )}
      <section className="grid gap-2.5">
        <h3 className="text-sm font-semibold">{t.booking.pickStudents}</h3>
        <StudentSearch initial="" onSearch={setTerm} live />
        {results.isFetching && <p className="text-xs text-ink-3">{t.common.loading}</p>}
        {results.data && results.data.items.length === 0 && <p className="text-sm text-ink-2">{t.students.empty}</p>}
        {results.data && results.data.items.length > 0 && (
          <ul className="grid gap-1">
            {results.data.items.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onOpenStudent(s.id)}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-start hover:bg-sunk"
                >
                  <span className="font-semibold">{s.name}</span>
                  {s.code && <Ltr className="text-xs text-ink-3">{s.code}</Ltr>}
                  <span className="text-xs text-ink-3">{s.guardian_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
