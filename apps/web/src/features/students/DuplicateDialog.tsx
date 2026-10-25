import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { t } from '@/lib/i18n/i18n';
import { studentQuery } from './api';
import type { CreateStudentValues } from './create-student';
import { DuplicateCompare } from './DuplicateCompare';
import { FormAlert } from '@/components/ui/form/form-alert';
import { SiblingsStrip } from './SiblingsStrip';
import type { StudentRef } from './types';

export type DuplicateDialogProps = {
  typed: CreateStudentValues;
  /** From the 409 body; never empty. */
  candidates: StudentRef[];
  error: string | null;
  /** Start focus on «دمج» (coming back from a cancelled merge) instead of the first control. */
  focusMerge?: boolean;
  onClose: () => void;
  onMerge: (candidate: StudentRef) => void;
  onCreateAnyway: () => void;
};

/**
 * R-STU-03 duplicate warning (docs/07 §6 Dialog): calm saffron hollow glyph, no red. The typed
 * entry is compared field by field with the existing student, whose profile (guardian, program,
 * teacher, siblings) is fetched; until it arrives those cells stay empty.
 */
export function DuplicateDialog(props: DuplicateDialogProps) {
  const { typed, candidates, error, focusMerge, onClose, onMerge, onCreateAnyway } = props;
  const [pickedId, setPickedId] = useState(candidates[0]?.id ?? '');
  const candidate = candidates.find((c) => c.id === pickedId) ?? candidates[0];
  const { data: profile } = useQuery({ ...studentQuery(candidate?.id ?? ''), enabled: !!candidate });
  if (!candidate) return null;

  const actions = (
    <>
      <Button variant="ghost" onClick={onClose}>{t.common.cancel}</Button>
      <Button variant="secondary" onClick={onCreateAnyway}>{t.students.createAnyway}</Button>
      <Button data-autofocus={focusMerge || undefined} onClick={() => onMerge(candidate)}>
        {t.students.merge}
      </Button>
    </>
  );

  return (
    <Dialog
      title={t.students.duplicateTitle}
      description={t.students.duplicateWarning}
      glyph={{ tone: 'act', shape: 'hollow' }}
      onClose={onClose}
      hint={t.students.duplicateHint}
      actions={actions}
      layout="center"
    >
      {candidates.length > 1 && (
        <SegmentedControl
          label={t.students.duplicateCandidates}
          options={candidates.map((c) => ({ value: c.id, label: `${c.name} ${c.code ?? ''}` }))}
          value={candidate.id}
          onChange={setPickedId}
          className="mb-4"
        />
      )}
      <DuplicateCompare typed={typed} candidate={candidate} profile={profile} />
      {profile && profile.siblings.length > 0 && <SiblingsStrip siblings={profile.siblings} />}
      {error && <FormAlert className="mt-4">{error}</FormAlert>}
    </Dialog>
  );
}
