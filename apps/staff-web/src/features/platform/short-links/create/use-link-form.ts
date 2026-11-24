import {
  emptyLinkForm, linkServerErrors, SHORT_LINK_DEFAULT_DAYS, splitLinkCheck, toCreateBody,
  type LinkFieldErrors, type LinkForm,
} from '@ab/client-core';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { useCreateLink } from '@/features/platform/short-links/api/use-short-links';
import { focusFirstInvalid } from './focus-invalid';

// Field refusals show the form check first, then the API's; a created link hands its code on.

export interface LinkFormState {
  form: LinkForm;
  patch: (next: Partial<LinkForm>) => void;
  errors: LinkFieldErrors;
  /** `root`: the form, whose first refused field takes the focus. */
  submit: (root: HTMLElement | null) => void;
  pending: boolean;
}

export function useLinkForm(onCreated: (code: string) => void): LinkFormState {
  const tz = useViewerTz();
  const [form, setForm] = useState(() => emptyLinkForm(SHORT_LINK_DEFAULT_DAYS));
  const [errors, setErrors] = useState<LinkFieldErrors>({});
  const create = useCreateLink((link) => onCreated(link.code));
  const patch = (next: Partial<LinkForm>) => setForm((prev) => ({ ...prev, ...next }));
  const submit = (root: HTMLElement | null) => {
    const show = (found: LinkFieldErrors) => {
      // Rendered now, so the refused field is marked before it takes the focus.
      flushSync(() => setErrors(found));
      focusFirstInvalid(root);
    };
    const { body, errors: found } = splitLinkCheck(toCreateBody(form, { now: new Date(), tz }));
    show(found);
    if (body === null) return;
    create.mutate(body, { onError: (e) => show(linkServerErrors(e)) });
  };
  return { form, patch, errors, submit, pending: create.isPending };
}
