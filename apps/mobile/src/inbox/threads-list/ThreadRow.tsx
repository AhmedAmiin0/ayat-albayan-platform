import { formatPhone, type ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { inTree, type TreeBase } from '@/core/nav/tree-base';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { ltr } from '@/core/ui/primitives/Ltr';
import { kindLabel } from '@/inbox/shared/format';
import { useComposerDraft } from '@/inbox/composer/draft-store';
import { ThreadMeta } from './ThreadTags';
import { ThreadTime, TurnBadge } from './ThreadTrailing';
import { ChatRow, ThreadPreview } from './row';
import { threadLink, type ThreadMode } from '@/inbox/thread/hooks/thread-mode';

interface ThreadRowProps {
  thread: ThreadView;
  /** A teacher's list: no phone beside the name, the chat's kind when it has none. */
  teacher: boolean;
  /** Staff trees (admin and sales): the lead status + source chips. */
  tags: boolean;
  /** The admin's own tree: «غير مدفوع» too (never in the sales tree, docs/16). */
  money: boolean;
  /** Stable (useCallback): opens the thread by its phone. */
  onOpen: (phone: string) => void;
  /** The list's one clock (useToday): a new Date only at midnight, so the day words switch then. */
  now: Date;
}

/**
 * One chat in «المحادثات». Memo (the draft store redraws only the row whose draft changed): a poll that changes one thread (a new message, a tick) hands the
 * others the same object (TanStack's structural sharing), so only that row redraws.
 */
const ThreadRow = memo(function ThreadRow({
  thread: th,
  teacher,
  tags,
  money,
  onOpen,
  now,
}: ThreadRowProps) {
  const phone = formatPhone(th.phone_e164);
  const draft = useComposerDraft(th.phone_e164);
  const open = useCallback(() => onOpen(th.phone_e164), [onOpen, th.phone_e164]);
  const name = th.display_name;
  return (
    <ChatRow
      leading={<Avatar name={name ?? ''} id={th.phone_e164} decorative />}
      title={name ?? (teacher ? kindLabel(th) : ltr(phone))}
      titleLtr={!name && !teacher}
      time={<ThreadTime thread={th} now={now} />}
      preview={<ThreadPreview thread={th} draft={draft} />}
      badge={<TurnBadge thread={th} />}
      meta={
        tags ? <ThreadMeta thread={th} money={money} phone={name ? phone : undefined} /> : undefined
      }
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
  // The sales tree too (review 2026-10-29 #2): new / no-reply / trial-booked chats look different.
  const tags = mode.kind === 'admin';
  const money = tags && !base;
  const open = useCallback(
    (phone: string) => router.push(inTree(base, threadLink(phone, mode))),
    [base, mode],
  );
  return useCallback(
    ({ item }: { item: ThreadView }) => (
      <ThreadRow
        thread={item}
        teacher={teacher}
        tags={tags}
        money={money}
        onOpen={open}
        now={now}
      />
    ),
    [teacher, tags, money, open, now],
  );
}
