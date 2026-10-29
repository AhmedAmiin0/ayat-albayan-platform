import { formatPhone, type ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, type TreeBase } from '@/core/nav/tree-base';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { ListRow } from '@/core/ui/layout/ListRow';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { ltr } from '@/core/ui/primitives/Ltr';
import { kindLabel } from '../shared/format';
import { DeliveryTicks } from '../messages/components/DeliveryTicks';
import { threadPreview } from '../messages/hooks/message-text';
import { useComposerDraft } from '../composer/draft-store';
import { ThreadTags } from './ThreadTags';
import { ThreadTrailing } from './ThreadTrailing';
import { threadLink, type ThreadMode } from '../thread/hooks/thread-mode';

/**
 * The row reads the ticks' status word before the preview (the ticks add no stop of their own);
 * failed is the row's «لم تُرسل» chip already.
 */
function ticksWord(th: ThreadView): string | undefined {
  if (th.last_direction !== 'outbound' || th.last_status === 'failed') return undefined;
  return `${t.enums.messageStatus[th.last_status]} · ${threadPreview(th)}`;
}

/** «مسوّدة:» in the act colour before the unsent text, as WhatsApp's «Draft:» (review 2026-10-29 #4). */
function DraftWord() {
  const { color } = useTheme();
  return (
    <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.act }}>
      {t.inbox.draft}
    </AppText>
  );
}

/** The second line: her unsent text when the chat has one, else the last message with its ticks. */
function previewOf(th: ThreadView, draft: string) {
  if (draft) {
    const text = draft.replace(/\s+/g, ' ').trim();
    return { subtitle: text, subtitleLeading: <DraftWord />, subtitleLabel: `${t.inbox.draft} ${text}` };
  }
  return {
    subtitle: threadPreview(th),
    subtitleLeading: th.last_direction === 'outbound' ? <DeliveryTicks status={th.last_status} inList /> : undefined,
    subtitleLabel: ticksWord(th),
  };
}

interface ThreadRowProps {
  thread: ThreadView;
  /** A teacher's list: no phone beside the name, the chat's kind when it has none. */
  teacher: boolean;
  /** Staff trees (admin and sales): the lead status + source chips. */
  tags: boolean;
  /** The admin's own tree: «مش مدفوع» too (never in the sales tree, docs/16). */
  money: boolean;
  /** Stable (useCallback): opens the thread by its phone. */
  onOpen: (phone: string) => void;
}

/**
 * One chat in «المحادثات». Memo (the draft store redraws only the row whose draft changed): a poll that changes one thread (a new message, a tick) hands the
 * others the same object (TanStack's structural sharing), so only that row redraws.
 */
const ThreadRow = memo(function ThreadRow({ thread: th, teacher, tags, money, onOpen }: ThreadRowProps) {
  const phone = formatPhone(th.phone_e164);
  const draft = useComposerDraft(th.phone_e164);
  const open = useCallback(() => onOpen(th.phone_e164), [onOpen, th.phone_e164]);
  return (
    <ListRow
      leading={<Avatar name={th.display_name ?? ''} id={th.phone_e164} decorative />}
      title={th.display_name ?? (teacher ? kindLabel(th) : ltr(phone))}
      meta={th.display_name && !teacher ? phone : undefined}
      {...previewOf(th, draft)}
      tags={tags ? <ThreadTags thread={th} money={money} /> : undefined}
      trailing={<ThreadTrailing thread={th} />}
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
  // The sales tree too (review 2026-10-29 #2): new / no-reply / trial-booked chats look different.
  const tags = mode.kind === 'admin';
  const money = tags && !base;
  const open = useCallback((phone: string) => router.push(inTree(base, threadLink(phone, mode))), [base, mode]);
  return useCallback(
    ({ item }: { item: ThreadView }) => <ThreadRow thread={item} teacher={teacher} tags={tags} money={money} onOpen={open} />,
    [teacher, tags, money, open],
  );
}
