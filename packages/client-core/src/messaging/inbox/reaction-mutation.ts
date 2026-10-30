import type { MessageView, ReactionResult } from '@ab/shared';
import { patchMessage, withOurs } from './reactions.js';

// «تفاعل» (owner 2026-10-27): the one mutation web and mobile run (useMutation(reactionMutation(…))),
// written without React so client-core stays framework-free. The app supplies the request and its cache.

export interface ReactInput {
  message: MessageView;
  /** null removes ours. */
  emoji: string | null;
}

export interface ReactionPorts {
  /** PUT …/reaction with a fresh clientRequestId (one tap = one send). */
  send: (input: ReactInput) => Promise<ReactionResult>;
  /** Stops the open thread's refetch, so a poll cannot overwrite the optimistic change. */
  cancel: () => Promise<void>;
  /** Writes one message's reactions into the open thread's cache. */
  patch: (id: string, reactions: MessageView['reactions']) => void;
  /** After the bubble is put back: the error (null = the send itself failed on WhatsApp). */
  fail: (error: unknown) => void;
}

/** Ours at once; the server's answer wins; a refusal or a failed send puts the bubble back and says so. */
export function reactionMutation(p: ReactionPorts) {
  return {
    mutationFn: p.send,
    onMutate: async ({ message, emoji }: ReactInput) => {
      await p.cancel();
      p.patch(message.id, withOurs(message.reactions, { emoji, by: null }));
    },
    onSuccess: (r: ReactionResult) => {
      p.patch(r.message.id, r.message.reactions);
      if (r.status === 'failed') p.fail(null);
    },
    onError: (e: unknown, { message }: ReactInput) => {
      p.patch(message.id, message.reactions);
      p.fail(e);
    },
  };
}

/** An infinite thread cache with one message's reactions replaced (undefined stays undefined). */
export function withReactions<D extends { pages: readonly { messages: readonly MessageView[] }[] }>(
  data: D | undefined,
  edit: { id: string; reactions: MessageView['reactions'] },
): D | undefined {
  return data ? { ...data, pages: patchMessage(data.pages, edit.id, { reactions: edit.reactions }) } : data;
}
