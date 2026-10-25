import { formatPhone, type ChatListRef, type SubscriptionBadge, type ThreadView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { threadKind, threadTitle, timesInText } from '../../format';
import { inboxBase, showsPhone, useInboxMode } from '../../shared/mode';
import type { InboxSearch } from '../../shared/search';
import { ThreadListChips } from '../../lists/ThreadListChips';
import { leadChip } from '../../subscription';
import { SubscriptionChip } from '../../SubscriptionChip';
import { WindowBanner } from './WindowBanner';

export interface ThreadHeaderProps {
  thread: ThreadView;
  /** The list's URL state without the open thread (the phone-width «رجوع»). */
  listSearch: InboxSearch;
  headingId: string;
  /** The family's subscription (threadBadge); null for a teacher or an unknown number. */
  badge: SubscriptionBadge | null;
  /** At the end of the first row: the sales actions (SalesChatActions) or, on phones, the side sheet's opener. */
  action?: ReactNode;
  /** Sales: which children the chat is about (SalesFamilyLine), in the second row. */
  line?: ReactNode;
  /** The chat's lists «القوائم» (admin and sales with inbox.lists), quiet chips in the second row. */
  lists?: readonly ChatListRef[] | undefined;
}

/**
 * Two rows that never wrap (W3): the name (truncated), the phone and the actions; then the chips on
 * one line that scrolls sideways: who the number is (lead status chip / guardian / teacher), the
 * window, «مشترك» and the source (admin), the sales children line, the chat's lists and the times' city
 * (principle 7).
 */
export function ThreadHeader({ thread: th, listSearch, headingId, badge, action, line, lists }: ThreadHeaderProps) {
  const kind = threadKind(th);
  const mode = useInboxMode();
  return (
    <header className="mb-2 shrink-0 border-b border-rule pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          to={inboxBase(mode)}
          search={listSearch}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-1.5 text-sm font-semibold text-lapis shell:hidden"
        >
          <Icon name="chevron-right" />
          {t.common.back}
        </Link>
        <h2 id={headingId} className="min-w-0 truncate font-display text-base font-bold">
          {threadTitle(th, mode)}
        </h2>
        {th.display_name && showsPhone(mode) && <Ltr className="shrink-0 text-xs text-ink-3">{formatPhone(th.phone_e164)}</Ltr>}
        {action}
      </div>
      <div className="mt-1 flex items-center gap-1.5 overflow-x-auto text-2xs whitespace-nowrap text-ink-3 [scrollbar-width:none]">
        {kind === 'lead' && th.lead_status ? (
          <StatusChip size="sm" {...leadChip(th.lead_status)} />
        ) : (
          <span className="font-semibold text-ink-2">{kind ? t.inbox.kind[kind] : t.inbox.unknownNumber}</span>
        )}
        <WindowBanner thread={th} compact />
        {badge && <SubscriptionChip size="sm" badge={badge} />}
        {mode === 'admin' && th.lead_source && <span>{t.enums.leadSource[th.lead_source]}</span>}
        {line}
        <ThreadListChips phone={th.phone_e164} lists={lists} listSearch={listSearch} />
        <span>{timesInText()}</span>
      </div>
    </header>
  );
}
