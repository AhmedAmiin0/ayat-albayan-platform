import { formatPhone, subscriptionStatusStyle, type ThreadView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Avatar } from '@/components/ui/display/avatar';
import { Ltr } from '@/components/ui/display/ltr';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { DeliveryTicks } from '@/features/messaging/inbox/messages/components/DeliveryTicks';
import { fullTime, listTime, previewText, threadKind, threadTitle, unreadLabel } from '@/features/messaging/inbox/format';
import { LineBadge } from '@/features/messaging/inbox/shared/LineBadge';
import { inboxBase, showsPhone, useInboxMode } from '@/features/messaging/inbox/shared/mode';
import type { InboxSearch } from '@/features/messaging/inbox/shared/search';
import { leadChip } from '@/features/messaging/inbox/sales/subscription';
import { SubscriptionChip } from '@/features/messaging/inbox/sales/SubscriptionChip';
import { useClock } from '@/lib/clock';

export interface ThreadRowProps {
  thread: ThreadView;
  /** The list's URL state; opening a thread keeps its filters. */
  search: InboxSearch;
  active: boolean;
  /** The list's ticking clock (one useNow per list): «اليوم» turns into a date at midnight. */
  now: Date;
}

/** Our last message did not go out: the admin's turn (saffron «دورك», docs/07), shown on the row. */
const lastFailed = (th: ThreadView): boolean => th.last_direction === 'outbound' && th.last_status === 'failed';

/**
 * The family's tags: «مشترك» or «اشتراكه خلص» (renew, the admin's turn), and «مش مدفوع» while a
 * running package owes money. A list cached before `badge` existed falls back to `subscribed`.
 */
function FamilyTags({ thread: th }: { thread: ThreadView }) {
  const badge = th.badge ?? (th.subscribed ? 'subscribed' : null);
  return (
    <>
      {(badge === 'subscribed' || badge === 'expired') && <SubscriptionChip size="sm" badge={badge} />}
      {th.unpaid && <StatusChip size="sm" {...subscriptionStatusStyle.unpaid} label={t.enums.subscriptionStatus.unpaid} />}
    </>
  );
}

/** The phone never truncates: on narrow screens its last 4 digits tell same-named threads apart. */
function PhoneTag({ phone }: { phone: string }) {
  return (
    <>
      <Ltr className="shrink-0 text-2xs text-ink-3 sm:hidden">…{phone.slice(-4)}</Ltr>
      <Ltr className="hidden shrink-0 text-2xs text-ink-3 sm:inline">{formatPhone(phone)}</Ltr>
    </>
  );
}

/**
 * One conversation (docs/07 §9, R-LEAD-02): avatar · name (bold + saffron dot when unread) · phone
 * · time; the last message («أنت:» for ours, after its ticks), or «متبعتتش» when our last send failed; the lead's
 * status chip or who the number is, the family's package tags (FamilyTags), source.
 */
export function ThreadRow({ thread: th, search, active, now }: ThreadRowProps) {
  const mode = useInboxMode();
  const name = threadTitle(th, mode);
  const clock = useClock();
  const unread = th.unread_count > 0;
  const failed = lastFailed(th);
  const kind = threadKind(th);
  const turn = failed ? t.inbox.failedLast : unread ? unreadLabel(th.unread_count) : '';
  const line = th.last_inbound_line ? t.enums.waLine[th.last_inbound_line] : '';
  // The link's label replaces the ticks' name: ours carries its status word (failed is in `turn`).
  const status = th.last_direction === 'outbound' && !failed ? t.enums.messageStatus[th.last_status] : '';
  const label = [t.inbox.openThread.replace('{name}', name), status, turn, line]
    .filter(Boolean)
    .join(' — ');

  return (
    <li>
      <Link
        to={inboxBase(mode)}
        search={{ ...search, phone: th.phone_e164 }}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-rule px-2.5 py-3 text-ink no-underline',
          'transition-colors duration-[120ms] hover:bg-sunk/75 aria-[current=page]:bg-gold-wash/60',
        )}
      >
        <Avatar name={th.display_name ?? ''} id={th.phone_e164} size="md" decorative className="row-span-3 self-start" />
        <span className="flex min-w-0 items-baseline gap-2">
          {unread && <i aria-hidden="true" className="size-[7px] shrink-0 self-center rounded-full bg-act" />}
          <span className={cn('min-w-0 truncate', unread ? 'font-bold' : 'font-semibold')}>{name}</span>
          {th.display_name && showsPhone(mode) && <PhoneTag phone={th.phone_e164} />}
        </span>
        <time dateTime={th.last_message_at} title={fullTime(th.last_message_at, clock)} className="text-2xs text-ink-3 tabular-nums">
          {listTime(th.last_message_at, clock, now)}
        </time>
        <span className={cn('col-start-2 flex min-w-0 items-center gap-1 text-xs', unread ? 'text-ink' : 'text-ink-2')}>
          {th.last_direction === 'outbound' && <DeliveryTicks status={th.last_status} inList />}
          <span dir="auto" className="min-w-0 truncate text-start">
            {previewText(th)}
          </span>
        </span>
        {failed ? (
          <span className="inline-flex items-center gap-1 text-2xs font-bold whitespace-nowrap text-act">
            <NuqtaGlyph shape="struck" />
            {t.enums.messageStatus.failed}
          </span>
        ) : unread ? (
          <span className="text-2xs font-bold whitespace-nowrap text-act">{unreadLabel(th.unread_count)}</span>
        ) : (
          <span />
        )}
        <span className="col-span-2 col-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-ink-3">
          {th.lead_status && kind === 'lead' ? (
            <StatusChip size="sm" {...leadChip(th.lead_status)} />
          ) : (
            <span>{kind ? t.inbox.kind[kind] : t.inbox.unknownNumber}</span>
          )}
          {mode === 'admin' && <FamilyTags thread={th} />}
          {mode === 'admin' && th.lead_source && <span>{t.enums.leadSource[th.lead_source]}</span>}
          <LineBadge line={th.last_inbound_line} />
        </span>
      </Link>
    </li>
  );
}
