import { formatPhone, type ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { inTree, type TreeBase } from '@/core/nav/tree-base';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { ltr } from '@/core/ui/primitives/Ltr';
import { kindLabel } from '@/inbox/shared/format';
import { useComposerDraft } from '@/inbox/composer/draft-store';
import { ThreadTime, TurnBadge } from './ThreadTrailing';
import { AvatarRing, ChatRow, ThreadPreview } from './row';
import { threadLink, type ThreadMode } from '@/inbox/thread/hooks/thread-mode';

interface ThreadRowProps {
  thread: ThreadView;
  /** A teacher's list: the chat's kind when it has no name, never the phone. */
  teacher: boolean;
  /** Stable (useCallback): opens the thread by its phone. */
  onOpen: (phone: string) => void;
  /** The list's one clock (useToday): a new Date only at midnight, so the day words switch then. */
  now: Date;
}

/**
 * One chat in «المحادثات», two lines like WhatsApp (owner 2026-11-06: no tags): the name (the
 * LTR-isolated phone without one) and time, then the preview and badge; the family's state is the
 * avatar's ring (ThreadView.ring: green subscribed, gray renewal due). Memo (the draft store redraws
 * only the row whose draft changed): a poll that changes one thread hands the others the same object
 * (TanStack's structural sharing), so only that row redraws.
 */
const ThreadRow = memo(function ThreadRow({ thread: th, teacher, onOpen, now }: ThreadRowProps) {
  const draft = useComposerDraft(th.phone_e164);
  const open = useCallback(() => onOpen(th.phone_e164), [onOpen, th.phone_e164]);
  const name = th.display_name;
  return (
    <ChatRow
      leading={
        <AvatarRing ring={th.ring}>
          <Avatar name={name ?? ''} id={th.phone_e164} decorative />
        </AvatarRing>
      }
      title={name ?? (teacher ? kindLabel(th) : ltr(formatPhone(th.phone_e164)))}
      titleLtr={!name && !teacher}
      time={<ThreadTime thread={th} now={now} />}
      preview={<ThreadPreview thread={th} draft={draft} />}
      badge={<TurnBadge thread={th} />}
      onPress={open}
    />
  );
});

/**
 * The list's renderItem: stable until the mode, the tree or the day (`now`, useToday) changes, so a
 * poll or a minute tick redraws no row whose thread is unchanged (FlashList and ThreadRow's memo
 * both see the same props); midnight redraws them all, their «اليوم» times becoming «أمس».
 */
export function useThreadRow(mode: ThreadMode, base: TreeBase, now: Date) {
  const teacher = mode.kind === 'teacher';
  const open = useCallback(
    (phone: string) => router.push(inTree(base, threadLink(phone, mode))),
    [base, mode],
  );
  return useCallback(
    ({ item }: { item: ThreadView }) => (
      <ThreadRow thread={item} teacher={teacher} onOpen={open} now={now} />
    ),
    [teacher, open, now],
  );
}
