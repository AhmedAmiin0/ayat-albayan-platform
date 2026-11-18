import {
  editOf,
  linkServerErrors,
  toUpdateBody,
  type LinkEdit,
  type LinkField,
  type LinkFieldErrors,
} from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { useState } from 'react';
import { t, Button, ErrorLine, Note, Section } from '@ab/mobile-kit';
import { useViewerTz } from '@/core/lib/clock';
import { useUpdateLink } from '@/short-links/api/link-hooks';
import { ExpiryField } from '@/short-links/ui/ExpiryField';
import { FormField } from '@/short-links/ui/FormField';
import { errorText, splitCheck } from '@/short-links/ui/link-words';
import { MaxUsersField } from '@/short-links/ui/MaxUsersField';
import { Sheet } from '@/short-links/ui/Sheet';

interface EditSheetProps {
  link: Pick<ShortLinkDetail, 'code' | 'title' | 'maxUsers' | 'status'>;
  onClose: () => void;
}

const F = () => t.shortLinks.form;
const D = () => t.shortLinks.detail;

/**
 * «تعديل» of a link: its title, its allowed users and a new lifetime from now («تمديد»: an
 * expired link runs again until then). PATCH /short-links/:code.
 */
export function EditSheet({ link, onClose }: EditSheetProps) {
  const [edit, setEdit] = useState<LinkEdit>(() => editOf(link));
  const [errors, setErrors] = useState<LinkFieldErrors>({});
  const tz = useViewerTz();
  const update = useUpdateLink();
  const set = (patch: Partial<LinkEdit>) => setEdit((e) => ({ ...e, ...patch }));
  const err = (field: LinkField) => errorText(errors, field);
  const save = () => {
    const { body, errors: wrong } = splitCheck(toUpdateBody(edit, { now: new Date(), tz }));
    setErrors(wrong);
    if (body === undefined) return;
    update.mutate(
      { code: link.code, body },
      { onSuccess: onClose, onError: (e) => setErrors(linkServerErrors(e)) },
    );
  };
  const formError = err('form');
  return (
    <Sheet
      title={t.common.edit}
      testID="edit-sheet"
      onClose={onClose}
      footer={<Button label={D().save} onPress={save} busy={update.isPending} />}
    >
      <FormField
        label={F().titleLabel}
        value={edit.title}
        onChangeText={(title) => set({ title })}
        error={err('title')}
      />
      <Section title={D().extendTitle}>
        {link.status === 'expired' ? <Note>{D().extendHint}</Note> : null}
        <ExpiryField
          expiry={edit.expiry}
          onChange={(expiry) => set({ expiry })}
          error={err('expiresAt')}
        />
      </Section>
      <MaxUsersField
        value={edit.maxUsers}
        onChange={(maxUsers) => set({ maxUsers })}
        error={err('maxUsers')}
      />
      {formError ? <ErrorLine message={formError} /> : null}
    </Sheet>
  );
}
