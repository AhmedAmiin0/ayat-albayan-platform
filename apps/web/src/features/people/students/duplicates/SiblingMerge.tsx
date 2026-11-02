import { studentStatusStyle } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { mergeStudents, STUDENTS_KEY } from '@/features/people/students/api';
import { MergeDialog } from './MergeDialog';
import { SavedNote } from '@/features/people/students/profile/SavedNote';
import type { StudentRef } from '@/features/people/students/types';

type SiblingMergeProps = { student: StudentRef; siblings: StudentRef[] };

/**
 * Merge tool on the profile (R-STU-03): fold another student on the same guardian phone into
 * this one. The merged row's history is kept in student_merges.
 */
export function SiblingMerge({ student, siblings }: SiblingMergeProps) {
  const queryClient = useQueryClient();
  const [merging, setMerging] = useState<StudentRef | null>(null);
  const [done, setDone] = useState(false);
  if (siblings.length === 0 && !done) return null;

  const confirm = async (sibling: StudentRef) => {
    await mergeStudents({ keptId: student.id, mergedId: sibling.id });
    setMerging(null);
    setDone(true);
    await queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
  };

  return (
    <section className="mt-8 border-t border-rule pt-5">
      <h2 className="mb-3 font-display text-h4 font-bold">{t.students.siblings}</h2>
      {done && <SavedNote>{t.students.mergeDone}</SavedNote>}
      <ul>
        {siblings.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule py-2.5">
            <span className="font-semibold">{s.name}</span>
            <Ltr className="text-xs text-ink-2">{s.code}</Ltr>
            <StatusChip {...studentStatusStyle[s.status]} label={t.enums.studentStatus[s.status]} size="sm" />
            <Button size="sm" variant="secondary" className="ms-auto" onClick={() => setMerging(s)}>
              {t.students.mergeIntoThis}
            </Button>
          </li>
        ))}
      </ul>
      {merging && (
        <MergeDialog
          kept={student}
          merged={merging}
          onConfirm={() => confirm(merging)}
          onCancel={() => setMerging(null)}
        />
      )}
    </section>
  );
}
