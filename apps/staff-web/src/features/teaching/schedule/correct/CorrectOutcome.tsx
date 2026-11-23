import { correctionTargets, type CorrectTo } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { ButtonRow } from '@ab/web-kit/components/ui/layout/button-row';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { lessonErrorText } from '@/features/teaching/schedule/api';
import { useCorrectLesson, type CorrectArea, type CorrectLesson } from './correct-api';
import { CorrectAsk } from './CorrectAsk';

export interface CorrectOutcomeProps {
  lesson: CorrectLesson;
  area: CorrectArea;
}

/** Never offers the current status; renders nothing when none applies; the API re-checks (409). */
export function CorrectOutcome({ lesson, area }: CorrectOutcomeProps) {
  const now = useNow();
  const correct = useCorrectLesson(lesson.id, area);
  const targets = correctionTargets(lesson, now);
  const [asking, setAsking] = useState<CorrectTo | null>(null);
  const c = t.lessons.correct;
  if (correct.isSuccess) return <p role="status" className="text-sm text-ink-2">{c.done}</p>;
  return targets.length === 0 ? null : (
    <section aria-label={c.outcomeTitle} className="grid gap-2 border-t border-rule pt-3">
      <h3 className="text-sm font-semibold">{c.outcomeTitle}</h3>
      <p className="text-xs text-ink-2">{c.outcomeHint}</p>
      {asking ? (
        <CorrectAsk
          to={asking}
          busy={correct.isPending}
          onConfirm={() => correct.mutate(asking)}
          onBack={() => setAsking(null)}
        />
      ) : (
        <ButtonRow>
          {targets.map((to) => (
            <Button key={to} type="button" variant="secondary" onClick={() => setAsking(to)}>
              {c.to[to]}
            </Button>
          ))}
        </ButtonRow>
      )}
      {correct.isError && <FormAlert>{lessonErrorText(correct.error)}</FormAlert>}
    </section>
  );
}
