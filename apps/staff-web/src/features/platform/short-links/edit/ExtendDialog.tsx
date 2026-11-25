import { SHORT_LINK_DEFAULT_DAYS, type LinkExpiry } from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { useId, useState } from 'react';
import { Button, FormAlert, Dialog, t } from '@ab/web-kit';
import { ExpiryField } from '@/features/platform/short-links/create/ExpiryField';
import { errorText } from '@/features/platform/short-links/shared/link-errors';
import { usePatchLink } from './use-link-actions';

const D = t.shortLinks.detail;

interface ExtendDialogProps {
  link: Pick<ShortLinkDetail, 'code'>;
  onClose: () => void;
  onSaved: () => void;
}

/** An expired link runs again until the new expiry. */
export function ExtendDialog({ link, onClose, onSaved }: ExtendDialogProps) {
  const formId = useId();
  const [expiry, setExpiry] = useState<LinkExpiry>({ kind: 'days', days: SHORT_LINK_DEFAULT_DAYS });
  const patch = usePatchLink(link, onSaved);
  const formError = errorText(patch.errors, 'form');
  const actions = (
    <>
      <Button type="button" variant="secondary" onClick={onClose}>
        {t.shortLinks.form.cancel}
      </Button>
      <Button type="submit" form={formId} disabled={patch.pending}>{D.save}</Button>
    </>
  );
  return (
    <Dialog
      title={D.extendTitle}
      description={D.extendHint}
      layout="sheet"
      onClose={onClose}
      actions={actions}
    >
      <form
        id={formId}
        noValidate
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          patch.save({ expiry });
        }}
      >
        <ExpiryField
          expiry={expiry}
          onChange={setExpiry}
          error={errorText(patch.errors, 'expiresAt')}
        />
        {formError && <FormAlert>{formError}</FormAlert>}
      </form>
    </Dialog>
  );
}
