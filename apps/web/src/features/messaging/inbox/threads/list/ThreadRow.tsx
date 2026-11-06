import type { ThreadView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Avatar } from '@/components/ui/display/avatar';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { DeliveryTicks } from '@/features/messaging/inbox/messages/components/DeliveryTicks';
import { fullTime, listTime, previewText, threadTitle, unreadLabel } from '@/features/messaging/inbox/format';
import { inboxBase, showsPhone, useInboxMode } from '@/features/messaging/inbox/shared/mode';
import { openChat, type InboxSearch } from '@/features/messaging/inbox/shared/search';
import { useClock } from '@/lib/clock';
import { AvatarRing, ringWord } from './AvatarRing';

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

/** Line 2's end: «لم تُرسل» when our last send failed (the list ticks carry no word), else the unread count. */
function TurnBadge({ thread: th, failed }: { thread: ThreadView; failed: boolean }) {
  if (failed) {
    return (
      <span className="inline-flex items-center gap-1 text-2xs font-bold whitespace-nowrap text-act">
        <NuqtaGlyph shape="struck" />
        {t.enums.messageStatus.failed}
      </span>
    );
  }
  return <span className="text-2xs font-bold whitespace-nowrap text-act">{unreadWord(th)}</span>;
}

const unreadWord = (th: ThreadView): string => (th.unread_count > 0 ? unreadLabel(th.unread_count) : '');

/** The link's name: the chat, our last status, the admin's turn, the family's ring, the line. */
function rowLabel(th: ThreadView, name: string, failed: boolean): string {
  const turn = failed ? t.inbox.failedLast : unreadWord(th);
  const line = th.last_inbound_line ? t.enums.waLine[th.last_inbound_line] : '';
  // The ticks' name: ours carries its status word (failed is in `turn`).
  const status = th.last_direction === 'outbound' && !failed ? t.enums.messageStatus[th.last_status] : '';
  return [t.inbox.openThread.replace('{name}', name), status, turn, ringWord(th.ring), line]
    .filter(Boolean)
    .join(' — ');
}

/**
 * One conversation (docs/07 §9, R-LEAD-02), two lines like WhatsApp (owner 2026-11-06: no tags):
 * ringed avatar · name (bold + saffron dot when unread) · time; the last message («أنت:» for ours,
 * after its ticks) · «لم تُرسل» or the unread count. The family's state is the avatar ring (green
 * subscribed, gray renewal due); a named contact shows no phone.
 */
export function ThreadRow({ thread: th, search, active, now }: ThreadRowProps) {
  const mode = useInboxMode();
  const name = threadTitle(th, mode);
  const clock = useClock();
  const unread = th.unread_count > 0;
  const failed = lastFailed(th);
  // No name: the phone is the title, isolated left to right inside the Arabic row.
  const phoneTitle = !th.display_name && showsPhone(mode);

  return (
    <li>
      <Link
        to={inboxBase(mode)}
        search={openChat(search, th.phone_e164)}
        aria-label={rowLabel(th, name, failed)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-rule px-2.5 py-3 text-ink no-underline',
          'transition-colors duration-[120ms] hover:bg-sunk/75 aria-[current=page]:bg-gold-wash/60',
        )}
      >
        <AvatarRing ring={th.ring} className="row-span-2">
          <Avatar name={th.display_name ?? ''} id={th.phone_e164} size="md" decorative />
        </AvatarRing>
        <span className="flex min-w-0 items-baseline gap-2">
          {unread && <i aria-hidden="true" className="size-[7px] shrink-0 self-center rounded-full bg-act" />}
          <span dir={phoneTitle ? 'ltr' : undefined} className={cn('min-w-0 truncate tabular-nums', unread ? 'font-bold' : 'font-semibold')}>
            {name}
          </span>
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
        <TurnBadge thread={th} failed={failed} />
      </Link>
    </li>
  );
}
