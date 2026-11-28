import { leadFamilyCalls } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend, t, pathKey } from '@ab/mobile-kit';
import { salesKeys } from '@/core/lib/keys';

// Linking to an existing student: the lead chat's number becomes the second number of an existing
// student's family. POST /leads/:id/link-family { code } → 200 { linked }; never an id or a phone.

const leadFamily = leadFamilyCalls({ apiFetch, apiSend });

type LinkErrorCode = keyof typeof t.inbox.linkFamily.errors;

const isLinkError = (code: unknown): code is LinkErrorCode =>
  typeof code === 'string' && Object.prototype.hasOwnProperty.call(t.inbox.linkFamily.errors, code);

/** A 404 / 409 `{ code }` in her words; a 400, a 403 or anything else is the generic line. */
export function linkFamilyErrorText(error: unknown): string {
  const body: unknown = error instanceof ApiError ? error.body : null;
  const code: unknown =
    typeof body === 'object' && body !== null ? Reflect.get(body, 'code') : undefined;
  return isLinkError(code) ? t.inbox.linkFamily.errors[code] : t.common.error;
}

/**
 * Links the lead's number to the family of the student with this code. Then the chat (it now
 * carries the family: no new-student registration in its menu, the family's pills), the chats
 * list, the leads and the family views refetch.
 */
export function useLinkFamily(leadId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => leadFamily.link({ leadId, code }),
    onSuccess: () => {
      for (const key of [pathKey('/threads'), pathKey('/leads'), salesKeys.families]) {
        void client.invalidateQueries({ queryKey: key });
      }
    },
  });
}
