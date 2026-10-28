import { formatPhone, messageStatusStyle, type ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { memo, type ReactNode, useCallback } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, type TreeBase } from '@/core/nav/tree-base';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { ListRow } from '@/core/ui/layout/ListRow';
import { ltr } from '@/core/ui/primitives/Ltr';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { kindLabel } from '../shared/format';
import { DeliveryTicks } from '../messages/components/DeliveryTicks';
import { threadPreview } from '../messages/hooks/message-text';
import { ThreadTags } from './ThreadTags';
import { UnreadCount } from './UnreadCount';
import { threadLink, type ThreadMode } from '../thread/hooks/thread-mode';

/** Our last send failed (the admin's turn), else the unread count (WhatsApp's green circle), else nothing. */
function turnChip(th: ThreadView): ReactNode {
  if (th.last_direction === 'outbound' && th.last_status === 'failed') {
    return <StatusChip {...messageStatusStyle.failed} label={t.enums.messageStatus.failed} size="sm" />;
  }
  if (th.unread_count > 0) return <UnreadCount n={th.unread_count} />;
  return null;
}

/**
 * The row reads the ticks' status word before the preview (the ticks add no stop of their own);
 * failed is the row's «لم تُرسل» chip already.
 */
function ticksWord(th: ThreadView): string | undefined {
  if (th.last_direction !== 'outbound' || th.last_status === 'failed') return undefined;
  return `${t.enums.messageStatus[th.last_status]} · ${threadPreview(th)}`;
}

interface ThreadRowProps {
  thread: ThreadView;
  /** A teacher's list: no phone beside the name, the chat's kind when it has none. */
  teacher: boolean;
  /** The admin's own tree: the lead status + source chips. */
  tags: boolean;
  /** Stable (useCallback): opens the thread by its phone. */
  onOpen: (phone: string) => void;
}

/**
 * One chat in «المحادثات». Memo: a poll that changes one thread (a new message, a tick) hands the
 * others the same object (TanStack's structural sharing), so only that row redraws.
 */
const ThreadRow = memo(function ThreadRow({ thread: th, teacher, tags, onOpen }: ThreadRowProps) {
  const phone = formatPhone(th.phone_e164);
  const open = useCallback(() => onOpen(th.phone_e164), [onOpen, th.phone_e164]);
  return (
    <ListRow
      leading={<Avatar name={th.display_name ?? ''} id={th.phone_e164} decorative />}
      title={th.display_name ?? (teacher ? kindLabel(th) : ltr(phone))}
      meta={th.display_name && !teacher ? phone : undefined}
      subtitle={threadPreview(th)}
      subtitleLeading={th.last_direction === 'outbound' ? <DeliveryTicks status={th.last_status} inList /> : undefined}
      subtitleLabel={ticksWord(th)}
      tags={tags ? <ThreadTags thread={th} /> : undefined}
      trailing={turnChip(th)}
      onPress={open}
    />
  );
});

/**
 * The list's renderItem: stable until the mode or tree changes, so a poll or a clock tick redraws
 * no row whose thread is unchanged (FlashList and ThreadRow's memo both see the same props).
 */
export function useThreadRow(mode: ThreadMode, base: TreeBase) {
  const teacher = mode.kind === 'teacher';
  const tags = mode.kind === 'admin' && !base;
  const open = useCallback((phone: string) => router.push(inTree(base, threadLink(phone, mode))), [base, mode]);
  return useCallback(
    ({ item }: { item: ThreadView }) => <ThreadRow thread={item} teacher={teacher} tags={tags} onOpen={open} />,
    [teacher, tags, open],
  );
}
