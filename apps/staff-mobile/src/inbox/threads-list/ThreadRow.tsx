import type { ThreadView } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { inTree, type TreeBase } from '@/core/nav/tree-base';
import { Avatar, ltr } from '@ab/mobile-kit';
import { kindLabel } from '@/inbox/shared/format';
import { useComposerDraft } from '@/inbox/composer/draft-store';
import { ThreadTime, TurnBadge } from './ThreadTrailing';
import { AvatarRing, ChatRow, ThreadPreview, ringHint } from './row';
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

/** Memoized: structural sharing hands unchanged threads the same object, so one row redraws. */
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
      hint={ringHint(th.ring)}
      onPress={open}
    />
  );
});

/** Stable until mode, tree or day changes so polls and minute ticks redraw no unchanged row. */
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
