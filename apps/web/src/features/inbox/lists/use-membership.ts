import type { ChatListRef } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { refreshLists, setMember } from './api';

export interface Membership {
  /** The lists the chat is in, as the checklist shows them (optimistic). */
  member: ReadonlySet<string>;
  toggle: (id: string, on: boolean) => void;
  /** The last toggle failed and was rolled back. */
  failed: boolean;
}

/**
 * The thread's «القوائم» checklist state (docs/22 §4): a toggle shows at once and saves (PUT / DELETE);
 * a failure puts that one box back and says so. Every answer refreshes the counts, the filtered list
 * and the open chat's chips.
 */
export function useMembership(phone: string, initial: readonly ChatListRef[]): Membership {
  const queryClient = useQueryClient();
  const [member, setMemberIds] = useState<ReadonlySet<string>>(() => new Set(initial.map((l) => l.id)));
  const flip = (id: string, on: boolean) =>
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const save = useMutation({
    mutationFn: setMember,
    onMutate: (v) => flip(v.id, v.member),
    onError: (_e, v) => flip(v.id, !v.member),
    onSettled: () => refreshLists(queryClient),
  });
  return { member, failed: save.isError, toggle: (id, on) => save.mutate({ id, phone, member: on }) };
}
