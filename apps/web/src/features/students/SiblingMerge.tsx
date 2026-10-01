import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { mergeStudents, STUDENTS_KEY } from './api';
import { MergeDialog } from './MergeDialog';
import type { StudentRef } from './types';

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
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">{t.students.siblings}</h3>
      {done && <p role="status" className="text-sm">{t.students.mergeDone}</p>}
      <ul className="flex flex-col gap-2">
        {siblings.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span>
              {s.name} <span className="text-muted-foreground">({s.code})</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => setMerging(s)}>
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
