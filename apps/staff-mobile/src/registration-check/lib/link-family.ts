import type { LeadFamilyLinked } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiSend, t, pathKey } from '@ab/mobile-kit';

// The API takes the student code only, never an id or a phone.

type LinkErrorCode = keyof typeof t.inbox.linkFamily.errors;

const isLinkError = (code: unknown): code is LinkErrorCode =>
  typeof code === 'string' && Object.prototype.hasOwnProperty.call(t.inbox.linkFamily.errors, code);

/** A 404 / 409 `{ code }` in her words; a 400, a 403 or anything else is the generic line. */
export function linkFamilyErrorText(error: unknown): string {
  const body: unknown = error instanceof ApiError ? error.body : null;
  const code: unknown = typeof body === 'object' && body !== null ? Reflect.get(body, 'code') : undefined;
  return isLinkError(code) ? t.inbox.linkFamily.errors[code] : t.common.error;
}

/** The chat, chats list, leads and family views refetch since the chat now carries the family. */
export function useLinkFamily(leadId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      apiSend<LeadFamilyLinked>('POST', `/leads/${encodeURIComponent(leadId)}/link-family`, { code }),
    onSuccess: () => {
      for (const key of [pathKey('/threads'), pathKey('/leads'), ['sales', 'money', 'family']]) {
        void client.invalidateQueries({ queryKey: key });
      }
    },
  });
}
