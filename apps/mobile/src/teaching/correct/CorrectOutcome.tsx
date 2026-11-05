import type { CorrectTo } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';

interface CorrectOutcomeProps {
  /** correctionTargets(lesson, now): never the lesson's current status. */
  targets: readonly CorrectTo[];
  onCorrect: (to: CorrectTo) => void;
  busy?: boolean;
  /** Why the last correction was refused (e.g. 409 not_auto_held). */
  error?: string | undefined;
}

/**
 * «تصحيح حالة الحلقة» (owner 2026-11-03): an ended lesson still «يحتاج تأكيد», or one the job
 * settled, recorded as «انعقدت» | «غائب» | «اعتذر الطالب» | «ألغاها المعلم/ة» (POST …/correct).
 * The title, its hint, then the outlined choices in one row.
 */
export function CorrectOutcome({ targets, onCorrect, busy = false, error }: CorrectOutcomeProps) {
  const c = t.lessons.correct;
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{c.outcomeTitle}</SectionLabel>
      <Note>{c.outcomeHint}</Note>
      <ButtonRow>
        {targets.map((to) => (
          <Button key={to} variant="secondary" label={c.to[to]} busy={busy} onPress={() => onCorrect(to)} />
        ))}
      </ButtonRow>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
