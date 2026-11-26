import {
  fillSlots, linkServerErrors, splitLinkCheck, toUpdateBody, type LinkEdit, type LinkFieldErrors,
} from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { useState } from 'react';
import { t, useViewerTz } from '@ab/web-kit';
import {
  useResendLink, useRevokeLink, useUpdateLink,
} from '@/features/platform/short-links/api/use-short-links';

const D = t.shortLinks.detail;

export type LinkDialog = 'extend' | 'edit' | 'revoke' | null;

export const failureText = (e: unknown): string =>
  linkServerErrors(e).form === 'not_found' ? D.errors.not_found : D.errors.generic;

export function useLinkActions(code: string) {
  const [dialog, setDialog] = useState<LinkDialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const done = (text: string | null) => {
    setDialog(null);
    setFailure(null);
    setNotice(text);
  };
  const revoke = useRevokeLink(() => done(D.revoked));
  const resend = useResendLink((out) => done(out.send ? fillSlots(D.sendResult, out.send) : null));
  const onError = (e: unknown) => setFailure(failureText(e));
  return {
    dialog,
    setDialog,
    saved: () => done(t.common.saved),
    notice,
    clearNotice: () => setNotice(null),
    failure,
    revoke: () => revoke.mutate(code, { onError }),
    resend: () => resend.mutate(code, { onError }),
    pending: revoke.isPending || resend.isPending,
  };
}

/** The form check, then PATCH; each field's refusal goes to the dialog. */
export function usePatchLink(link: Pick<ShortLinkDetail, 'code'>, onSaved: () => void) {
  const tz = useViewerTz();
  const [errors, setErrors] = useState<LinkFieldErrors>({});
  const update = useUpdateLink(onSaved);
  const save = (edit: LinkEdit) => {
    const { body, errors: found } = splitLinkCheck(toUpdateBody(edit, { now: new Date(), tz }));
    setErrors(found);
    if (body === null) return;
    update.mutate({ code: link.code, body }, { onError: (e) => setErrors(linkServerErrors(e)) });
  };
  return { errors, save, pending: update.isPending };
}
