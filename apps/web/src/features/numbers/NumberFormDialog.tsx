import type { NumberView } from '@ab/shared';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { numberErrorCode, numberErrorText } from './number-errors';
import { createBody, draftErrors, draftOf, updateBody, type DraftErrors } from './number-form';
import { createNumber, updateNumber } from './numbers-api';
import { NumberFormFields } from './NumberFormFields';
import { useNumbersMutation } from './use-numbers-mutation';

const s = t.numbers;

/** POST for a new number, PATCH with only the changed fields for an edit (nothing changed: just close). */
const saveNumber = async (input: { view?: NumberView; draft: ReturnType<typeof draftOf> }): Promise<unknown> => {
  if (!input.view) return createNumber(createBody(input.draft));
  const body = updateBody(input.view, input.draft);
  return Object.keys(body).length === 0 ? null : updateNumber({ id: input.view.id, body });
};

/**
 * «إضافة رقم» / «تعديل الرقم»: field errors under each field and a summary alert; a 409 (phone id
 * used by another number) in words, on the phone id field too.
 */
export function NumberFormDialog({ view, onClose }: { view?: NumberView; onClose: () => void }) {
  const formId = useId();
  const [draft, setDraft] = useState(() => draftOf(view));
  const [errors, setErrors] = useState<DraftErrors>({});
  const save = useNumbersMutation(saveNumber, { onDone: onClose });
  const serverCode = numberErrorCode(save.error);
  const shown: DraftErrors = serverCode === 'phone_taken' ? { ...errors, phone_number_id: s.errors.phone_taken } : errors;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = draftErrors(draft);
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate({ view, draft });
  };
  return (
    <Dialog
      title={view ? s.form.editTitle : s.form.addTitle}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>{s.actions.cancel}</Button>
          <Button type="submit" form={formId} disabled={save.isPending}>{s.actions.save}</Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="grid gap-4">
        {Object.keys(errors).length > 0 && <FormAlert>{s.form.invalid}</FormAlert>}
        {save.isError && <FormAlert>{numberErrorText(save.error)}</FormAlert>}
        <NumberFormFields draft={draft} errors={shown} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
      </form>
    </Dialog>
  );
}
