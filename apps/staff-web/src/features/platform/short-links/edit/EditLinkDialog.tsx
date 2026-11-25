import { editOf } from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { useId, useState } from 'react';
import { Button, Field, FormAlert, Input, Dialog, t } from '@ab/web-kit';
import { errorText } from '@/features/platform/short-links/shared/link-errors';
import { MaxUsersField } from '@/features/platform/short-links/create/MaxUsersField';
import { UsersPanel } from '@/features/platform/short-links/create/UsersPanel';
import { usePatchLink } from './use-link-actions';

const F = t.shortLinks.form;

interface EditLinkDialogProps {
  link: ShortLinkDetail;
  onClose: () => void;
  onSaved: () => void;
}

type Edit = ReturnType<typeof editOf>;

/** A given user list replaces the old one. */
export function EditLinkDialog({ link, onClose, onSaved }: EditLinkDialogProps) {
  const formId = useId();
  const [edit, setEdit] = useState<Edit>(() => editOf(link));
  const change = (next: Partial<Edit>) =>
    setEdit((prev) => ({ ...prev, ...next }));
  const patch = usePatchLink(link, onSaved);
  const formError = errorText(patch.errors, 'form');
  const listed = edit.people.length + edit.phones.length;
  const actions = (
    <>
      <Button type="button" variant="secondary" onClick={onClose}>{F.cancel}</Button>
      <Button type="submit" form={formId} disabled={patch.pending}>
        {t.shortLinks.detail.save}
      </Button>
    </>
  );
  return (
    <Dialog title={t.common.edit} description={link.title} onClose={onClose} actions={actions}>
      <form
        id={formId}
        noValidate
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          patch.save(edit);
        }}
      >
        <Field label={F.titleLabel} error={errorText(patch.errors, 'title')} required>
          {(c) => (
            <Input {...c} value={edit.title} onChange={(e) => change({ title: e.target.value })} />
          )}
        </Field>
        <MaxUsersField
          value={edit.maxUsers}
          onChange={(maxUsers) => change({ maxUsers })}
          listed={link.audience === 'listed' ? listed : 0}
          error={errorText(patch.errors, 'maxUsers')}
        />
        <UsersPanel users={edit} onChange={change} errors={patch.errors} />
        {formError && <FormAlert>{formError}</FormAlert>}
      </form>
    </Dialog>
  );
}
