import { CANCEL_BY, type CancelBy, type CancelRequest, type LessonView } from '@ab/shared';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { ButtonRow } from '@/components/ui/layout/button-row';
import { t } from '@/lib/i18n/i18n';
import { cancelLesson, lessonErrorText, LESSONS_KEY } from '../api';
import { ScopeRadios, type Scope } from './ScopeRadios';

/** Where a cancel goes and what it refreshes: the admin's route or the assistant's. */
export interface CancelRoute {
  send: (body: CancelRequest) => Promise<unknown>;
  refresh: QueryKey;
}

export interface CancelFormProps {
  /** Its series decides «كل اللي بعدها» (none: this lesson only). */
  lesson: Pick<LessonView, 'id' | 'rule_id'>;
  onBack: () => void;
  onDone: (message: string) => void;
  /** Default the admin's POST /lessons/:id/cancel. */
  route?: CancelRoute;
}

const adminRoute = (id: string): CancelRoute => ({
  send: (body) => cancelLesson({ id, body }),
  refresh: LESSONS_KEY,
});

/**
 * «إلغاء الحلقة» (R-SCH-07): this lesson or it and every later one of its rule, who cancelled and
 * why. Whether it consumes the package is the API's call (teacher/admin never; student per
 * setting). The assistant's drawer sends it to her own route (owner 2026-11-02), one lesson only.
 */
export function CancelForm(props: CancelFormProps) {
  const { lesson, onBack, onDone, route = adminRoute(lesson.id) } = props;
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>('one');
  const [by, setBy] = useState<CancelBy>('admin');
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  const cancel = useMutation({
    mutationFn: () => route.send({ scope, by, reason: reason.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: route.refresh });
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
      <ScopeRadios value={scope} onChange={setScope} ruleAllowed={lesson.rule_id !== null} label={t.lessons.scopeLabelCancel} />
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
