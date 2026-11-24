import {
  linkServerErrors, splitLinkCheck, toUpdateBody, type LinkEdit, type LinkFieldErrors,
} from '@ab/client-core';
import { useState } from 'react';
import { useViewerTz } from '@/core/lib/clock';
import { useUpdateLink } from '@/short-links/api/link-hooks';

/** Each field's refusal goes to the sheet, which closes once saved. */
export function usePatchLink(code: string, onSaved: () => void) {
  const [errors, setErrors] = useState<LinkFieldErrors>({});
  const tz = useViewerTz();
  const update = useUpdateLink();
  const save = (edit: LinkEdit) => {
    const { body, errors: wrong } = splitLinkCheck(toUpdateBody(edit, { now: new Date(), tz }));
    setErrors(wrong);
    if (body === null) return;
    update.mutate(
      { code, body },
      { onSuccess: onSaved, onError: (e) => setErrors(linkServerErrors(e)) },
    );
  };
  return { errors, save, busy: update.isPending };
}
