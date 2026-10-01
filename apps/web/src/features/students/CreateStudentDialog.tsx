import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import { createStudent, duplicateCandidates, mergeStudents, STUDENTS_KEY } from './api';
import { toCreateBody, type CreateStudentValues } from './create-student';
import { CreateStudentForm } from './CreateStudentForm';
import { DuplicateDialog } from './DuplicateDialog';
import { MergeDialog } from './MergeDialog';
import type { StudentRef } from './types';

type CreateStudentDialogProps = { onClose: () => void; onDone: (notice: string) => void };

/**
 * Create a student (R-STU-01..04). On a duplicate (409, R-STU-03) the admin either merges the
 * new entry into the existing student — it is created then folded in, so the typed data stays in
 * the merge history — or creates it anyway as a sibling.
 */
export function CreateStudentDialog({ onClose, onDone }: CreateStudentDialogProps) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<CreateStudentValues | null>(null);
  const [candidates, setCandidates] = useState<StudentRef[] | null>(null);
  const [mergeInto, setMergeInto] = useState<StudentRef | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Survives a failed merge so a retry never creates the student twice.
  const createdId = useRef<string | null>(null);

  // Not awaited: the open duplicate dialog's profile query is under the same key, and closing
  // must not wait for (or retry) that refetch. The list refreshes in the background.
  const finish = (notice: string) => {
    void queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
    onDone(notice);
  };

  const submit = async (values: CreateStudentValues, force: boolean) => {
    setError(null);
    try {
      // A failed merge already created the row: "create anyway" must not add a second one.
      if (!createdId.current) await createStudent(toCreateBody(values, force));
      finish(t.students.created);
    } catch (e) {
      const dupes = duplicateCandidates(e);
      if (dupes) {
        setPending(values);
        setCandidates(dupes);
      } else setError(t.common.error);
    }
  };

  const confirmMerge = async (kept: StudentRef, values: CreateStudentValues) => {
    createdId.current ??= (await createStudent(toCreateBody(values, true))).id;
    await mergeStudents({ keptId: kept.id, mergedId: createdId.current });
    finish(t.students.mergeDone);
  };

  if (mergeInto && pending) {
    return (
      <MergeDialog
        kept={mergeInto}
        merged={{ name: pending.name }}
        onConfirm={() => confirmMerge(mergeInto, pending)}
        onCancel={() => setMergeInto(null)}
      />
    );
  }

  if (candidates && candidates.length > 0 && pending) {
    return (
      <DuplicateDialog
        typed={pending}
        candidates={candidates}
        error={error}
        onClose={onClose}
        onMerge={setMergeInto}
        onCreateAnyway={() => void submit(pending, true)}
      />
    );
  }

  return <CreateStudentForm onSubmit={(v) => submit(v, false)} onCancel={onClose} error={error} />;
}
