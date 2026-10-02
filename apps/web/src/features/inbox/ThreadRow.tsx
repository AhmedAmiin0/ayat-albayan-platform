import { formatPhone, leadStatusStyle, type ThreadView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/ui/icon';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { initialOf } from '@/features/leads/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { fullTime, listTime, previewText, threadKind, threadName, unreadLabel } from './format';
import type { InboxSearch } from './search';

export interface ThreadRowProps {
  thread: ThreadView;
  /** The list's URL state; opening a thread keeps its filters. */
  search: InboxSearch;
  active: boolean;
}

/**
 * One conversation (docs/07 §9, R-LEAD-02): avatar · name (bold + saffron dot when unread) · phone
 * · time; the last message («إنت:» for ours); the lead's status chip or who the number is, source.
 */
export function ThreadRow({ thread: th, search, active }: ThreadRowProps) {
  const name = threadName(th);
  const unread = th.unread_count > 0;
  const kind = threadKind(th);
  const label = [t.inbox.openThread.replace('{name}', name), unread ? unreadLabel(th.unread_count) : '']
    .filter(Boolean)
    .join(' — ');

  return (
    <li>
      <Link
        to="/admin/inbox"
        search={{ ...search, phone: th.phone_e164 }}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-rule px-2.5 py-3 text-ink no-underline',
          'transition-colors duration-[120ms] hover:bg-sunk/75 aria-[current=page]:bg-gold-wash/60',
        )}
      >
        <span
          aria-hidden="true"
          className="row-span-3 grid size-[38px] place-items-center self-start rounded-full bg-gold-wash font-display text-lg font-bold shadow-[inset_0_0_0_1px_var(--gold)]"
        >
          {initialOf(th.display_name) || <Icon name="phone" className="size-4 text-ink-3" />}
        </span>
        <span className="flex min-w-0 items-baseline gap-2">
          {unread && <i aria-hidden="true" className="size-[7px] shrink-0 self-center rounded-full bg-act" />}
          <span className={cn('truncate', unread ? 'font-bold' : 'font-semibold')}>{name}</span>
          {th.display_name && (
            <Ltr className="hidden truncate text-2xs text-ink-3 sm:inline">{formatPhone(th.phone_e164)}</Ltr>
          )}
        </span>
        <time dateTime={th.last_message_at} title={fullTime(th.last_message_at)} className="text-2xs text-ink-3 tabular-nums">
          {listTime(th.last_message_at)}
        </time>
        <span className={cn('col-start-2 truncate text-xs', unread ? 'text-ink' : 'text-ink-2')}>{previewText(th)}</span>
        {unread ? (
          <span className="text-2xs font-bold whitespace-nowrap text-act">{unreadLabel(th.unread_count)}</span>
        ) : (
          <span />
        )}
        <span className="col-span-2 col-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-ink-3">
          {th.lead_status && kind === 'lead' ? (
            <StatusChip size="sm" {...leadStatusStyle[th.lead_status]} label={t.enums.leadStatus[th.lead_status]} />
          ) : (
            <span>{kind ? t.inbox.kind[kind] : t.inbox.unknownNumber}</span>
          )}
          {th.lead_source && <span>{t.enums.leadSource[th.lead_source]}</span>}
        </span>
      </Link>
    </li>
  );
}
