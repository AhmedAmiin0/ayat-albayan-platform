import type { ThreadDetail, ThreadLesson } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useTemplateId } from '@/inbox/composer/use-composer-send';
import { sendError } from '@/inbox/messages/hooks/message-text';
import { sendKey } from '@/inbox/thread/hooks/thread-cache';
import { type Outgoing, threadQuery, useSendMessage } from '@/inbox/thread/hooks/use-thread';

/** A number read by «التالي»: a chat already (WhatsApp opens it) or new (its first template). */
export interface FoundNumber {
  phone: string;
  kind: 'new' | 'existing';
  /** The family's next lessons (the API finds a booked family by its number): picked, not typed. */
  lessons: readonly ThreadLesson[];
}

/** Nothing sent or received with this number yet: the chat's own test (PR #654). */
const kindOf = (page: ThreadDetail | undefined): FoundNumber['kind'] =>
  page?.thread != null || (page?.messages.length ?? 0) > 0 ? 'existing' : 'new';

/**
 * «التالي»: GET /threads/:phone into the chat's own cache (threadQuery), so the chat opens on it
 * and a send's queued bubble lands in it at once.
 */
export function useLookupNumber() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (phone: string): Promise<FoundNumber> => {
      const data = await client.infiniteQuery(threadQuery(phone));
      const [page] = data.pages;
      // A first template still on its way (closed mid-send, then reopened): a chat already.
      const sending = client.isMutating({ mutationKey: sendKey(phone) }) > 0;
      const kind = sending ? 'existing' : kindOf(page);
      return { phone, kind, lessons: page?.lessons ?? [] };
    },
  });
}

/**
 * «أرسل» on a new number: the chat's own template send (useSendMessage: POST
 * /threads/:phone/template with a clientRequestId, the queued row in the chat and on top of the
 * chats list at once). One send at a time, a retry keeps its id; `onSent` once the API took it.
 */
export function useFirstTemplate(phone: string, onSent: () => void) {
  const send = useSendMessage(phone);
  const templateId = useTemplateId();
  // A second tap before the first render of `isPending` is still the same send.
  const busy = useRef(false);
  const sendTemplate = (out: Outgoing) => {
    if (busy.current) return;
    busy.current = true;
    const settle = () => {
      busy.current = false;
    };
    const done = () => {
      templateId.sent();
      onSent();
    };
    send.mutate({ out, id: templateId.of(out) }, { onSuccess: done, onSettled: settle });
  };
  const error = send.isError ? sendError(send.error) : null;
  return { sendTemplate, pending: send.isPending, error };
}
