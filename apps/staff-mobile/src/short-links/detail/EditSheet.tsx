import { editOf, type LinkEdit, type LinkField } from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { useState } from 'react';
import { t, Button, ErrorLine, Note, Section } from '@ab/mobile-kit';
import { ExpiryField } from '@/short-links/ui/ExpiryField';
import { FormField } from '@/short-links/ui/FormField';
import { errorText } from '@/short-links/ui/link-words';
import { MaxUsersField } from '@/short-links/ui/MaxUsersField';
import { Sheet } from '@/short-links/ui/Sheet';
import { usePatchLink } from './use-patch-link';

interface EditSheetProps {
  link: ShortLinkDetail;
  onClose: () => void;
}

const F = () => t.shortLinks.form;
const D = () => t.shortLinks.detail;

/** A new lifetime runs from now, so an expired link runs again until then. */
export function EditSheet({ link, onClose }: EditSheetProps) {
  const [edit, setEdit] = useState<LinkEdit>(() => editOf(link));
  const patch = usePatchLink(link.code, onClose);
  const set = (next: Partial<LinkEdit>) => setEdit((e) => ({ ...e, ...next }));
  const err = (field: LinkField) => errorText(patch.errors, field);
  const formError = err('form');
  return (
    <Sheet
      title={t.common.edit}
      testID="edit-sheet"
      onClose={onClose}
      footer={<Button label={D().save} onPress={() => patch.save(edit)} busy={patch.busy} />}
    >
      <FormField
        label={F().titleLabel}
        value={edit.title ?? ''}
        onChangeText={(title) => set({ title })}
        error={err('title')}
      />
      <Section title={D().extendTitle}>
        {link.status === 'expired' ? <Note>{D().extendHint}</Note> : null}
        <ExpiryField
          expiry={edit.expiry ?? null}
          onChange={(expiry) => set({ expiry })}
          error={err('expiresAt')}
        />
      </Section>
      <MaxUsersField
        value={edit.maxUsers ?? ''}
        onChange={(maxUsers) => set({ maxUsers })}
        error={err('maxUsers')}
      />
      {formError ? <ErrorLine message={formError} /> : null}
    </Sheet>
  );
}
