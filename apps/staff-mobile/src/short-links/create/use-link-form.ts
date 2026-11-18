import {
  emptyLinkForm,
  linkServerErrors,
  SHORT_LINK_DEFAULT_DAYS,
  splitLinkCheck,
  toCreateBody,
  type LinkFieldErrors,
  type LinkForm,
} from '@ab/client-core';
import { useState } from 'react';
import { useViewerTz } from '@/core/lib/clock';
import { useCreateLink } from '@/short-links/api/link-hooks';

/**
 * «رابط جديد»: the form (client-core's LinkForm), its field errors, and the submit that checks it
 * with the API's schema, POSTs it, and hands the new code over (a refusal lands on its field).
 */
export function useLinkForm(onCreated: (code: string) => void) {
  const [form, setForm] = useState<LinkForm>(() => emptyLinkForm(SHORT_LINK_DEFAULT_DAYS));
  const [errors, setErrors] = useState<LinkFieldErrors>({});
  const tz = useViewerTz();
  const create = useCreateLink();
  const set = (patch: Partial<LinkForm>) => setForm((f) => ({ ...f, ...patch }));
  const submit = () => {
    const { body, errors: wrong } = splitLinkCheck(toCreateBody(form, { now: new Date(), tz }));
    setErrors(wrong);
    if (body === null) return;
    create.mutate(body, {
      onSuccess: (link) => onCreated(link.code),
      onError: (e) => setErrors(linkServerErrors(e)),
    });
  };
  return { form, set, errors, submit, busy: create.isPending };
}

export type LinkFormState = ReturnType<typeof useLinkForm>;
