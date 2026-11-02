import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';

/** Who did not hold it: the teacher cancelled, or the student excused himself. */
export type CorrectBy = 'teacher' | 'student';

const CHOICES: readonly { by: CorrectBy; label: string }[] = [
  { by: 'teacher', label: t.lessons.correct.byTeacher },
  { by: 'student', label: t.lessons.correct.byStudent },
];

interface CorrectAutoHeldProps {
  onCorrect: (by: CorrectBy) => void;
  busy?: boolean;
  /** Why the last correction was refused (e.g. 409 not_auto_held). */
  error?: string | undefined;
}

/**
 * «لم تنعقد الحلقة؟» (owner 2026-11-02): with no confirmation required, a lesson the auto-held job
 * closed as held may still be recorded as cancelled by its teacher or excused by the student (POST
 * …/cancel with `by`). The title, its hint, then the two outlined choices in one row.
 */
export function CorrectAutoHeld({ onCorrect, busy = false, error }: CorrectAutoHeldProps) {
  const c = t.lessons.correct;
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{c.title}</SectionLabel>
      <Note>{c.hint}</Note>
      <ButtonRow>
        {CHOICES.map(({ by, label }) => (
          <Button key={by} variant="secondary" label={label} busy={busy} onPress={() => onCorrect(by)} />
        ))}
      </ButtonRow>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
