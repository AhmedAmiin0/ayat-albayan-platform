import { CANCEL_BY, type CancelBy, type LessonView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { cancelLesson, lessonErrorText, LESSONS_KEY } from './api';
import { ScopeRadios, type Scope } from './ScopeRadios';

export interface CancelFormProps {
  lesson: LessonView;
  onBack: () => void;
  onDone: (message: string) => void;
}

/**
 * «إلغاء الحلقة» (R-SCH-07): this lesson or it and every later one of its rule, who cancelled and
 * why. Whether it consumes the package is the API's call (teacher/admin never; student per setting).
 */
export function CancelForm({ lesson, onBack, onDone }: CancelFormProps) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>('one');
  const [by, setBy] = useState<CancelBy>('admin');
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  const cancel = useMutation({
    mutationFn: () => cancelLesson({ id: lesson.id, body: { scope, by, reason: reason.trim() } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      onDone(scope === 'rule' ? t.lessons.seriesCancelled : t.lessons.cancelled);
    },
  });
  const submit = () => {
    if (reason.trim()) cancel.mutate();
    else setMissing(true);
  };

  return (
    <form
      noValidate
      aria-label={t.lessons.cancelTitle}
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h3 className="font-display text-h4 font-bold">{t.lessons.cancelTitle}</h3>
      <ScopeRadios value={scope} onChange={setScope} ruleAllowed={lesson.rule_id !== null} />
      <fieldset className="grid gap-1">
        <legend className="mb-1 text-xs font-semibold text-ink-2">{t.lessons.cancelBy}</legend>
        {CANCEL_BY.map((x) => (
          <label key={x} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
            <input type="radio" name="cancel-by" checked={by === x} onChange={() => setBy(x)} className="size-4 accent-[var(--lapis)]" />
            <span>{t.lessons.by[x]}</span>
          </label>
        ))}
      </fieldset>
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
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button type="button" variant="ghost" onClick={onBack}>
          {t.lessons.back}
        </Button>
        <Button type="submit" variant="danger" disabled={cancel.isPending}>
          {t.lessons.cancelSubmit}
        </Button>
      </div>
    </form>
  );
}
