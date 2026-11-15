import { Button } from '@/components/ui/form/button';
import { ButtonRow } from '@/components/ui/layout/button-row';
import { t } from '@/lib/i18n/i18n';
import { CORRECT_BY, CORRECT_BY_LABEL, type CorrectBy } from './correct-by';

export interface CorrectLessonChoiceProps {
  onPick: (by: CorrectBy) => void;
  /** Held automatically (LessonView.auto_held): the hint says so; not for an ended open lesson. */
  autoHeld: boolean;
  disabled?: boolean;
}

/**
 * «لم تنعقد الحلقة؟» with «ألغاها المعلم/ة» | «اعتذر الطالب» (owner 2026-11-02): the admin's and
 * sales' lesson drawers, on a lesson held automatically or ended still open; the caller records
 * the pick.
 */
export function CorrectLessonChoice(props: CorrectLessonChoiceProps) {
  const { onPick, autoHeld, disabled = false } = props;
  return (
    <section aria-label={t.lessons.correct.title} className="grid gap-2 border-t border-rule pt-3">
      <h3 className="text-sm font-semibold">{t.lessons.correct.title}</h3>
      {autoHeld && <p className="text-xs text-ink-2">{t.lessons.correct.hint}</p>}
      <ButtonRow>
        {CORRECT_BY.map((by) => (
          <Button key={by} type="button" variant="secondary" disabled={disabled} onClick={() => onPick(by)}>
            {CORRECT_BY_LABEL[by]}
          </Button>
        ))}
      </ButtonRow>
    </section>
  );
}
