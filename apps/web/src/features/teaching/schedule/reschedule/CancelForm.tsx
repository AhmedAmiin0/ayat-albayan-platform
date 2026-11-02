import { CANCEL_BY, type CancelBy, type LessonView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { ButtonRow } from '@/components/ui/layout/button-row';
import { t } from '@/lib/i18n/i18n';
import { cancelLesson, lessonErrorText, LESSONS_KEY } from '@/features/teaching/schedule/api';
import { CORRECT_BY, type CorrectBy } from '@/features/teaching/schedule/correct/correct-by';
import { CancelByRadios } from './CancelByRadios';
import { ScopeRadios, type Scope } from './ScopeRadios';

export interface CancelFormProps {
  lesson: LessonView;
  onBack: () => void;
  onDone: (message: string) => void;
  /**
   * «لم تنعقد؟» (owner 2026-11-02): this lesson only, by its teacher or the student (`correction`
   * preselected); the API records it, or corrects a lesson held automatically.
   */
  correction?: CorrectBy | undefined;
}

const DONE: Record<Scope, string> = { one: t.lessons.cancelled, rule: t.lessons.seriesCancelled };

/**
 * «إلغاء الحلقة» (R-SCH-07): this lesson or it and every later one of its rule, who cancelled and
 * why. Whether it consumes the package is the API's call (teacher/admin never; student per setting).
 */
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
        <ScopeRadios value={scope} onChange={setScope} ruleAllowed={lesson.rule_id !== null} label={t.lessons.scopeLabelCancel} />
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
      {/* docs/07 «الأزرار» Forms: submit at the reading start, «رجوع» secondary. This form IS the confirm step, so the solid danger stays. */}
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
