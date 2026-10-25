import { chatListNameSchema, CHAT_LIST_NAME_MAX } from '@ab/shared';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';

export interface ListNameFormProps {
  /** The form's id: the dialog's submit button sits in its footer (`form={id}`). */
  id: string;
  initial?: string;
  /** The server's answer (name taken, the 30-list cap), shown under the field. */
  error: string | null;
  onSubmit: (name: string) => void;
}

/** «اسم القائمة»: 1–30 characters after trimming (chatListNameSchema), checked before the request. */
export function ListNameForm({ id, initial = '', error, onSubmit }: ListNameFormProps) {
  const [name, setName] = useState(initial);
  const [missing, setMissing] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = chatListNameSchema.safeParse(name);
    setMissing(!parsed.success);
    if (parsed.success) onSubmit(parsed.data);
  };
  return (
    <form id={id} onSubmit={submit} noValidate>
      <Field label={t.inbox.lists.name} required error={missing ? t.common.required : (error ?? undefined)}>
        {(p) => (
          <Input {...p} value={name} maxLength={CHAT_LIST_NAME_MAX} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        )}
      </Field>
    </form>
  );
}
