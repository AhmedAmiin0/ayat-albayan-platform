import {
  emptyLinkForm, linkServerErrors, SHORT_LINK_DEFAULT_DAYS, toCreateBody,
  type LinkFieldErrors, type LinkForm,
} from '@ab/client-core';
import { useState } from 'react';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { useCreateLink } from '@/features/platform/short-links/api/use-short-links';

// «رابط جديد»'s state: the form (client-core's LinkForm), each field's refusal (the form check
// first, then the API's), and the create call; a created link hands its code on.

export interface LinkFormState {
  form: LinkForm;
  patch: (next: Partial<LinkForm>) => void;
  errors: LinkFieldErrors;
  submit: () => void;
  pending: boolean;
}

/** Both sides of the check's answer, so neither needs a shape test. */
const NONE: { body: null; errors: LinkFieldErrors } = { body: null, errors: {} };

export function useLinkForm(onCreated: (code: string) => void): LinkFormState {
  const tz = useViewerTz();
  const [form, setForm] = useState(() => emptyLinkForm(SHORT_LINK_DEFAULT_DAYS));
  const [errors, setErrors] = useState<LinkFieldErrors>({});
  const create = useCreateLink((link) => onCreated(link.code));
  const patch = (next: Partial<LinkForm>) => setForm((prev) => ({ ...prev, ...next }));
  const submit = () => {
    const { body, errors: found } = { ...NONE, ...toCreateBody(form, { now: new Date(), tz }) };
    setErrors(found);
    if (body === null) return;
    create.mutate(body, { onError: (e) => setErrors(linkServerErrors(e)) });
  };
  return { form, patch, errors, submit, pending: create.isPending };
}
