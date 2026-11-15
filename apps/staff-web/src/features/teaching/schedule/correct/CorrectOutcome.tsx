import { correctionTargets } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ButtonRow } from '@/components/ui/layout/button-row';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';
import { lessonErrorText } from '@/features/teaching/schedule/api';
import { useCorrectLesson, type CorrectArea, type CorrectLesson } from './correct-api';

export interface CorrectOutcomeProps {
  lesson: CorrectLesson;
  area: CorrectArea;
}

/**
 * «تصحيح حالة الحلقة» (owner 2026-11-03): on an ended lesson still «يحتاج تأكيد», or one the job
 * settled, «انعقدت» | «غائب» | «اعتذر الطالب» | «ألغاها المعلم/ة» (never its current status).
 * Renders nothing when correctionTargets offers none; the API decides again (409 in words).
 */
export function CorrectOutcome({ lesson, area }: CorrectOutcomeProps) {
  const now = useNow();
  const correct = useCorrectLesson(lesson.id, area);
  const targets = correctionTargets(lesson, now);
  const c = t.lessons.correct;
  if (correct.isSuccess) return <p role="status" className="text-sm text-ink-2">{c.done}</p>;
  return targets.length === 0 ? null : (
    <section aria-label={c.outcomeTitle} className="grid gap-2 border-t border-rule pt-3">
      <h3 className="text-sm font-semibold">{c.outcomeTitle}</h3>
      <p className="text-xs text-ink-2">{c.outcomeHint}</p>
      <ButtonRow>
        {targets.map((to) => (
          <Button
            key={to}
            type="button"
            variant="secondary"
            disabled={correct.isPending}
            onClick={() => correct.mutate(to)}
          >
            {c.to[to]}
          </Button>
        ))}
      </ButtonRow>
      {correct.isError && <FormAlert>{lessonErrorText(correct.error)}</FormAlert>}
    </section>
  );
}
