import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { ButtonRow } from '@ab/web-kit/components/ui/layout/button-row';
import { CORRECT_BY_LABEL, type CorrectBy, lessonErrorText } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface SalesCorrectConfirmProps {
  by: CorrectBy;
  pending: boolean;
  /** The refusal (409 not_auto_held, invalid_transition…), in the lessons' words. */
  error: unknown;
  onSubmit: (reason: string) => void;
  onBack: () => void;
}

export function SalesCorrectConfirm(props: SalesCorrectConfirmProps) {
  const { by, pending, error, onSubmit, onBack } = props;
  const a = t.sales.lessonActions;
  const [reason, setReason] = useState('');
  return (
    <form
      noValidate
      aria-label={t.lessons.correct.title}
      className="grid gap-3 border-t border-rule pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(reason.trim());
      }}
    >
      <h3 className="text-sm font-semibold">{CORRECT_BY_LABEL[by]}</h3>
      <p className="text-xs text-ink-2">{a.cancelTitle}</p>
      <Field label={a.reason}>
        {(p) => (
          <Input
            {...p}
            value={reason}
            placeholder={a.reasonHint}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
      </Field>
      {error !== null && <FormAlert>{lessonErrorText(error)}</FormAlert>}
      <ButtonRow>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? t.common.saving : a.confirmCancel}
        </Button>
        <Button type="button" variant="secondary" onClick={onBack}>
          {t.lessons.back}
        </Button>
      </ButtonRow>
    </form>
  );
}
