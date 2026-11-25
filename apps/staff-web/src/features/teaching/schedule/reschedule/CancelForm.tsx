import { CANCEL_BY, type CancelBy, type LessonView } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Field, FormAlert, Input, ButtonRow, t } from '@ab/web-kit';
import { cancelLesson, lessonErrorText, LESSONS_KEY } from '@/features/teaching/schedule/api';
import { CORRECT_BY, type CorrectBy } from '@/features/teaching/schedule/correct/correct-by';
import { CancelByRadios } from './CancelByRadios';
import { ScopeRadios, type Scope } from './ScopeRadios';

export interface CancelFormProps {
  lesson: LessonView;
  onBack: () => void;
  onDone: (message: string) => void;
  /** This lesson only, preselected by `correction`; the API records or corrects auto-held. */
  correction?: CorrectBy | undefined;
}

const DONE: Record<Scope, string> = { one: t.lessons.cancelled, rule: t.lessons.seriesCancelled };

/** Package consumption is the API's call: teacher/admin never, student per setting (R-SCH-07). */
export function CancelForm({ lesson, onBack, onDone, correction }: CancelFormProps) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>('one');
  const [by, setBy] = useState<CancelBy>(correction ?? 'admin');
  const title = correction ? t.lessons.correct.title : t.lessons.cancelTitle;
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  const cancel = useMutation({
    mutationFn: () => cancelLesson({ id: lesson.id, body: { scope, by, reason: reason.trim() } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      onDone(correction ? t.lessons.correct.done : DONE[scope]);
    },
  });
  const submit = () => {
    if (reason.trim()) cancel.mutate();
    else setMissing(true);
  };

  return (
    <form
      noValidate
      aria-label={title}
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h3 className="font-display text-h4 font-bold">{title}</h3>
      {!correction && (
        <ScopeRadios
          value={scope}
          onChange={setScope}
          ruleAllowed={lesson.rule_id !== null}
          label={t.lessons.scopeLabelCancel}
        />
      )}
      <CancelByRadios options={correction ? CORRECT_BY : CANCEL_BY} value={by} onChange={setBy} />
      <Field label={t.lessons.reason} error={missing ? t.common.required : undefined}>
        {(p) => (
          <Input
            {...p}
            value={reason}
            placeholder={t.lessons.reasonHint}
            onChange={(e) => {
              setReason(e.target.value);
              setMissing(false);
            }}
          />
        )}
      </Field>
      {cancel.isError && <FormAlert>{lessonErrorText(cancel.error)}</FormAlert>}
      {/* This form is the confirm step, so the solid danger button stays (docs/07). */}
      <ButtonRow>
        <Button type="submit" variant="danger" disabled={cancel.isPending}>
          {t.lessons.cancelSubmit}
        </Button>
        <Button type="button" variant="secondary" onClick={onBack}>
          {t.lessons.back}
        </Button>
      </ButtonRow>
    </form>
  );
}
